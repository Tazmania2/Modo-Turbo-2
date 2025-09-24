import { errorLogger } from './error-logger.service';

export interface AuditEvent {
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  clientId: string;
  userId?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface SecurityEvent extends AuditEvent {
  action: 
    | 'LOGIN_ATTEMPT' 
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILURE' 
    | 'LOGOUT'
    | 'ADMIN_ACCESS'
    | 'CONFIG_CHANGE'
    | 'FEATURE_TOGGLE'
    | 'BRANDING_UPDATE'
    | 'CREDENTIALS_UPDATE'
    | 'SECURITY_VIOLATION_RATE_LIMIT'
    | 'SECURITY_VIOLATION_CSRF'
    | 'SECURITY_VIOLATION_XSS'
    | 'SECURITY_VIOLATION_DDOS'
    | 'IP_BLOCKED'
    | 'MIDDLEWARE_ERROR'
    | 'UNAUTHORIZED_ACCESS'
    | 'SUSPICIOUS_ACTIVITY';
}

export interface AdminAction extends AuditEvent {
  action:
    | 'WHITE_LABEL_CONFIG_UPDATE'
    | 'FEATURE_ENABLED'
    | 'FEATURE_DISABLED'
    | 'BRANDING_CHANGED'
    | 'FUNIFIER_CREDENTIALS_UPDATED'
    | 'SYSTEM_RESET'
    | 'CACHE_CLEARED'
    | 'USER_BLOCKED'
    | 'USER_UNBLOCKED'
    | 'DEPLOYMENT_TRIGGERED'
    | 'ENVIRONMENT_UPDATED';
}

export interface AuditMetrics {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  securityViolations: number;
  adminActions: number;
  recentEvents: AuditEvent[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

class AuditLoggerService {
  private auditLog: AuditEvent[] = [];
  private maxLogSize = 10000;
  private auditCallbacks: ((event: AuditEvent) => void)[] = [];

  /**
   * Log a security-related event
   */
  logSecurityEvent(event: SecurityEvent): string {
    const eventId = this.generateEventId();
    
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: event.timestamp || new Date()
    };

    this.addToLog(auditEvent);
    this.notifyCallbacks(auditEvent);
    
    // Log high severity security events as errors too
    if (event.severity === 'high' || event.severity === 'critical') {
      errorLogger.logCustomError(
        'SECURITY_ERROR' as any,
        `Security event: ${event.action}`,
        event.details,
        {
          clientId: event.clientId,
          userAgent: event.userAgent,
          url: event.url
        }
      );
    }
    
    // Send to external monitoring for critical events
    if (event.severity === 'critical') {
      this.sendToExternalMonitoring(auditEvent);
    }
    
    return eventId;
  }

  /**
   * Log an admin action
   */
  logAdminAction(event: AdminAction): string {
    const eventId = this.generateEventId();
    
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: event.timestamp || new Date()
    };

    this.addToLog(auditEvent);
    this.notifyCallbacks(auditEvent);
    
    // All admin actions are logged as medium severity by default
    if (!event.severity) {
      auditEvent.severity = 'medium';
    }
    
    return eventId;
  }

  /**
   * Log a general audit event
   */
  logEvent(event: Omit<AuditEvent, 'timestamp'> & { timestamp?: Date }): string {
    const eventId = this.generateEventId();
    
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: event.timestamp || new Date()
    };

    this.addToLog(auditEvent);
    this.notifyCallbacks(auditEvent);
    
    return eventId;
  }

  /**
   * Get audit metrics for a time period
   */
  getAuditMetrics(timeWindowMs?: number): AuditMetrics {
    const cutoffTime = timeWindowMs 
      ? new Date(Date.now() - timeWindowMs)
      : new Date(0);

    const relevantEvents = this.auditLog.filter(
      event => event.timestamp >= cutoffTime
    );

    const eventsByAction = relevantEvents.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = relevantEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const securityViolations = relevantEvents.filter(
      event => event.action.includes('SECURITY_VIOLATION') || event.action.includes('BLOCKED')
    ).length;

    const adminActions = relevantEvents.filter(
      event => event.action.includes('ADMIN') || 
               event.action.includes('CONFIG') || 
               event.action.includes('FEATURE') ||
               event.action.includes('BRANDING')
    ).length;

    return {
      totalEvents: relevantEvents.length,
      eventsByAction,
      eventsBySeverity,
      securityViolations,
      adminActions,
      recentEvents: relevantEvents.slice(-20),
      timeRange: {
        start: cutoffTime,
        end: new Date()
      }
    };
  }

