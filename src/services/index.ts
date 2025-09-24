// Funifier API Services
export { funifierApiClient, FunifierApiClient, ErrorType, type ApiError } from './funifier-api-client';
export { 
  funifierAuthService, 
  FunifierAuthService, 
  type LoginRequest, 
  type AdminVerificationResponse 
} from './funifier-auth.service';
export { 
  funifierDatabaseService, 
  FunifierDatabaseService,
  type DatabaseQuery,
  type AggregateQuery,
  type DatabaseInsertResult,
  type DatabaseUpdateResult,
  type DatabaseDeleteResult
} from './funifier-database.service';
export { 
  funifierPlayerService, 
  FunifierPlayerService,
  type PlayerSearchQuery,
  type LeaderboardQuery,
  type LeaderQuery,
  type PlayerHistoryQuery,
  type PlayerPerformanceData
} from './funifier-player.service';

// White-Label Configuration Services
export { 
  whiteLabelConfigService, 
  WhiteLabelConfigService,
  type ConfigurationUpdateResult,
  type SetupResult as ConfigSetupResult
} from './white-label-config.service';

// Setup and Demo Services
export { 
  setupService, 
  SetupService,
  type SetupResult,
  type CredentialsValidationResult
} from './setup.service';
export { 
  demoDataService, 
  DemoDataService
} from './demo-data.service';

// Session Management Services
export { 
  sessionService, 
  SessionService,
  type SessionData,
  type SessionOptions
} from './session.service';

// Dashboard Processing Services
export { 
  dashboardProcessorService, 
  DashboardProcessorService,
  type DashboardProcessingOptions,
  type ProcessedDashboardData,
  type DashboardType,
  type GoalConfiguration,
  type GoalDefinition,
  type TargetCalculation,
  type ProgressCalculation,
  type BoostRule,
  type TeamProcessingRule,
  type ActiveBoost
} from './dashboard-processor.service';

export { 
  teamProcessorService, 
  TeamProcessorService,
  type TeamProcessingOptions,
  type TeamDashboardData,
  type TeamMetrics,
  type TeamComparison,
  type TeamInsight,
  type TeamRecommendation
} from './team-processor.service';

export { 
  dashboardDataTransformerService, 
  DashboardDataTransformerService,
  type TransformationContext,
  type TransformationRule,
  type TransformationType,
  type TransformationConfig,
  type MetricDefinition,
  type DashboardMetrics
} from './dashboard-data-transformer.service';

export { 
  dashboardCacheService, 
  DashboardCacheService,
  type DashboardCacheConfig,
  type CacheKey,
  type CacheStats,
  type CacheInvalidationRule,
  type CacheTrigger,
  type CacheMetrics
} from './dashboard-cache.service';

// Branding and Theme Services
export { 
  brandingService, 
  BrandingService,
  type BrandingUpdateResult,
  type AssetUploadResult,
  type ThemeColors,
  type BrandingAssets
} from './branding.service';

export { 
  themeService, 
  ThemeService,
  type ThemeState,
  type ThemeUpdateOptions
} from './theme.service';