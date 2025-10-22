import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PerformanceMetrics } from '../../types/analysis.types';

const execAsync = promisify(exec);

export interface BundleAnalysisResult {
  totalSize: number;
  gzippedSize: number;
  chunks: BundleChunk[];
  assets: BundleAsset[];
  dependencies: BundleDependency[];
  sizeComparison?: BundleSizeComparison;
  recommendations: BundleRecommendation[];
}

export interface BundleChunk {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isEntry: boolean;
  isInitial: boolean;
}

export interface BundleAsset {
  name: string;
  size: number;
  type: 'js' | 'css' | 'image' | 'font' | 'other';
  optimized: boolean;
}

export interface BundleDependency {
  name: string;
  size: number;
  version: string;
  isExternal: boolean;
  usageCount: number;
  impact: 'high' | 'medium' | 'low';
}

export interface BundleSizeComparison {
  baseline: number;
  current: number;
  difference: number;
  percentageChange: number;
  impact: 'improvement' | 'regression' | 'neutral';
}

export interface BundleRecommendation {
  type: 'size-reduction' | 'code-splitting' | 'dependency-optimization' | 'asset-optimization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number;
  implementation: string;
}

export interface LoadTimeMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
}

export interface UIChangeImpact {
  component: string;
  sizeImpact: number;
  loadTimeImpact: number;
  renderTimeImpact: number;
  recommendations: string[];
}

export class BundleSizeAnalyzerService {
  private readonly webpackStatsPath = 'webpack-stats.json';
  private readonly buildOutputPath = '.next';