  /**
   * Get events by action type
   */
  getEventsByAction(action: string, limit = 50): AuditEvent[] {
    return this.auditLog
      .filter(event => event.action === action)
      .slice(-limit);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: string, limit = 50): AuditEvent[] {
    return this.auditLog
      .filter(event => event.severity === severity)
      .slice(-limit);
  }

  /**
   * Get events by client ID
   */
  getEventsByClient(clientId: string, limit = 50): AuditEvent[] {
    return this.auditLog
      .filter(event => event.clientId === clientId)
      .slice(-limit);
  }

  /**
   * Get recent security violations
   */
  getSecurityViolations(limit = 50): AuditEvent[] {
    return this.auditLog
      .filter(event => 
        event.action.includes('SECURITY_VIOLATION') || 
        event.action.includes('BLOCKED') ||
        event.action.includes('SUSPICIOUS')
      )
      .slice(-limit);
  }

  /**
   * Get recent admin actions
   */
  getAdminActions(limit = 50): AuditEvent[] {
    return this.auditLog
      .filter(event => 
        event.action.includes('ADMIN') || 
        event.action.includes('CONFIG') || 
        event.action.includes('FEATURE') ||
        event.action.includes('BRANDING') ||
        event.action.includes('DEPLOYMENT')
      )
      .slice(-limit);
  }

  /**
   * Subscribe to audit events
   */
  onAuditEvent(callback: (event: AuditEvent) => void): () => void {
    this.auditCallbacks.push(callback);
    
    return () => {
      const index = this.auditCallbacks.indexOf(callback);
      if (index > -1) {
        this.auditCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear audit log
   */
  clearLog(): void {
    this.auditLog = [];
  }

  /**
   * Export audit log for compliance
   */
  exportLog(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'action', 'severity', 'clientId', 'userId', 'url', 'details'];
      const csvRows = [
        headers.join(','),
        ...this.auditLog.map(event => [
          event.timestamp.toISOString(),
          event.action,
          event.severity,
          event.clientId,
          event.userId || '',
          event.url || '',
          JSON.stringify(event.details || {}).replace(/"/g, '""')
        ].join(','))
      ];
      return csvRows.join('\n');
    }
    
    return JSON.stringify(this.auditLog, null, 2);
  }

  /**
   * Search audit log
   */
  searchLog(query: {
    action?: string;
    severity?: string;
    clientId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditEvent[] {
    let results = [...this.auditLog];

    if (query.action) {
      results = results.filter(event => 
        event.action.toLowerCase().includes(query.action!.toLowerCase())
      );
    }

    if (query.severity) {
      results = results.filter(event => event.severity === query.severity);
    }

    if (query.clientId) {
      results = results.filter(event => event.clientId === query.clientId);
    }

    if (query.userId) {
      results = results.filter(event => event.userId === query.userId);
    }

    if (query.startDate) {
      results = results.filter(event => event.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter(event => event.timestamp <= query.endDate!);
    }

    const limit = query.limit || 100;
    return results.slice(-limit);
  }

  private addToLog(event: AuditEvent): void {
    this.auditLog.push(event);
    
    // Maintain max log size
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }
  }

  private notifyCallbacks(event: AuditEvent): void {
    this.auditCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (err) {
        console.error('Error in audit callback:', err);
      }
    });
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendToExternalMonitoring(event: AuditEvent): Promise<void> {
    try {
      // This would integrate with external monitoring services
      console.warn('Critical security event:', {
        id: this.generateEventId(),
        action: event.action,
        severity: event.severity,
        clientId: event.clientId,
        timestamp: event.timestamp,
        details: event.details
      });
      
      // In production, send to services like:
      // - Sentry for error tracking
      // - DataDog for monitoring
      // - Splunk for log analysis
      // - Custom webhook for alerts
    } catch (err) {
      console.error('Failed to send audit event to external monitoring:', err);
    }
  }
}

export const auditLogger = new AuditLoggerService();