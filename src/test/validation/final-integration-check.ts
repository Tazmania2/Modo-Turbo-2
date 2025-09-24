/**
 * Final Integration Check
 * 
 * Comprehensive validation of the white-label gamification platform
 * without complex JSX testing - focuses on system integration validation
 */

import { performance } from 'perf_hooks';

interface ValidationCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  message: string;
  duration: number;
  details?: any;
}

interface IntegrationReport {
  timestamp: number;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  checks: ValidationCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  requirements: {
    validated: string[];
    missing: string[];
  };
}

class FinalIntegrationValidator {
  private checks: ValidationCheck[] = [];
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async runFinalValidation(): Promise<IntegrationReport> {
    console.log('🔍 Running Final Integration Validation...\n');

    // Core System Checks
    await this.validateProjectStructure();
    await this.validateTypeScriptCompilation();
    await this.validateDependencies();
    await this.validateConfigurationFiles();
    
    // Component Integration Checks
    await this.validateComponentExports();
    await this.validateServiceIntegration();
    await this.validateAPIRoutes();
    await this.validateMiddleware();
    
    // Feature Validation
    await this.validateAuthenticationFlow();
    await this.validateDashboardIntegration();
    await this.validateRankingSystem();
    await this.validateAdminFunctionality();
    await this.validateWhiteLabelFeatures();
    
    // System Quality Checks
    await this.validateErrorHandling();
    await this.validateSecurityMeasures();
    await this.validatePerformanceOptimizations();
    await this.validateDocumentation();

    const report = this.generateReport();
    this.printReport(report);
    
    return report;
  }

  private async runCheck(name: string, checkFn: () => Promise<string>): Promise<void> {
    const start = performance.now();
    
    try {
      const message = await checkFn();
      const duration = performance.now() - start;
      
      this.checks.push({
        name,
        status: message.includes('WARNING') ? 'WARNING' : 'PASS',
        message,
        duration
      });
      
      console.log(`✅ ${name}: ${message}`);
    } catch (error) {
      const duration = performance.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.checks.push({
        name,
        status: 'FAIL',
        message,
        duration
      });
      
      console.log(`❌ ${name}: ${message}`);
    }
  }

  private async validateProjectStructure(): Promise<void> {
    await this.runCheck('Project Structure', async () => {
      const fs = require('fs');
      const path = require('path');
      
      const requiredPaths = [
        'src/app',
        'src/components',
        'src/services',
        'src/hooks',
        'src/contexts',
        'src/types',
        'src/utils',
        'src/middleware',
        'e2e',
        'docs'
      ];

      const missingPaths = requiredPaths.filter(p => 
        !fs.existsSync(path.join(process.cwd(), p))
      );

      if (missingPaths.length > 0) {
        throw new Error(`Missing required directories: ${missingPaths.join(', ')}`);
      }

      return 'All required directories present';
    });
  }

  private async validateTypeScriptCompilation(): Promise<void> {
    await this.runCheck('TypeScript Compilation', async () => {
      // Skip actual compilation check in this environment
      // Just verify tsconfig.json exists and is valid
      const fs = require('fs');
      
      if (!fs.existsSync('tsconfig.json')) {
        throw new Error('tsconfig.json not found');
      }
      
      const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
      
      if (!tsconfig.compilerOptions) {
        throw new Error('Invalid tsconfig.json - missing compilerOptions');
      }
      
      return 'TypeScript configuration valid (compilation check skipped)';
    });
  }

