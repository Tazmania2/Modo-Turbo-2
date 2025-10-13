# Base Projects Improvement Analysis Infrastructure

This directory contains the infrastructure for analyzing base projects (Essencia and FNP-Ranking) to identify improvements that can be integrated into the current white-label gamification platform.

## Overview

The analysis infrastructure provides comprehensive tools to:

1. **Repository Analysis**: Compare project structures, identify new components, services, and utilities
2. **Git Diff Analysis**: Analyze changes between repositories using git diff utilities
3. **Configuration Management**: Secure storage and management of repository access tokens and analysis rules
4. **Automated Analysis**: Orchestrated analysis workflow with detailed reporting

## Architecture

### Core Services

#### 1. RepositoryAnalyzerService (`repository-analyzer.service.ts`)
- Clones and analyzes repository structures
- Identifies file types (components, services, utilities, tests)
- Performs change analysis between repositories
- Calculates complexity and impact metrics

#### 2. GitDiffAnalyzerService (`git-diff-analyzer.service.ts`)
- Git-based repository comparison
- Detailed diff analysis with line-by-line changes
- Commit history analysis
- Branch comparison utilities

#### 3. AnalysisConfigService (`analysis-config.service.ts`)
- Configuration management for repositories and analysis rules
- Secure credential storage with token expiration
- Analysis rule management and prioritization criteria
- Compatibility rule configuration

#### 4. AnalysisService (`analysis.service.ts`)
- Main orchestration service
- Coordinates repository analysis and comparisons
- Generates comprehensive analysis reports
- Calculates compatibility scores and risk assessments

## Setup and Configuration

### 1. Environment Setup

Copy the example environment file and configure your repositories:

```bash
cp .env.analysis.example .env.analysis
```

Edit `.env.analysis` with your repository URLs and access tokens:

```env
ESSENCIA_REPO_URL=https://github.com/your-org/essencia.git
ESSENCIA_GITHUB_TOKEN=ghp_your_token_here
FNP_RANKING_REPO_URL=https://github.com/your-org/fnp-ranking.git
FNP_RANKING_GITHUB_TOKEN=ghp_your_token_here
```

### 2. Interactive Setup

Run the interactive setup script:

```bash
npm run analysis:setup
```

This will guide you through:
- Repository URL configuration
- Access token setup
- Analysis rule configuration
- Security settings

### 3. Manual Configuration

You can also configure repositories programmatically:

```typescript
import { AnalysisConfigService } from './services/analysis/analysis-config.service';

const configService = new AnalysisConfigService();

// Update repository configuration
await configService.updateRepositoryConfig('essencia', {
  url: 'https://github.com/your-org/essencia.git',
  branch: 'main',
  localPath: '.temp/analysis/essencia'
});

// Set access credentials
await configService.setRepositoryCredentials(
  'https://github.com/your-org/essencia.git',
  'ghp_your_token_here',
  'github',
  ['repo'],
  90 // 90 days expiration
);
```

## Usage

### Running Analysis

#### 1. Command Line Interface

```bash
# Interactive setup
npm run analysis:setup

# Test configuration
npm run analysis:test

# Run full analysis
npm run analysis:run
```

#### 2. Programmatic Usage

```typescript
import { AnalysisService } from './services/analysis/analysis.service';

const analysisService = new AnalysisService();

// Perform comprehensive analysis
const result = await analysisService.performAnalysis();

console.log('Analysis Summary:', result.summary);
console.log('Compatibility Scores:', result.comparisons);
console.log('Recommended Actions:', result.summary.recommendedActions);

// Save results
await analysisService.saveAnalysisResult(result);
```

### Analysis Results

The analysis generates comprehensive reports including:

- **Repository Structures**: File organization, component hierarchies
- **Change Analysis**: Added, modified, and deleted files
- **Dependency Changes**: Package.json modifications
- **Configuration Changes**: Config file updates
- **Compatibility Scores**: White-label and API compatibility
- **Risk Assessment**: Impact and complexity analysis
- **Improvement Opportunities**: Prioritized recommendations

### Example Analysis Result

