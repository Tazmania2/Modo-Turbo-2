#!/usr/bin/env node

import { SystemValidationService } from '../services/analysis/system-validation.service';
import { ComprehensiveTestingService } from '../services/analysis/comprehensive-testing.service';
import { SecurityValidationTestService } from '../services/analysis/security-validation-test.service';
import { IntegrationDocumentationService } from '../services/analysis/integration-documentation.service';

interface ValidationOptions {
  type: 'comprehensive' | 'security' | 'deployment' | 'all';
  verbose?: boolean;
  outputFile?: string;
  skipTests?: string[];
  includePerformance?: boolean;
  includeSecurity?: boolean;
  includeCompatibility?: boolean;
}

class SystemValidationExecutor {
  private systemValidationService: SystemValidationService;
  private comprehensiveTestingService: ComprehensiveTestingService;
  private securityValidationService: SecurityValidationTestService;
  private documentationService: IntegrationDocumentationService;

  constructor() {
    this.systemValidationService = new SystemValidationService();
    this.comprehensiveTestingService = new ComprehensiveTestingService();
    this.securityValidationService = new SecurityValidationTestService();
    this.documentationService = new IntegrationDocumentationService();
  }

  async executeValidation(options: ValidationOptions): Promise<void> {
    console.log('🚀 Starting System Validation...');
    console.log(`Validation Type: ${options.type}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    try {
      switch (options.type) {
        case 'comprehensive':
          await this.executeComprehensiveValidation(options);
          break;
        case 'security':
          await this.executeSecurityValidation(options);
          break;
        case 'deployment':
          await this.executeDeploymentValidation(options);
          break;
        case 'all':
          await this.executeAllValidations(options);
          break;
        default:
          throw new Error(`Unknown validation type: ${options.type}`);
      }

      console.log('\n✅ System validation completed successfully!');
    } catch (error) {
      console.error('\n❌ System validation failed:', error);
      process.exit(1);
    }
  }

  private async executeComprehensiveValidation(options: ValidationOptions): Promise<void> {
    console.log('📋 Executing Comprehensive System Testing...');
    
    const validationOptions = {
      includePerformanceTests: options.includePerformance ?? true,
      includeSecurityScans: options.includeSecurity ?? true,
      includeCompatibilityTests: options.includeCompatibility ?? true,
      skipTests: options.skipTests || [],
      verbose: options.verbose ?? false
    };

    const result = await this.systemValidationService.executeComprehensiveSystemTesting([], []);
    
    this.printValidationResults('Comprehensive Testing', result);
    
    if (options.outputFile) {
      await this.saveResultsToFile(options.outputFile, result);
    }
  }

  private async executeSecurityValidation(options: ValidationOptions): Promise<void> {
    console.log('🔒 Executing Security Validation...');
    
    const validationOptions = {
      includeVulnerabilityScans: true,
      includeAuthenticationTests: true,
      includeAuthorizationTests: true,
      includeInputValidationTests: true,
      verbose: options.verbose ?? false
    };

    const result = await this.systemValidationService.performSecurityAndComplianceValidation([]);
    
    this.printValidationResults('Security Validation', result);
    
    if (options.outputFile) {
      await this.saveResultsToFile(options.outputFile, result);
    }
  }

  private async executeDeploymentValidation(options: ValidationOptions): Promise<void> {
    console.log('🚀 Executing Deployment Preparation...');
    
    const deploymentOptions = {
      validateConfiguration: true,
      checkDependencies: true,
      validateEnvironment: true,
      generateDocumentation: true,
      createRollbackPlan: true,
      verbose: options.verbose ?? false
    };

    const result = await this.systemValidationService.completeDocumentationAndDeploymentPreparation([], {} as any);
    
    this.printValidationResults('Deployment Preparation', result);
    
    if (options.outputFile) {
      await this.saveResultsToFile(options.outputFile, result);
    }
  }

  private async executeAllValidations(options: ValidationOptions): Promise<void> {
    console.log('🔄 Executing All Validation Types...\n');
    
    await this.executeComprehensiveValidation(options);
    console.log('\n' + '='.repeat(60) + '\n');
    
    await this.executeSecurityValidation(options);
    console.log('\n' + '='.repeat(60) + '\n');
    
    await this.executeDeploymentValidation(options);
  }

  private printValidationResults(title: string, result: any): void {
    console.log(`\n📊 ${title} Results:`);
    console.log(`Status: ${result.status}`);
    console.log(`Progress: ${result.progress}%`);
    console.log(`Tests Passed: ${result.results.passed}/${result.results.total}`);
    console.log(`Tests Failed: ${result.results.failed}`);
    console.log(`Warnings: ${result.results.warnings}`);
    
    if (result.issues && result.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      result.issues.forEach((issue: any, index: number) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}`);
        if (issue.file) {
          console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
        if (issue.suggestion) {
          console.log(`   Suggestion: ${issue.suggestion}`);
        }
      });
    }

    if (result.phases) {
      console.log('\n📋 Phase Details:');
      result.phases.forEach((phase: any) => {
        console.log(`  ${phase.name}: ${phase.status} (${phase.progress}%)`);
        if (phase.tests && phase.tests.length > 0) {
          phase.tests.forEach((test: any) => {
            const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏳';
            console.log(`    ${status} ${test.name}${test.duration ? ` (${test.duration}ms)` : ''}`);
          });
        }
      });
    }
  }

  private async saveResultsToFile(filename: string, result: any): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const outputPath = path.resolve(filename);
    const content = JSON.stringify(result, null, 2);
    
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`\n💾 Results saved to: ${outputPath}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {
    type: 'comprehensive',
    verbose: false,
    includePerformance: true,
    includeSecurity: true,
    includeCompatibility: true
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--type':
      case '-t':
        options.type = args[++i] as ValidationOptions['type'];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--output':
      case '-o':
        options.outputFile = args[++i];
        break;
      case '--skip-tests':
        options.skipTests = args[++i].split(',');
        break;
      case '--no-performance':
        options.includePerformance = false;
        break;
      case '--no-security':
        options.includeSecurity = false;
        break;
      case '--no-compatibility':
        options.includeCompatibility = false;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  const executor = new SystemValidationExecutor();
  await executor.executeValidation(options);
}

function printHelp() {
  console.log(`
System Validation Executor

Usage: npm run validate:system [options]

Options:
  -t, --type <type>           Validation type: comprehensive, security, deployment, all (default: comprehensive)
  -v, --verbose              Enable verbose output
  -o, --output <file>        Save results to file
  --skip-tests <tests>       Comma-separated list of tests to skip
  --no-performance           Skip performance tests
  --no-security              Skip security tests
  --no-compatibility         Skip compatibility tests
  -h, --help                 Show this help message

Examples:
  npm run validate:system --type comprehensive --verbose
  npm run validate:system --type security --output security-results.json
  npm run validate:system --type all --verbose --output full-validation.json
  `);
}

if (require.main === module) {
  main().catch(console.error);
}

export { SystemValidationExecutor };
export type { ValidationOptions };