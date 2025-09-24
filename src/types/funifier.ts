// Core Funifier API Types

export interface ImageInfo {
  url: string;
  size: number;
  width: number;
  height: number;
  depth: number;
}

export interface FunifierPlayerStatus {
  _id: string;
  name: string;
  image?: {
    small: ImageInfo;
    medium: ImageInfo;
    original: ImageInfo;
  };
  total_challenges: number;
  challenges: Record<string, number>;
  total_points: number;
  point_categories: Record<string, number>;
  total_catalog_items: number;
  catalog_items: Record<string, number>;
  level_progress: {
    percent_completed: number;
    next_points: number;
    total_levels: number;
    percent: number;
  };
  challenge_progress: unknown[];
  teams: string[];
  positions: unknown[];
  time: number;
  extra: Record<string, unknown>;
  pointCategories: Record<string, number>;
}

export interface FunifierCredentials {
  apiKey: string;
  serverUrl: string;
  authToken: string;
}

export interface FunifierAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user?: FunifierPlayerStatus;
}

export interface FunifierLeaderboard {
  _id: string;
  name: string;
  description?: string;
  type: string;
  active: boolean;
  leaders: FunifierLeader[];
}

export interface FunifierLeader {
  _id: string;
  player: string;
  playerName: string;
  points: number;
  position: number;
  avatar?: string;
  team?: string;
}

export interface FunifierDatabaseRecord {
  _id: string;
  [key: string]: unknown;
  time: number;
}

export interface FunifierApiError {
  error: string;
  message: string;
  statusCode: number;
}

// White-Label Configuration Types

export interface WhiteLabelBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo: string;
  favicon: string;
  companyName: string;
  tagline: string;
}

export interface WhiteLabelFeatures {
  ranking: boolean;
  dashboards: Record<string, boolean>;
  history: boolean;
  personalizedRanking: boolean;
}

export interface WhiteLabelFunifierIntegration {
  apiKey: string; // Encrypted
  serverUrl: string;
  authToken: string; // Encrypted
  customCollections: string[];
}

export interface WhiteLabelConfiguration {
  _id?: string;
  instanceId: string;
  branding: WhiteLabelBranding;
  features: WhiteLabelFeatures;
  funifierIntegration: WhiteLabelFunifierIntegration;
  createdAt?: number; // Funifier timestamp
  updatedAt?: number; // Funifier timestamp
}

export interface FunifierWhiteLabelRecord extends FunifierDatabaseRecord {
  instanceId: string;
  config: WhiteLabelConfiguration;
  isActive: boolean;
  createdBy: string;
  lastModifiedBy: string;
}

export interface SetupRequest {
  mode: "demo" | "funifier";
  funifierCredentials?: {
    apiKey: string;
    serverUrl: string;
    authToken: string;
  };
}

export interface WhiteLabelConfigResponse {
  _id: string;
  instanceId: string;
  branding: WhiteLabelBranding;
  features: WhiteLabelFeatures;
  funifierConfig: {
    isConfigured: boolean;
    serverUrl?: string;
  };
}

// Dashboard and Ranking Types

export interface Goal {
  name: string;
  percentage: number;
  description: string;
  emoji: string;
  target?: number;
  current?: number;
  unit?: string;
  hasBoost?: boolean;
  isBoostActive?: boolean;
  daysRemaining?: number;
}

export interface Player {
  _id: string;
  name: string;
  totalPoints: number;
  position: number;
  previousPosition?: number;
  pointsGainedToday: number;
  avatar?: string;
  team: string;
  goals: Goal[];
  lastUpdated: Date;
}

export interface PlayerPerformance {
  playerId: string;
  playerName: string;
  totalPoints: number;
  position: number;
  previousPosition?: number;
  pointsGainedToday: number;
  avatar?: string;
  team: string;
  goals: Goal[];
  lastUpdated: Date;
}

export interface Season {
  _id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  playerStats: {
    totalPoints: number;
    finalPosition: number;
    achievements: string[];
    goals: Goal[];
  };
}

export interface Leaderboard {
  _id: string;
  name: string;
  description: string;
  type: string;
  period: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  participants: number;
  maxParticipants?: number;
}

export interface RaceVisualization {
  raceTrack: {
    length: number;
    segments: number;
    theme: string;
  };
  participants: Array<{
    playerId: string;
    playerName: string;
    avatar?: string;
    position: {
      x: number;
      y: number;
      progress: number;
    };
    vehicle: {
      type: string;
      color: string;
      speed: number;
    };
    isCurrentUser: boolean;
  }>;
  animations: {
    enabled: boolean;
    speed: number;
    effects: string[];
  };
}

export interface PersonalCard {
  playerId: string;
  playerName: string;
  avatar?: string;
  currentPosition: number;
  previousPosition?: number;
  totalPoints: number;
  pointsGainedToday: number;
  team: string;
  level: number;
  nextLevelPoints: number;
  achievements: string[];
  streaks: {
    current: number;
    longest: number;
  };
  lastActivity: Date;
}