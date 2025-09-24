// API Response and Error Types

export enum ErrorType {
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  FUNIFIER_API_ERROR = "FUNIFIER_API_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  WHITE_LABEL_ERROR = "WHITE_LABEL_ERROR",
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: unknown;
  timestamp: Date;
  retryable: boolean;
  userMessage: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user: import('./funifier').FunifierPlayerStatus;
}

export interface AdminVerificationResponse {
  isAdmin: boolean;
  roles: string[];
  playerData: import('./funifier').FunifierPlayerStatus;
}

export interface EnvironmentConfig {
  NODE_ENV: "development" | "staging" | "production";
  NEXT_PUBLIC_APP_URL: string;
  REDIS_URL?: string;
  ENCRYPTION_KEY: string;
  DEFAULT_FUNIFIER_URL: string;
  DEMO_MODE_ENABLED: boolean;
}