  /**
   * Analyzes bundle size and generates comprehensive metrics
   */
  async analyzeBundleSize(projectPath: string): Promise<BundleAnalysisResult> {
    try {
      // Generate webpack stats
      await this.generateWebpackStats(projectPath);
      
      // Parse webpack stats
      const stats = await this.parseWebpackStats(projectPath);
      
      // Analyze chunks and assets
      const chunks = await this.analyzeChunks(stats);
      const assets = await this.analyzeAssets(stats);
      const dependencies = await this.analyzeDependencies(stats);
      
      // Calculate total sizes
      const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
      const gzippedSize = await this.calculateGzippedSize(projectPath);
      
      // Generate recommendations
      const recommendations = this.generateBundleRecommendations(chunks, assets, dependencies);
      
      return {
        totalSize,
        gzippedSize,
        chunks,
        assets,
        dependencies,
        recommendations
      };
    } catch (error) {
      throw new Error(`Bundle analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compares bundle sizes between two versions
   */
  async compareBundleSizes(
    baselinePath: string, 
    currentPath: string
  ): Promise<BundleSizeComparison> {
    const baselineAnalysis = await this.analyzeBundleSize(baselinePath);
    const currentAnalysis = await this.analyzeBundleSize(currentPath);
    
    const difference = currentAnalysis.totalSize - baselineAnalysis.totalSize;
    const percentageChange = (difference / baselineAnalysis.totalSize) * 100;
    
    let impact: 'improvement' | 'regression' | 'neutral';
    if (Math.abs(percentageChange) < 5) {
      impact = 'neutral';
    } else if (percentageChange < 0) {
      impact = 'improvement';
    } else {
      impact = 'regression';
    }
    
    return {
      baseline: baselineAnalysis.totalSize,
      current: currentAnalysis.totalSize,
      difference,
      percentageChange,
      impact
    };
  }

  /**
   * Collects performance metrics for new features
   */
  async collectPerformanceMetrics(projectPath: string): Promise<PerformanceMetrics> {
    try {
      const bundleAnalysis = await this.analyzeBundleSize(projectPath);
      const loadTimeMetrics = await this.measureLoadTime(projectPath);
      
      return {
        bundleSize: bundleAnalysis.totalSize,
        loadTime: loadTimeMetrics.firstContentfulPaint,
        renderTime: loadTimeMetrics.largestContentfulPaint,
        memoryUsage: await this.estimateMemoryUsage(bundleAnalysis),
        cpuUsage: await this.estimateCpuUsage(bundleAnalysis)
      };
    } catch (error) {
      throw new Error(`Performance metrics collection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyzes loading time impact of UI changes
   */
  async analyzeUIChangeImpact(
    componentPaths: string[],
    projectPath: string
  ): Promise<UIChangeImpact[]> {
    const impacts: UIChangeImpact[] = [];
    
    for (const componentPath of componentPaths) {
      try {
        const componentSize = await this.getComponentSize(componentPath, projectPath);
        const loadTimeImpact = this.calculateLoadTimeImpact(componentSize);
        const renderTimeImpact = this.calculateRenderTimeImpact(componentPath);
        
        impacts.push({
          component: path.basename(componentPath),
          sizeImpact: componentSize,
          loadTimeImpact,
          renderTimeImpact,
          recommendations: this.generateUIOptimizationRecommendations(componentSize, loadTimeImpact)
        });
      } catch (error) {
        console.warn(`Failed to analyze component ${componentPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return impacts;
  }

  private async generateWebpackStats(projectPath: string): Promise<void> {
    try {
      // For Next.js projects, use next build with analyze
      const command = 'npm run build -- --analyze';
      await execAsync(command, { cwd: projectPath });
    } catch (error) {
      // Fallback to webpack bundle analyzer
      try {
        const command = 'npx webpack-bundle-analyzer .next/static/chunks/*.js --report --mode static --no-open';
        await execAsync(command, { cwd: projectPath });
      } catch (fallbackError) {
        throw new Error(`Failed to generate webpack stats: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  private async parseWebpackStats(projectPath: string): Promise<any> {
    const statsPath = path.join(projectPath, this.webpackStatsPath);
    
    try {
      const statsContent = await fs.readFile(statsPath, 'utf-8');
      return JSON.parse(statsContent);
    } catch (error) {
      // Try alternative stats locations
      const alternativePaths = [
        path.join(projectPath, '.next/webpack-stats.json'),
        path.join(projectPath, 'build/webpack-stats.json'),
        path.join(projectPath, 'dist/webpack-stats.json')
      ];
      
      for (const altPath of alternativePaths) {
        try {
          const statsContent = await fs.readFile(altPath, 'utf-8');
          return JSON.parse(statsContent);
        } catch (altError) {
          continue;
        }
      }
      
      throw new Error('Webpack stats file not found');
    }
  }

  private async analyzeChunks(stats: any): Promise<BundleChunk[]> {
    const chunks: BundleChunk[] = [];
    
    if (stats.chunks) {
      for (const chunk of stats.chunks) {
        chunks.push({
          name: chunk.name || chunk.id,
          size: chunk.size || 0,
          gzippedSize: await this.estimateGzippedSize(chunk.size || 0),
          modules: chunk.modules?.map((m: any) => m.name) || [],
          isEntry: chunk.entry || false,
          isInitial: chunk.initial || false
        });
      }
    }
    
    return chunks;
  }

  private async analyzeAssets(stats: any): Promise<BundleAsset[]> {
    const assets: BundleAsset[] = [];
    
    if (stats.assets) {
      for (const asset of stats.assets) {
        const assetType = this.determineAssetType(asset.name);
        
        assets.push({
          name: asset.name,
          size: asset.size || 0,
          type: assetType,
          optimized: this.isAssetOptimized(asset.name, assetType)
        });
      }
    }
    
    return assets;
  }

  private async analyzeDependencies(stats: any): Promise<BundleDependency[]> {
    const dependencies: BundleDependency[] = [];
    const dependencyMap = new Map<string, { size: number; count: number }>();
    
    if (stats.modules) {
      for (const module of stats.modules) {
        if (module.name && module.name.includes('node_modules')) {
          const depName = this.extractDependencyName(module.name);
          const existing = dependencyMap.get(depName) || { size: 0, count: 0 };
          
          dependencyMap.set(depName, {
            size: existing.size + (module.size || 0),
            count: existing.count + 1
          });
        }
      }
    }
    
    for (const [name, data] of dependencyMap) {
      const packageInfo = await this.getPackageInfo(name);
      
      dependencies.push({
        name,
        size: data.size,
        version: packageInfo.version || 'unknown',
        isExternal: true,
        usageCount: data.count,
        impact: this.calculateDependencyImpact(data.size, data.count)
      });
    }
    
    return dependencies.sort((a, b) => b.size - a.size);
  }

  private async calculateGzippedSize(projectPath: string): Promise<number> {
    try {
      const buildPath = path.join(projectPath, this.buildOutputPath);
      const { stdout } = await execAsync(`find ${buildPath} -name "*.js" -exec gzip -c {} \\; | wc -c`);
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      // Estimate gzipped size as ~30% of original
      const bundleAnalysis = await this.analyzeBundleSize(projectPath);
      return Math.round(bundleAnalysis.totalSize * 0.3);
    }
  }

  private async estimateGzippedSize(originalSize: number): Promise<number> {
    // Typical gzip compression ratio for JavaScript is ~70%
    return Math.round(originalSize * 0.3);
  }

  private determineAssetType(filename: string): BundleAsset['type'] {
    const ext = path.extname(filename).toLowerCase();
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) return 'js';
    if (['.css', '.scss', '.sass', '.less'].includes(ext)) return 'css';
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) return 'image';
    if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) return 'font';
    
    return 'other';
  }

  private isAssetOptimized(filename: string, type: BundleAsset['type']): boolean {
    // Check for common optimization indicators
    if (type === 'js' && filename.includes('.min.')) return true;
    if (type === 'css' && filename.includes('.min.')) return true;
    if (type === 'image' && (filename.includes('.webp') || filename.includes('optimized'))) return true;
    
    return false;
  }

  private extractDependencyName(moduleName: string): string {
    const nodeModulesIndex = moduleName.indexOf('node_modules');
    if (nodeModulesIndex === -1) return moduleName;
    
    const afterNodeModules = moduleName.substring(nodeModulesIndex + 'node_modules/'.length);
    const parts = afterNodeModules.split('/');
    
    // Handle scoped packages
    if (parts[0].startsWith('@')) {
      return `${parts[0]}/${parts[1]}`;
    }
    
    return parts[0];
  }

  private async getPackageInfo(packageName: string): Promise<{ version?: string }> {
    try {
      const { stdout } = await execAsync(`npm list ${packageName} --depth=0 --json`);
      const packageInfo = JSON.parse(stdout);
      return {
        version: packageInfo.dependencies?.[packageName]?.version
      };
    } catch (error) {
      return {};
    }
  }

  private calculateDependencyImpact(size: number, usageCount: number): 'high' | 'medium' | 'low' {
    const sizeThreshold = 100 * 1024; // 100KB
    const usageThreshold = 10;
    
    if (size > sizeThreshold && usageCount > usageThreshold) return 'high';
    if (size > sizeThreshold || usageCount > usageThreshold) return 'medium';
    return 'low';
  }

  private generateBundleRecommendations(
    chunks: BundleChunk[],
    assets: BundleAsset[],
    dependencies: BundleDependency[]
  ): BundleRecommendation[] {
    const recommendations: BundleRecommendation[] = [];
    
    // Large chunk recommendations
    const largeChunks = chunks.filter(chunk => chunk.size > 500 * 1024); // 500KB
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code-splitting',
        priority: 'high',
        description: `${largeChunks.length} chunks are larger than 500KB. Consider code splitting.`,
        estimatedSavings: largeChunks.reduce((sum, chunk) => sum + chunk.size * 0.3, 0),
        implementation: 'Implement dynamic imports and route-based code splitting'
      });
    }
    
    // Large dependency recommendations
    const largeDependencies = dependencies.filter(dep => dep.size > 200 * 1024); // 200KB
    if (largeDependencies.length > 0) {
      recommendations.push({
        type: 'dependency-optimization',
        priority: 'medium',
        description: `${largeDependencies.length} dependencies are larger than 200KB.`,
        estimatedSavings: largeDependencies.reduce((sum, dep) => sum + dep.size * 0.2, 0),
        implementation: 'Consider lighter alternatives or tree shaking'
      });
    }
    
    // Unoptimized asset recommendations
    const unoptimizedAssets = assets.filter(asset => !asset.optimized && asset.size > 50 * 1024);
    if (unoptimizedAssets.length > 0) {
      recommendations.push({
        type: 'asset-optimization',
        priority: 'medium',
        description: `${unoptimizedAssets.length} assets could be optimized.`,
        estimatedSavings: unoptimizedAssets.reduce((sum, asset) => sum + asset.size * 0.4, 0),
        implementation: 'Enable asset optimization in build process'
      });
    }
    
    return recommendations;
  }

  private async measureLoadTime(projectPath: string): Promise<LoadTimeMetrics> {
    // This would typically use tools like Lighthouse or Puppeteer
    // For now, return estimated values based on bundle size
    const bundleAnalysis = await this.analyzeBundleSize(projectPath);
    const baseLoadTime = bundleAnalysis.totalSize / (1024 * 1024); // MB per second estimate
    
    return {
      firstContentfulPaint: baseLoadTime * 1000,
      largestContentfulPaint: baseLoadTime * 1500,
      timeToInteractive: baseLoadTime * 2000,
      totalBlockingTime: baseLoadTime * 500,
      cumulativeLayoutShift: 0.1 // Estimated
    };
  }

  private async estimateMemoryUsage(bundleAnalysis: BundleAnalysisResult): Promise<number> {
    // Estimate memory usage as ~2x bundle size (rough approximation)
    return bundleAnalysis.totalSize * 2;
  }

  private async estimateCpuUsage(bundleAnalysis: BundleAnalysisResult): Promise<number> {
    // Estimate CPU usage based on bundle complexity
    const complexityFactor = bundleAnalysis.chunks.length * bundleAnalysis.dependencies.length;
    return Math.min(complexityFactor / 1000, 100); // Percentage
  }

  private async getComponentSize(componentPath: string, projectPath: string): Promise<number> {
    try {
      const fullPath = path.join(projectPath, componentPath);
      const stats = await fs.stat(fullPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  private calculateLoadTimeImpact(componentSize: number): number {
    // Estimate load time impact in milliseconds
    return componentSize / 1024; // 1KB = ~1ms (rough estimate)
  }

  private calculateRenderTimeImpact(componentPath: string): number {
    // Estimate render time based on component complexity
    // This is a simplified estimation
    const filename = path.basename(componentPath);
    if (filename.includes('Chart') || filename.includes('Graph')) return 50;
    if (filename.includes('Table') || filename.includes('List')) return 30;
    if (filename.includes('Form')) return 20;
    return 10;
  }

  private generateUIOptimizationRecommendations(
    sizeImpact: number,
    loadTimeImpact: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (sizeImpact > 50 * 1024) { // 50KB
      recommendations.push('Consider code splitting for this component');
    }
    
    if (loadTimeImpact > 100) { // 100ms
      recommendations.push('Implement lazy loading for this component');
    }
    
    if (sizeImpact > 20 * 1024) { // 20KB
      recommendations.push('Optimize component dependencies');
    }
    
    return recommendations;
  }
}

export const bundleSizeAnalyzerService = new BundleSizeAnalyzerService();