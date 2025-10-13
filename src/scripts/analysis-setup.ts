#!/usr/bin/env node

import { AnalysisConfigService } from '../services/analysis/analysis-config.service';
import { AnalysisService } from '../services/analysis/analysis.service';
import * as readline from 'readline';

interface SetupOptions {
  essenciaUrl?: string;
  essenciaToken?: string;
  fnpRankingUrl?: string;
  fnpRankingToken?: string;
  skipValidation?: boolean;
}

class AnalysisSetupCLI {
  private configService: AnalysisConfigService;
  private analysisService: AnalysisService;
  private rl: readline.Interface;

  constructor() {
    this.configService = new AnalysisConfigService();
    this.analysisService = new AnalysisService();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<void> {
    try {
      console.log('🔍 Base Projects Improvement Analysis Setup');
      console.log('==========================================\n');

      const action = await this.promptAction();
      
      switch (action) {
        case 'setup':
          await this.setupRepositories();
          break;
        case 'test':
          await this.testConfiguration();
          break;
        case 'analyze':
          await this.runAnalysis();
          break;
        case 'config':
          await this.showConfiguration();
          break;
        default:
          console.log('Invalid action selected.');
      }
    } catch (error) {
      console.error('❌ Setup failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  private async promptAction(): Promise<string> {
    return new Promise((resolve) => {
      console.log('What would you like to do?');
      console.log('1. setup - Configure repository access');
      console.log('2. test - Test current configuration');
      console.log('3. analyze - Run analysis with current config');
      console.log('4. config - Show current configuration\n');
      
      this.rl.question('Select an action (setup/test/analyze/config): ', (answer) => {
        resolve(answer.toLowerCase().trim());
      });
    });
  }

  private async setupRepositories(): Promise<void> {
    console.log('\n📝 Repository Configuration Setup');
    console.log('=================================\n');

    // Setup Essencia repository
    console.log('🔧 Configuring Essencia repository...');
    const essenciaUrl = await this.prompt('Enter Essencia repository URL (e.g., https://github.com/org/essencia.git): ');
    const essenciaBranch = await this.prompt('Enter Essencia branch [main]: ') || 'main';
    const essenciaToken = await this.prompt('Enter GitHub access token for Essencia (optional): ');

    await this.configService.updateRepositoryConfig('essencia', {
      url: essenciaUrl,
      branch: essenciaBranch,
      localPath: '.temp/analysis/essencia'
    });

    if (essenciaToken) {
      await this.configService.setRepositoryCredentials(
        essenciaUrl,
        essenciaToken,
        'github',
        ['repo'],
        90 // 90 days expiration
      );
    }

    // Setup FNP-Ranking repository
    console.log('\n🔧 Configuring FNP-Ranking repository...');
    const fnpRankingUrl = await this.prompt('Enter FNP-Ranking repository URL (e.g., https://github.com/org/fnp-ranking.git): ');
    const fnpRankingBranch = await this.prompt('Enter FNP-Ranking branch [main]: ') || 'main';
    const fnpRankingToken = await this.prompt('Enter GitHub access token for FNP-Ranking (optional): ');

    await this.configService.updateRepositoryConfig('fnpRanking', {
      url: fnpRankingUrl,
      branch: fnpRankingBranch,
      localPath: '.temp/analysis/fnp-ranking'
    });

    if (fnpRankingToken) {
      await this.configService.setRepositoryCredentials(
        fnpRankingUrl,
        fnpRankingToken,
        'github',
        ['repo'],
        90 // 90 days expiration
      );
    }

    // Configure current repository
    console.log('\n🔧 Configuring current repository...');
    await this.configService.updateRepositoryConfig('current', {
      url: '.',
      branch: 'main',
      localPath: '.'
    });

    console.log('\n✅ Repository configuration completed!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run analysis:test" to validate configuration');
    console.log('2. Run "npm run analysis:run" to perform analysis');
  }

  private async testConfiguration(): Promise<void> {
    console.log('\n🧪 Testing Configuration');
    console.log('========================\n');

    try {
      const config = await this.configService.loadConfiguration();
      
      console.log('📋 Configuration loaded successfully');
      console.log(`- Essencia: ${config.repositories.essencia.url}`);
      console.log(`- FNP-Ranking: ${config.repositories.fnpRanking.url}`);
      console.log(`- Current: ${config.repositories.current.url}\n`);

      // Test repository access
      console.log('🔐 Testing repository access...');
      
      const essenciaAccess = await this.configService.validateRepositoryAccess(config.repositories.essencia.url);
      console.log(`- Essencia access: ${essenciaAccess ? '✅ Valid' : '❌ Invalid'}`);
      
      const fnpRankingAccess = await this.configService.validateRepositoryAccess(config.repositories.fnpRanking.url);
      console.log(`- FNP-Ranking access: ${fnpRankingAccess ? '✅ Valid' : '❌ Invalid'}`);
      
      const currentAccess = await this.configService.validateRepositoryAccess(config.repositories.current.url);
      console.log(`- Current access: ${currentAccess ? '✅ Valid' : '❌ Invalid'}\n`);

      // Test analysis services
      console.log('🔧 Testing analysis services...');
      
      try {
        // Test repository analyzer
        const repoAnalyzer = new (await import('../services/analysis/repository-analyzer.service')).RepositoryAnalyzerService();
        const currentStructure = await repoAnalyzer.getProjectStructure('.');
        console.log(`- Repository analyzer: ✅ Working (found ${currentStructure.files.length} files)`);
      } catch (error) {
        console.log(`- Repository analyzer: ❌ Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        // Test git diff analyzer
        const gitAnalyzer = new (await import('../services/analysis/git-diff-analyzer.service')).GitDiffAnalyzerService();
        const isValidRepo = await gitAnalyzer.validateRepository('.');
        console.log(`- Git analyzer: ${isValidRepo ? '✅ Working' : '❌ Not a git repository'}`);
      } catch (error) {
        console.log(`- Git analyzer: ❌ Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      console.log('\n✅ Configuration test completed!');
      
    } catch (error) {
      console.error('❌ Configuration test failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async runAnalysis(): Promise<void> {
    console.log('\n🚀 Running Analysis');
    console.log('==================\n');

    try {
      console.log('Starting comprehensive analysis...');
      const startTime = Date.now();
      
      const result = await this.analysisService.performAnalysis();
      
      const duration = Date.now() - startTime;
      console.log(`\n✅ Analysis completed in ${duration}ms\n`);

      // Display summary
      console.log('📊 Analysis Summary');
      console.log('==================');
      console.log(`Analysis ID: ${result.id}`);
      console.log(`Timestamp: ${result.timestamp.toISOString()}`);
      console.log(`Total Changes: ${result.summary.totalChanges}`);
      console.log(`New Components: ${result.summary.newComponents}`);
      console.log(`New Services: ${result.summary.newServices}`);
      console.log(`New Utilities: ${result.summary.newUtilities}`);
      console.log(`Dependency Changes: ${result.summary.dependencyChanges}`);
      console.log(`Configuration Changes: ${result.summary.configurationChanges}`);
      console.log(`Risk Level: ${result.summary.riskLevel.toUpperCase()}\n`);

      // Display compatibility scores
      console.log('🔍 Compatibility Scores');
      console.log('======================');
      console.log(`Essencia vs Current: ${result.comparisons.essenciaVsCurrent.compatibilityScore}%`);
      console.log(`FNP-Ranking vs Current: ${result.comparisons.fnpRankingVsCurrent.compatibilityScore}%\n`);

      // Display recommended actions
      if (result.summary.recommendedActions.length > 0) {
        console.log('💡 Recommended Actions');
        console.log('=====================');
        result.summary.recommendedActions.forEach((action, index) => {
          console.log(`${index + 1}. ${action}`);
        });
        console.log();
      }

      // Save result
      await this.analysisService.saveAnalysisResult(result);
      console.log(`💾 Analysis result saved with ID: ${result.id}`);
      
    } catch (error) {
      console.error('❌ Analysis failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async showConfiguration(): Promise<void> {
    console.log('\n⚙️  Current Configuration');
    console.log('========================\n');

    try {
      const config = await this.configService.loadConfiguration();
      
      console.log('📁 Repositories:');
      console.log(`  Essencia:`);
      console.log(`    URL: ${config.repositories.essencia.url}`);
      console.log(`    Branch: ${config.repositories.essencia.branch}`);
      console.log(`    Local Path: ${config.repositories.essencia.localPath}`);
      
      console.log(`  FNP-Ranking:`);
      console.log(`    URL: ${config.repositories.fnpRanking.url}`);
      console.log(`    Branch: ${config.repositories.fnpRanking.branch}`);
      console.log(`    Local Path: ${config.repositories.fnpRanking.localPath}`);
      
      console.log(`  Current:`);
      console.log(`    URL: ${config.repositories.current.url}`);
      console.log(`    Branch: ${config.repositories.current.branch}`);
      console.log(`    Local Path: ${config.repositories.current.localPath}\n`);

      console.log('📋 Analysis Rules:');
      config.analysisRules.forEach(rule => {
        console.log(`  ${rule.name} (${rule.type}): ${rule.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      });
      console.log();

      console.log('🔒 Security Configuration:');
      console.log(`  Token Storage: ${config.security.tokenStorage}`);
      console.log(`  Encrypt Tokens: ${config.security.encryptTokens}`);
      console.log(`  Token Expiration: ${config.security.tokenExpirationDays} days`);
      console.log(`  Require 2FA: ${config.security.requireTwoFactor}\n`);

      // Show credentials status
      const credentials = await this.configService.loadCredentials();
      console.log('🔑 Stored Credentials:');
      if (credentials.length === 0) {
        console.log('  No credentials stored');
      } else {
        credentials.forEach(cred => {
          const status = cred.expiresAt && new Date(cred.expiresAt) <= new Date() ? '❌ Expired' : '✅ Valid';
          console.log(`  ${cred.repository} (${cred.tokenType}): ${status}`);
        });
      }
      console.log();

    } catch (error) {
      console.error('❌ Failed to load configuration:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// CLI execution
if (require.main === module) {
  const cli = new AnalysisSetupCLI();
  cli.run().catch(error => {
    console.error('❌ CLI execution failed:', error);
    process.exit(1);
  });
}

export { AnalysisSetupCLI };