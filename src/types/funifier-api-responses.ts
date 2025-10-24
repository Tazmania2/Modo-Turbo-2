/**
 * Funifier API response type definitions
 * Based on actual Funifier API v3 responses from documentation
 */

import { FunifierPlayerStatus, ImageInfo } from './funifier';

// ============================================================================
// Authentication Responses
// ============================================================================

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface TokenValidation {
  valid: boolean;
  userId?: string;
  expiresAt?: number;
}

// ============================================================================
// Player Responses
// ============================================================================

export interface PlayerInfo {
  _id: string;
  name: string;
  email?: string;
  image?: {
    small: ImageInfo;
    medium: ImageInfo;
    original: ImageInfo;
  };
  teams?: string[];
  friends?: string[];
  extra?: Record<string, unknown>;
  created?: number;
  updated?: number;
}

// Player status is already defined in funifier.ts as FunifierPlayerStatus
export type UserProfile = FunifierPlayerStatus;

// ============================================================================
// Dashboard and Reports (Note: These endpoints may not exist in standard API)
// ============================================================================

// Dashboard data structure (custom implementation)
export interface DashboardData {
  player: FunifierPlayerStatus;
  achievements: Achievement[];
  recentActivity: ActionLog[];
  leaderboards?: LeaderboardEntry[];
}

export interface Achievement {
  _id: string;
  player: string;
  total: number;
  type: number; // 0=point, 1=challenge, 2=catalog_item, etc.
  item: string;
  time: number;
  extra?: Record<string, unknown>;
}

export interface ActionLog {
  _id: string;
  actionId: string;
  player: string;
  time: number;
  attributes?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

// ============================================================================
// Ranking/Leaderboard Responses
// ============================================================================

export interface LeaderboardEntry {
  _id: string;
  player: string;
  name?: string;
  image?: string;
  total: number;
  position: number;
  move?: 'up' | 'down' | 'same';
  extra?: Record<string, unknown>;
  boardId?: string;
}

export interface LeaderboardData {
  _id: string;
  title: string;
  description?: string;
  principalType: number;
  operation: {
    type: number;
    achievement_type: number;
    item: string;
    filters: unknown[];
    sort: number;
    sub: boolean;
  };
  period?: {
    type: number;
    timeAmount: number;
    timeScale: number;
  };
  techniques?: string[];
}

export interface GlobalRanking {
  leaders: LeaderboardEntry[];
  leaderboard?: LeaderboardData;
}

export interface PersonalizedRanking {
  userPosition: LeaderboardEntry;
  leaders: LeaderboardEntry[];
  leaderboard?: LeaderboardData;
}

// Generic ranking data
export interface RankingData {
  leaders: LeaderboardEntry[];
  metadata?: {
    totalParticipants: number;
    lastUpdated: number;
  };
}

export interface RankingFilters {
  period?: string;
  team?: string;
  category?: string;
  limit?: number;
}

// ============================================================================
// History (Note: May need to use achievements or action_log collection)
// ============================================================================

export interface HistoryData {
  userId: string;
  entries: (Achievement | ActionLog)[];
  total: number;
}

// ============================================================================
// White Label Configuration (Custom collection)
// ============================================================================

export interface WhiteLabelConfig {
  _id?: string;
  instanceId: string;
  branding: BrandingConfig;
  features: FeatureConfig;
  funifierIntegration?: {
    apiKey?: string;
    serverUrl?: string;
    authToken?: string;
  };
  createdAt?: number;
  updatedAt?: number;
  extra?: Record<string, unknown>;
}

export interface BrandingConfig {
  logo: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  companyName: string;
  tagline?: string;
}

export interface FeatureConfig {
  ranking: boolean;
  dashboards: Record<string, boolean>;
  history: boolean;
  personalizedRanking: boolean;
}

// ============================================================================
// Admin Operations
// ============================================================================

export interface AdminVerification {
  isAdmin: boolean;
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface QuickAction {
  type: string;
  targetUserId?: string;
  parameters?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Database Operations
// ============================================================================

export interface DatabaseRecord {
  _id: string;
  [key: string]: unknown;
}

export interface DatabaseInsertResult {
  _id: string;
  [key: string]: unknown;
}

export interface DatabaseUpdateResult {
  _id: string;
  [key: string]: unknown;
}

export interface DatabaseDeleteResult {
  _id: string;
}

export interface DatabaseBulkResult {
  total: number;
}

// ============================================================================
// Challenge Responses
// ============================================================================

export interface Challenge {
  _id: string;
  challenge: string;
  description?: string;
  range: number;
  active: boolean;
  rules: ChallengeRule[];
  teamChallenge: boolean;
  limitTotal: number;
  limitPerType: number;
  limitTimeAmount: number;
  limitTimeScale: number;
  techniques: string[];
  badge?: {
    small: ImageInfo;
    medium: ImageInfo;
    original: ImageInfo;
  };
  hideUntilEarned: boolean;
  points: PointReward[];
  extra: Record<string, unknown>;
  rewards: unknown[];
  i18n: Record<string, unknown>;
  created: number;
  updated: number;
  badgeUrl?: string;
}

export interface ChallengeRule {
  actionId: string;
  position: number;
  operator: number;
  timeAmount: number;
  timeScale: number;
  outOfTime: boolean;
  everyAmount: number;
  everyScale: number;
  filters?: unknown[];
  total: number;
}

export interface PointReward {
  total: number;
  category: string;
  operation: number;
  perPlayer: boolean;
}

// ============================================================================
// Team Responses
// ============================================================================

export interface Team {
  _id: string;
  name: string;
  description?: string;
  image?: {
    small: ImageInfo;
    medium: ImageInfo;
    original: ImageInfo;
  };
  extra?: Record<string, unknown>;
  owner?: string;
  created?: number;
  updated?: number;
}

export interface TeamStatus {
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
  challenge_progress: unknown[];
  positions: unknown[];
  time: number;
  extra: Record<string, unknown>;
  pointCategories: Record<string, number>;
}

// ============================================================================
// Error Responses
// ============================================================================

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
  timestamp?: number;
}

// ============================================================================
// Generic Response Wrappers
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