```typescript
{
  id: "analysis-1640995200000-abc123",
  timestamp: "2024-01-01T00:00:00.000Z",
  repositories: {
    essencia: {
      repository: "https://github.com/org/essencia.git",
      structure: {
        components: ["src/components/Dashboard.tsx", ...],
        services: ["src/services/analytics.service.ts", ...],
        utilities: ["src/utils/formatting.ts", ...]
      }
    }
  },
  comparisons: {
    essenciaVsCurrent: {
      compatibilityScore: 85,
      newFeatures: ["New analytics dashboard", "Enhanced user management"],
      improvements: ["Performance optimizations", "Better error handling"],
      potentialIssues: ["Breaking API changes in auth service"]
    }
  },
  summary: {
    totalChanges: 47,
    newComponents: 8,
    newServices: 3,
    riskLevel: "medium",
    recommendedActions: [
      "Review 8 new components for integration opportunities",
      "Evaluate 3 new services for platform enhancement"
    ]
  }
}
```

## Security

### Token Management

- Access tokens are stored securely with restricted file permissions (600)
- Tokens have configurable expiration dates
- Support for token encryption (configurable)
- Validation of token access before analysis

### Repository Access

- Only configured repositories are accessible
- Support for private repository access via tokens
- Validation of repository permissions
- Secure cleanup of temporary files

## Configuration Files

### Analysis Configuration (`.kiro/analysis/config.json`)

```json
{
  "repositories": {
    "essencia": {
      "url": "https://github.com/org/essencia.git",
      "branch": "main",
      "localPath": ".temp/analysis/essencia"
    }
  },
  "analysisRules": [
    {
      "id": "component-analysis",
      "name": "Component Analysis",
      "type": "file-pattern",
      "pattern": "**/*.{tsx,jsx}",
      "weight": 1.0,
      "enabled": true
    }
  ],
  "prioritizationCriteria": {
    "businessValue": {
      "high": ["dashboard", "ranking", "auth"],
      "medium": ["ui", "performance"],
      "low": ["documentation", "testing"]
    }
  }
}
```

### Credentials Storage (`.kiro/analysis/credentials.json`)

```json
[
  {
    "repository": "https://github.com/org/essencia.git",
    "accessToken": "ghp_encrypted_token",
    "tokenType": "github",
    "scopes": ["repo"],
    "expiresAt": "2024-04-01T00:00:00.000Z"
  }
]
```

## Analysis Rules

### Built-in Rules

1. **Component Analysis**: Identifies React components and their complexity
2. **Service Analysis**: Analyzes service layer improvements
3. **API Analysis**: Reviews API endpoint changes and compatibility
4. **Dependency Analysis**: Tracks package.json modifications

### Custom Rules

You can add custom analysis rules:

```typescript
await configService.updateAnalysisRule({
  id: 'custom-security-check',
  name: 'Security Pattern Analysis',
  description: 'Check for security-related patterns',
  type: 'file-pattern',
  pattern: '**/auth/**/*.{ts,js}',
  weight: 1.5,
  enabled: true
});
```

## Compatibility Checks

### White-Label Compatibility

- Theme system compatibility
- Branding flexibility analysis
- Component customization support

### API Compatibility

- Backward compatibility validation
- Breaking change detection
- Version compatibility matrix

### Database Compatibility

- Migration requirement analysis
- Data integrity checks
- Performance impact assessment

## Performance Considerations

- Concurrent repository analysis (configurable)
- Incremental analysis for large repositories
- Efficient diff algorithms for change detection
- Cleanup of temporary files after analysis

## Troubleshooting

### Common Issues

1. **Repository Access Denied**
   - Verify access token permissions
   - Check repository URL format
   - Ensure token hasn't expired

2. **Git Command Failures**
   - Verify git is installed and accessible
   - Check network connectivity
   - Validate repository branch exists

3. **Analysis Timeout**
   - Increase timeout in configuration
   - Check repository size and complexity
   - Verify system resources

### Debug Mode

Enable debug logging:

```env
ENABLE_DEBUG_LOGGING=true
LOG_LEVEL=debug
```

### Logs

Analysis logs are stored in `.kiro/analysis/logs/analysis.log`

## Testing

Run the test suite:

```bash
npm test src/services/analysis
```

Test specific services:

```bash
npm test src/services/analysis/analysis-config.service.test.ts
```

## Contributing

When adding new analysis features:

1. Follow the existing service patterns
2. Add comprehensive tests
3. Update type definitions in `src/types/analysis.types.ts`
4. Document new configuration options
5. Update this README with usage examples

## API Reference

See the TypeScript interfaces in `src/types/analysis.types.ts` for complete API documentation.