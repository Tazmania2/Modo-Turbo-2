/**
 * Centralized Funifier API endpoint configuration
 * Maps all Funifier API v3 endpoints with proper URL construction for dynamic parameters
 */

export const FUNIFIER_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
  },

  // User data endpoints
  USER: {
    PROFILE: (userId: string) => `/users/${userId}`,
    ME: '/player/me',
    STATUS: (userId: string) => `/player/${userId}/status`,
  },

  // Dashboard and reports endpoints
  REPORTS: {
    DASHBOARD: (userId: string) => `/reports/dashboard/${userId}`,
    RANKING: (userId: string) => `/reports/ranking/${userId}`,
    HISTORY: (userId: string, season?: string) => 
      season ? `/reports/history/${userId}?season=${season}` : `/reports/history/${userId}`,
    LEADERBOARD: (leaderboardId: string) => `/reports/leaderboard/${leaderboardId}`,
  },

  // Database collection endpoints
  DATABASE: {
    // White label collection
    WHITE_LABEL: {
      GET: (instanceId: string) => `/database/white_label__c/${instanceId}`,
      CREATE: '/database/white_label__c',
      UPDATE: (instanceId: string) => `/database/white_label__c/${instanceId}`,
      DELETE: (instanceId: string) => `/database/white_label__c/${instanceId}`,
      FIND: '/database/white_label__c/find',
    },
    
    // Generic collection operations
    COLLECTION: {
      GET: (collectionName: string, id: string) => `/database/${collectionName}/${id}`,
      CREATE: (collectionName: string) => `/database/${collectionName}`,
      UPDATE: (collectionName: string, id: string) => `/database/${collectionName}/${id}`,
      DELETE: (collectionName: string, id: string) => `/database/${collectionName}/${id}`,
      FIND: (collectionName: string) => `/database/${collectionName}/find`,
      FIND_MANY: (collectionName: string) => `/database/${collectionName}/many`,
      INFO: (collectionName: string) => `/database/${collectionName}/info`,
    },
    
    // Principal (admin) data
    PRINCIPAL: '/database/principal',
  },

  // Ranking endpoints
  RANKING: {
    GLOBAL: '/ranking/global',
    PERSONALIZED: (userId: string) => `/ranking/personalized/${userId}`,
    LEADERBOARD: (leaderboardId: string) => `/ranking/leaderboard/${leaderboardId}`,
    TOP: (limit: number = 10) => `/ranking/top?limit=${limit}`,
  },

  // Admin operations endpoints
  ADMIN: {
    VERIFY_ROLE: (userId: string) => `/admin/verify/${userId}`,
    ACTIONS: '/admin/actions',
    QUICK_ACTION: (actionType: string) => `/admin/actions/${actionType}`,
    USER_MANAGEMENT: {
      UPDATE: (userId: string) => `/admin/users/${userId}`,
      BULK_UPDATE: '/admin/users/bulk',
      RESET_PROGRESS: (userId: string) => `/admin/users/${userId}/reset`,
    },
    SYSTEM: {
      CONFIG: '/admin/system/config',
      STATUS: '/admin/system/status',
    },
  },

  // System endpoints
  SYSTEM: {
    HEALTH: '/health',
    VERSION: '/version',
    STATUS: '/status',
  },
} as const;

/**
 * Helper function to build URLs with query parameters
 */
export function buildUrlWithParams(
  baseUrl: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }

  const queryParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return queryParams ? `${baseUrl}?${queryParams}` : baseUrl;
}

/**
 * Type-safe endpoint builder
 */
export type EndpointBuilder = typeof FUNIFIER_ENDPOINTS;
