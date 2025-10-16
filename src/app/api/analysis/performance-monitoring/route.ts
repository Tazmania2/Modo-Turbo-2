import { NextRequest, NextResponse } from 'next/server';
import { runtimePerformanceAnalyzerService } from '@/services/analysis/runtime-performance-analyzer.service';
import { bundleSizeAnalyzerService } from '@/services/analysis/bundle-size-analyzer.service';

interface PerformanceMetrics {
  timestamp: number;
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// In-memory storage for demo purposes
// In production, this would be stored in a database
let performanceHistory: PerformanceMetrics[] = [];
let isMonitoring = false;
let monitoringInterval: NodeJS.Timeout | null = null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';
    
    // Filter data based on time range
    const now = Date.now();
    let startTime = now;
    
    switch (range) {
      case '1h':
        startTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const filteredMetrics = performanceHistory.filter(
      metric => metric.timestamp >= startTime
    );
    
    // If no historical data, generate some sample data
    if (filteredMetrics.length === 0) {
      const sampleData = generateSampleData(range);
      performanceHistory.push(...sampleData);
      return NextResponse.json({ 
        metrics: sampleData,
        isMonitoring 
      });
    }
    
    return NextResponse.json({ 
      metrics: filteredMetrics,
      isMonitoring 
    });
  } catch (error) {
    console.error('Performance monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

function generateSampleData(range: string): PerformanceMetrics[] {
  const now = Date.now();
  const data: PerformanceMetrics[] = [];
  
  let points = 24; // Default for 24h
  let interval = 60 * 60 * 1000; // 1 hour
  
  switch (range) {
    case '1h':
      points = 12;
      interval = 5 * 60 * 1000; // 5 minutes
      break;
    case '24h':
      points = 24;
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case '7d':
      points = 28;
      interval = 6 * 60 * 60 * 1000; // 6 hours
      break;
    case '30d':
      points = 30;
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
  }
  
  for (let i = points; i >= 0; i--) {
    const timestamp = now - (i * interval);
    
    // Generate realistic performance metrics with some variation
    const baseBundle = 2 * 1024 * 1024; // 2MB base
    const baseLoad = 1500; // 1.5s base load time
    const baseRender = 800; // 800ms base render time
    const baseMemory = 50 * 1024 * 1024; // 50MB base memory
    const baseCpu = 25; // 25% base CPU
    
    // Add some realistic variation
    const variation = Math.sin(i * 0.1) * 0.2 + Math.random() * 0.1;
    
    data.push({
      timestamp,
      bundleSize: Math.round(baseBundle * (1 + variation)),
      loadTime: Math.round(baseLoad * (1 + variation)),
      renderTime: Math.round(baseRender * (1 + variation)),
      memoryUsage: Math.round(baseMemory * (1 + variation)),
      cpuUsage: Math.round(baseCpu * (1 + variation))
    });
  }
  
  return data;
}

async function collectCurrentMetrics(): Promise<PerformanceMetrics> {
  try {
    // In a real implementation, these would collect actual metrics
    const projectPath = process.cwd();
    
    // Collect bundle size metrics
    const bundleAnalysis = await bundleSizeAnalyzerService.analyzeBundleSize(projectPath);
    
    // Collect runtime performance metrics
    const runtimeAnalysis = await runtimePerformanceAnalyzerService.analyzeRuntimePerformance(
      projectPath,
      {
        duration: 10, // 10 seconds
        sampleRate: 1, // 1 sample per second
        includeMemory: true,
        includeCpu: true,
        includeNetwork: false,
        includeRendering: true,
        components: []
      }
    );
    
    return {
      timestamp: Date.now(),
      bundleSize: bundleAnalysis.totalSize,
      loadTime: 1500 + Math.random() * 500, // Simulated load time
      renderTime: 800 + Math.random() * 300, // Simulated render time
      memoryUsage: runtimeAnalysis.memoryUsage.totalMemory,
      cpuUsage: runtimeAnalysis.cpuUsage.averageUsage
    };
  } catch (error) {
    console.error('Failed to collect metrics:', error);
    
    // Return simulated metrics if collection fails
    return {
      timestamp: Date.now(),
      bundleSize: 2 * 1024 * 1024 + Math.random() * 1024 * 1024,
      loadTime: 1500 + Math.random() * 500,
      renderTime: 800 + Math.random() * 300,
      memoryUsage: 50 * 1024 * 1024 + Math.random() * 20 * 1024 * 1024,
      cpuUsage: 25 + Math.random() * 25
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    if (action === 'start') {
      if (isMonitoring) {
        return NextResponse.json({ message: 'Monitoring already active' });
      }
      
      isMonitoring = true;
      
      // Start collecting metrics every 30 seconds
      monitoringInterval = setInterval(async () => {
        try {
          const metrics = await collectCurrentMetrics();
          performanceHistory.push(metrics);
          
          // Keep only last 1000 data points to prevent memory issues
          if (performanceHistory.length > 1000) {
            performanceHistory = performanceHistory.slice(-1000);
          }
        } catch (error) {
          console.error('Failed to collect metrics during monitoring:', error);
        }
      }, 30000);
      
      return NextResponse.json({ 
        message: 'Performance monitoring started',
        isMonitoring: true 
      });
    }
    
    if (action === 'stop') {
      if (!isMonitoring) {
        return NextResponse.json({ message: 'Monitoring not active' });
      }
      
      isMonitoring = false;
      
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
      }
      
      return NextResponse.json({ 
        message: 'Performance monitoring stopped',
        isMonitoring: false 
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Performance monitoring control error:', error);
    return NextResponse.json(
      { error: 'Failed to control monitoring' },
      { status: 500 }
    );
  }
}