import { FunifierPlayerStatus } from '@/types/funifier';

export interface SessionData {
  userId: string;
  userName: string;
  roles: string[];
  isAdmin: boolean;
  expiresAt: number;
  createdAt: number;
  lastActivity: number;
  metadata: {
    userAgent: string;
    ip: string;
  };
  options: Required<SessionOptions>;
}

export interface SessionOptions {
  maxAge?: number; // in seconds
  refreshThreshold?: number; // in seconds
  maxInactivity?: number; // in seconds
}

export class SessionService {
  private static instance: SessionService;
  private sessions: Map<string, SessionData> = new Map();
  private readonly defaultOptions: Required<SessionOptions> = {
    maxAge: 24 * 60 * 60, // 24 hours
    refreshThreshold: 5 * 60, // 5 minutes
    maxInactivity: 2 * 60 * 60, // 2 hours
  };

  private constructor() {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Create a new session
   */
  createSession(
    userId: string,
    playerData: FunifierPlayerStatus,
    roles: string[],
    metadata: { userAgent: string; ip: string },
    options: SessionOptions = {}
  ): SessionData {
    const opts = { ...this.defaultOptions, ...options };
    const now = Date.now();
    
    const sessionData: SessionData = {
      userId,
      userName: playerData.name,
      roles,
      isAdmin: roles.includes('admin'),
      expiresAt: now + (opts.maxAge * 1000),
      createdAt: now,
      lastActivity: now,
      metadata,
      options: opts,
    };

    this.sessions.set(userId, sessionData);
    return sessionData;
  }

  /**
   * Get session by user ID
   */
  getSession(userId: string): SessionData | null {
    const session = this.sessions.get(userId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      this.sessions.delete(userId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity
   */
  updateActivity(userId: string): boolean {
    const session = this.sessions.get(userId);
    
    if (!session || this.isSessionExpired(session)) {
      return false;
    }

    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Extend session expiration
   */
  extendSession(userId: string, additionalTime: number): boolean {
    const session = this.sessions.get(userId);
    
    if (!session || this.isSessionExpired(session)) {
      return false;
    }

    session.expiresAt += additionalTime * 1000;
    session.lastActivity = Date.now();
    return true;
  }

  /**
   * Check if session needs refresh
   */
  needsRefresh(userId: string): boolean {
    const session = this.sessions.get(userId);
    
    if (!session) {
      return false;
    }

    const timeUntilExpiry = session.expiresAt - Date.now();
    return timeUntilExpiry < (session.options.refreshThreshold * 1000);
  }

  /**
   * Validate session
   */
  validateSession(userId: string): boolean {
    const session = this.getSession(userId);
    
    if (!session) {
      return false;
    }

    // Check inactivity timeout
    const inactiveTime = Date.now() - session.lastActivity;
    if (inactiveTime > (session.options.maxInactivity * 1000)) {
      this.destroySession(userId);
      return false;
    }

    return true;
  }

  /**
   * Destroy session
   */
  destroySession(userId: string): boolean {
    return this.sessions.delete(userId);
  }

  /**
   * Get all active sessions (admin only)
   */
  getActiveSessions(): SessionData[] {
    const now = Date.now();
    const activeSessions: SessionData[] = [];

    for (const session of this.sessions.values()) {
      if (!this.isSessionExpired(session)) {
        activeSessions.push(session);
      }
    }

    return activeSessions;
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Check if user has admin session
   */
  hasAdminSession(userId: string): boolean {
    const session = this.getSession(userId);
    return session?.isAdmin || false;
  }

  /**
   * Update user roles in session
   */
  updateUserRoles(userId: string, roles: string[]): boolean {
    const session = this.sessions.get(userId);
    
    if (!session) {
      return false;
    }

    session.roles = roles;
    session.isAdmin = roles.includes('admin');
    session.lastActivity = Date.now();
    
    return true;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [userId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(userId);
      }
    }

    expiredSessions.forEach(userId => {
      this.sessions.delete(userId);
    });

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: SessionData): boolean {
    return Date.now() > session.expiresAt;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    active: number;
    admin: number;
    expired: number;
  } {
    const now = Date.now();
    let active = 0;
    let admin = 0;
    let expired = 0;

    for (const session of this.sessions.values()) {
      if (this.isSessionExpired(session)) {
        expired++;
      } else {
        active++;
        if (session.isAdmin) {
          admin++;
        }
      }
    }

    return {
      total: this.sessions.size,
      active,
      admin,
      expired,
    };
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance();