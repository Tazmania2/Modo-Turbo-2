export enum ErrorType {
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  FUNIFIER_API_ERROR = "FUNIFIER_API_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  WHITE_LABEL_ERROR = "WHITE_LABEL_ERROR",
}

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
  code?: string;
  statusCode?: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  errorId?: string;
}

export interface FallbackMechanism {
  type: 'cache' | 'demo' | 'offline' | 'retry';
  enabled: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackData?: any;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  timestamp: Date;
  uptime: number;
}