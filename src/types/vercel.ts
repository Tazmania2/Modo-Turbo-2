export type DeploymentStatus = 
  | 'BUILDING'
  | 'ERROR'
  | 'INITIALIZING'
  | 'QUEUED'
  | 'READY'
  | 'CANCELED'
  | 'TIMEOUT';

export interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
  framework: string;
  devCommand?: string;
  buildCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
  directoryListing: boolean;
  env: VercelEnvironmentVariable[];
  targets?: {
    production?: {
      id: string;
      domain: string;
    };
  };
}

export interface VercelEnvironmentVariable {
  id: string;
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
  type: 'system' | 'secret' | 'encrypted' | 'plain';
  configurationId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VercelDeployment {
  id: string;
  url: string;
  name: string;
  meta: Record<string, any>;
  target: 'production' | 'staging';
  readyState: DeploymentStatus;
  createdAt: number;
  buildingAt?: number;
  readyAt?: number;
  creator: {
    uid: string;
    email?: string;
    username?: string;
  };
  inspectorUrl?: string;
  projectId: string;
  source?: 'cli' | 'git' | 'import';
  gitSource?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    repo: string;
    ref: string;
    sha?: string;
  };
  aliasAssigned?: boolean;
  aliasError?: {
    code: string;
    message: string;
  };
}

export interface VercelDeploymentEvent {
  id: string;
  type: string;
  created: number;
  text?: string;
  payload?: {
    text?: string;
    level?: 'info' | 'warn' | 'error';
  };
}

export interface DeploymentConfig {
  projectId: string;
  environmentVariables: Record<string, string>;
  target: 'production' | 'preview' | 'development';
  gitSource?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    repo: string;
    ref: string;
  };
}

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
  logs?: string[];
  verificationResult?: {
    healthCheck: boolean;
    responseTime: number;
    statusCode: number;
  };
}

export interface RollbackOptions {
  deploymentId: string;
  reason?: string;
  skipHealthCheck?: boolean;
}

export interface DeploymentMetrics {
  buildTime: number;
  deploymentTime: number;
  totalTime: number;
  buildLogs: string[];
  errorCount: number;
  warningCount: number;
}