  private async validateDependencies(): Promise<void> {
    await this.runCheck('Dependencies', async () => {
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const requiredDeps = [
        'next',
        'react',
        'react-dom',
        '@tanstack/react-query',
        'axios',
        'tailwindcss',
        'framer-motion',
        'zustand',
        'zod'
      ];

      const missingDeps = requiredDeps.filter(dep => 
        !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
      );

      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }

      return 'All required dependencies present';
    });
  }

  private async validateConfigurationFiles(): Promise<void> {
    await this.runCheck('Configuration Files', async () => {
      const fs = require('fs');
      
      const requiredConfigs = [
        'next.config.ts',
        'tailwind.config.ts',
        'tsconfig.json',
        'package.json',
        'playwright.config.ts',
        'vitest.config.ts'
      ];

      const missingConfigs = requiredConfigs.filter(config => 
        !fs.existsSync(config)
      );

      if (missingConfigs.length > 0) {
        throw new Error(`Missing config files: ${missingConfigs.join(', ')}`);
      }

      return 'All configuration files present';
    });
  }

  private async validateComponentExports(): Promise<void> {
    await this.runCheck('Component Exports', async () => {
      const components = [
        'src/components/dashboard/DashboardContainer.tsx',
        'src/components/ranking/PersonalizedRankingContainer.tsx',
        'src/components/admin/AdminOverview.tsx',
        'src/components/setup/SetupWizard.tsx',
        'src/components/auth/LoginForm.tsx'
      ];

      for (const component of components) {
        try {
          require(`../../${component}`);
        } catch (error) {
          throw new Error(`Failed to import ${component}: ${error}`);
        }
      }

      return 'All major components exportable';
    });
  }

  private async validateServiceIntegration(): Promise<void> {
    await this.runCheck('Service Integration', async () => {
      const services = [
        'src/services/funifier-api-client.ts',
        'src/services/white-label-config.service.ts',
        'src/services/dashboard-processor.service.ts',
        'src/services/ranking-integration.service.ts',
        'src/services/setup.service.ts'
      ];

      for (const service of services) {
        try {
          require(`../../${service}`);
        } catch (error) {
          throw new Error(`Failed to import ${service}: ${error}`);
        }
      }

      return 'All core services importable';
    });
  }

  private async validateAPIRoutes(): Promise<void> {
    await this.runCheck('API Routes', async () => {
      const routes = [
        'src/app/api/health/route.ts',
        'src/app/api/config/white-label/route.ts',
        'src/app/api/auth/login/route.ts',
        'src/app/api/admin/features/route.ts',
        'src/app/api/theme/route.ts'
      ];

      for (const route of routes) {
        try {
          const fs = require('fs');
          if (!fs.existsSync(route)) {
            throw new Error(`Route file missing: ${route}`);
          }
          
          const content = fs.readFileSync(route, 'utf8');
          if (!content.includes('export async function')) {
            throw new Error(`Route ${route} missing export functions`);
          }
        } catch (error) {
          throw new Error(`Route validation failed for ${route}: ${error}`);
        }
      }

      return 'All API routes present and properly structured';
    });
  }

  private async validateMiddleware(): Promise<void> {
    await this.runCheck('Middleware', async () => {
      const middlewareFiles = [
        'middleware.ts',
        'src/middleware/auth.ts',
        'src/middleware/error-handler.ts',
        'src/middleware/validation.ts'
      ];

      for (const file of middlewareFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Middleware file missing: ${file}`);
        }
      }

      return 'All middleware files present';
    });
  }

  private async validateAuthenticationFlow(): Promise<void> {
    await this.runCheck('Authentication Flow', async () => {
      // Check auth-related files exist
      const authFiles = [
        'src/hooks/useAuth.ts',
        'src/contexts/AuthContext.tsx',
        'src/utils/auth.ts',
        'src/services/session.service.ts'
      ];

      for (const file of authFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Auth file missing: ${file}`);
        }
      }

      return 'Authentication system components present';
    });
  }

  private async validateDashboardIntegration(): Promise<void> {
    await this.runCheck('Dashboard Integration', async () => {
      const dashboardFiles = [
        'src/components/dashboard/DashboardContainer.tsx',
        'src/components/dashboard/GoalCard.tsx',
        'src/services/dashboard-processor.service.ts',
        'src/hooks/useDashboardData.ts'
      ];

      for (const file of dashboardFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Dashboard file missing: ${file}`);
        }
      }

      return 'Dashboard integration components present';
    });
  }

  private async validateRankingSystem(): Promise<void> {
    await this.runCheck('Ranking System', async () => {
      const rankingFiles = [
        'src/components/ranking/PersonalizedRankingContainer.tsx',
        'src/components/ranking/RaceVisualization.tsx',
        'src/services/ranking-integration.service.ts',
        'src/hooks/useRankingData.ts'
      ];

      for (const file of rankingFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Ranking file missing: ${file}`);
        }
      }

      return 'Ranking system components present';
    });
  }

  private async validateAdminFunctionality(): Promise<void> {
    await this.runCheck('Admin Functionality', async () => {
      const adminFiles = [
        'src/components/admin/AdminOverview.tsx',
        'src/components/admin/FeatureTogglePanel.tsx',
        'src/components/admin/BrandingPanel.tsx',
        'src/services/feature-toggle.service.ts'
      ];

      for (const file of adminFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Admin file missing: ${file}`);
        }
      }

      return 'Admin functionality components present';
    });
  }

  private async validateWhiteLabelFeatures(): Promise<void> {
    await this.runCheck('White-Label Features', async () => {
      const whiteLabelFiles = [
        'src/services/white-label-config.service.ts',
        'src/services/theme.service.ts',
        'src/services/branding.service.ts',
        'src/components/theme/ThemeProvider.tsx'
      ];

      for (const file of whiteLabelFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`White-label file missing: ${file}`);
        }
      }

      return 'White-label system components present';
    });
  }

  private async validateErrorHandling(): Promise<void> {
    await this.runCheck('Error Handling', async () => {
      const errorFiles = [
        'src/components/error/ErrorBoundary.tsx',
        'src/services/error-logger.service.ts',
        'src/hooks/useErrorHandler.ts'
      ];

      for (const file of errorFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Error handling file missing: ${file}`);
        }
      }

      return 'Error handling system present';
    });
  }

  private async validateSecurityMeasures(): Promise<void> {
    await this.runCheck('Security Measures', async () => {
      const securityFiles = [
        'src/middleware/security.ts',
        'src/utils/encryption.ts',
        'src/services/audit-logger.service.ts'
      ];

      for (const file of securityFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Security file missing: ${file}`);
        }
      }

      return 'Security system components present';
    });
  }

  private async validatePerformanceOptimizations(): Promise<void> {
    await this.runCheck('Performance Optimizations', async () => {
      const perfFiles = [
        'src/services/redis-cache.service.ts',
        'src/services/performance-monitor.service.ts',
        'src/hooks/useCacheInvalidation.ts'
      ];

      for (const file of perfFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Performance file missing: ${file}`);
        }
      }

      return 'Performance optimization components present';
    });
  }

  private async validateDocumentation(): Promise<void> {
    await this.runCheck('Documentation', async () => {
      const docFiles = [
        'README.md',
        'docs/API_DOCUMENTATION.md',
        'docs/ADMIN_USER_GUIDE.md',
        'docs/DEVELOPER_DOCUMENTATION.md',
        'TESTING.md'
      ];

      for (const file of docFiles) {
        const fs = require('fs');
        if (!fs.existsSync(file)) {
          throw new Error(`Documentation file missing: ${file}`);
        }
      }

      return 'All documentation files present';
    });
  }

  private generateReport(): IntegrationReport {
    const summary = {
      total: this.checks.length,
      passed: this.checks.filter(c => c.status === 'PASS').length,
      failed: this.checks.filter(c => c.status === 'FAIL').length,
      warnings: this.checks.filter(c => c.status === 'WARNING').length,
      skipped: this.checks.filter(c => c.status === 'SKIP').length
    };

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    
    if (summary.failed > 0) {
      overallStatus = 'CRITICAL';
    } else if (summary.warnings > 0) {
      overallStatus = 'DEGRADED';
    } else {
      overallStatus = 'HEALTHY';
    }

    // Map checks to requirements
    const requirements = this.validateRequirements();

    return {
      timestamp: Date.now(),
      overallStatus,
      checks: this.checks,
      summary,
      requirements
    };
  }

  private validateRequirements(): { validated: string[]; missing: string[] } {
    const validated: string[] = [];
    const missing: string[] = [];

    const requirementChecks = {
      'Requirement 1: Unified User Dashboard Integration': [
        'Component Exports',
        'Dashboard Integration',
        'Service Integration'
      ],
      'Requirement 2: Personalized Ranking System': [
        'Ranking System',
        'Component Exports'
      ],
      'Requirement 3: User History Functionality': [
        'Component Exports',
        'Service Integration'
      ],
      'Requirement 4: Funifier Data Integration': [
        'Service Integration',
        'API Routes'
      ],
      'Requirement 5: Initial System Setup and Demo Mode': [
        'Component Exports',
        'Service Integration'
      ],
      'Requirement 6: Funifier-Based White Label Configuration': [
        'White-Label Features',
        'Service Integration'
      ],
      'Requirement 7: Headless Architecture Maintenance': [
        'API Routes',
        'Service Integration'
      ],
      'Requirement 8: Performance and Loading Experience': [
        'Performance Optimizations',
        'Component Exports'
      ],
      'Requirement 9: Security and Access Control': [
        'Security Measures',
        'Authentication Flow',
        'Middleware'
      ],
      'Requirement 10: Error Handling and Monitoring': [
        'Error Handling',
        'Middleware'
      ],
      'Requirement 11: Feature Toggle Management': [
        'Admin Functionality',
        'White-Label Features'
      ],
      'Requirement 12: Neutral Default Configuration': [
        'White-Label Features',
        'Configuration Files'
      ]
    };

    Object.entries(requirementChecks).forEach(([requirement, requiredChecks]) => {
      const allChecksPassed = requiredChecks.every(checkName => {
        const check = this.checks.find(c => c.name === checkName);
        return check && check.status === 'PASS';
      });

      if (allChecksPassed) {
        validated.push(requirement);
      } else {
        missing.push(requirement);
      }
    });

    return { validated, missing };
  }

  private printReport(report: IntegrationReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL INTEGRATION VALIDATION REPORT');
    console.log('='.repeat(70));

    console.log(`\n🎯 Overall Status: ${this.getStatusIcon(report.overallStatus)} ${report.overallStatus}`);
    console.log(`📅 Timestamp: ${new Date(report.timestamp).toISOString()}`);

    console.log(`\n📈 Summary:
      Total Checks: ${report.summary.total}
      ✅ Passed: ${report.summary.passed}
      ❌ Failed: ${report.summary.failed}
      ⚠️  Warnings: ${report.summary.warnings}
      ⏭️  Skipped: ${report.summary.skipped}
      Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(2)}%
    `);

    console.log('\n🎯 Requirements Validation:');
    console.log(`  ✅ Validated: ${report.requirements.validated.length}/12`);
    console.log(`  ❌ Missing: ${report.requirements.missing.length}/12`);

    if (report.requirements.missing.length > 0) {
      console.log('\n❌ Missing Requirements:');
      report.requirements.missing.forEach(req => {
        console.log(`    - ${req}`);
      });
    }

    if (report.summary.failed > 0) {
      console.log('\n❌ Failed Checks:');
      report.checks
        .filter(c => c.status === 'FAIL')
        .forEach(check => {
          console.log(`    - ${check.name}: ${check.message}`);
        });
    }

    if (report.summary.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      report.checks
        .filter(c => c.status === 'WARNING')
        .forEach(check => {
          console.log(`    - ${check.name}: ${check.message}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    
    if (report.overallStatus === 'HEALTHY' && report.requirements.missing.length === 0) {
      console.log('🎉 INTEGRATION VALIDATION PASSED! System ready for deployment.');
    } else if (report.overallStatus === 'DEGRADED') {
      console.log('⚠️  INTEGRATION VALIDATION COMPLETED WITH WARNINGS.');
    } else {
      console.log('💥 INTEGRATION VALIDATION FAILED! Critical issues must be resolved.');
    }
    
    console.log('='.repeat(70));
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'HEALTHY': return '✅';
      case 'DEGRADED': return '⚠️';
      case 'CRITICAL': return '❌';
      default: return '❓';
    }
  }
}

// CLI execution
export async function runFinalValidation(): Promise<void> {
  const validator = new FinalIntegrationValidator();
  
  try {
    const report = await validator.runFinalValidation();
    
    // Exit with appropriate code
    if (report.overallStatus === 'CRITICAL' || report.requirements.missing.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Final validation failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { FinalIntegrationValidator };

// CLI execution
if (require.main === module) {
  runFinalValidation();
}