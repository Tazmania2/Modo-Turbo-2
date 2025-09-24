import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { auditLogger } from '../audit-logger.service';
import { vi } from 'vitest';

describe('AuditLoggerService', () => {
  beforeEach(() => {
    auditLogger.clearLog();
  });

  describe('logSecurityEvent', () => {
    it('should log security events with proper structure', () => {
      const eventId = auditLogger.logSecurityEvent({
        action: 'LOGIN_FAILURE',
        severity: 'medium',
        clientId: '192.168.1.1',
        userId: 'test-user',
        userAgent: 'Mozilla/5.0',
        url: '/api/auth/login',
        method: 'POST',
        details: { reason: 'Invalid credentials' },
        timestamp: new Date()
      });

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^audit_\d+_[a-z0-9]+$/);

      const allEvents = JSON.parse(auditLogger.exportLog('json'));
      expect(allEvents).toHaveLength(1);
      expect(allEvents[0].action).toBe('LOGIN_FAILURE');
      expect(allEvents[0].severity).toBe('medium');
    });

    it('should handle critical security events', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      auditLogger.logSecurityEvent({
        action: 'SECURITY_VIOLATION_DDOS',
        severity: 'critical',
        clientId: '192.168.1.100',
        details: { reason: 'DDoS attack detected' },
        timestamp: new Date()
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Critical security event:',
        expect.objectContaining({
          action: 'SECURITY_VIOLATION_DDOS',
          severity: 'critical'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logAdminAction', () => {
    it('should log admin actions with proper tracking', () => {
      const eventId = auditLogger.logAdminAction({
        action: 'WHITE_LABEL_CONFIG_UPDATE',
        severity: 'medium',
        clientId: '192.168.1.1',
        userId: 'admin-user',
        details: { 
          configType: 'branding',
          changes: { primaryColor: '#ff0000' }
        },
        timestamp: new Date()
      });

      expect(eventId).toBeDefined();

      const adminActions = auditLogger.getAdminActions(10);
      expect(adminActions).toHaveLength(1);
      expect(adminActions[0].action).toBe('WHITE_LABEL_CONFIG_UPDATE');
      expect(adminActions[0].userId).toBe('admin-user');
    });
  });

  describe('getAuditMetrics', () => {
    it('should calculate metrics correctly', () => {
      // Log various events
      auditLogger.logSecurityEvent({
        action: 'SECURITY_VIOLATION_RATE_LIMIT',
        severity: 'high',
        clientId: '192.168.1.1',
        timestamp: new Date()
      });

      auditLogger.logSecurityEvent({
        action: 'SECURITY_VIOLATION_XSS',
        severity: 'critical',
        clientId: '192.168.1.2',
        timestamp: new Date()
      });

      auditLogger.logAdminAction({
        action: 'FEATURE_ENABLED',
        severity: 'medium',
        clientId: '192.168.1.3',
        userId: 'admin',
        timestamp: new Date()
      });

      const metrics = auditLogger.getAuditMetrics();

      expect(metrics.totalEvents).toBe(3);
      expect(metrics.securityViolations).toBe(2);
      expect(metrics.adminActions).toBe(1);
      expect(metrics.eventsBySeverity.high).toBe(1);
      expect(metrics.eventsBySeverity.critical).toBe(1);
      expect(metrics.eventsBySeverity.medium).toBe(1);
    });

    it('should filter events by time window', () => {
      const oldDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const recentDate = new Date();

      auditLogger.logEvent({
        action: 'OLD_EVENT',
        severity: 'low',
        clientId: '192.168.1.1',
        timestamp: oldDate
      });

      auditLogger.logEvent({
        action: 'RECENT_EVENT',
        severity: 'medium',
        clientId: '192.168.1.2',
        timestamp: recentDate
      });

      const metrics = auditLogger.getAuditMetrics(24 * 60 * 60 * 1000); // Last 24 hours

      expect(metrics.totalEvents).toBe(1);
      expect(metrics.recentEvents[0].action).toBe('RECENT_EVENT');
    });
  });

  describe('searchLog', () => {
    beforeEach(() => {
      auditLogger.logSecurityEvent({
        action: 'LOGIN_FAILURE',
        severity: 'medium',
        clientId: '192.168.1.1',
        userId: 'user1',
        timestamp: new Date('2024-01-01T10:00:00Z')
      });

      auditLogger.logSecurityEvent({
        action: 'SECURITY_VIOLATION_XSS',
        severity: 'high',
        clientId: '192.168.1.2',
        userId: 'user2',
        timestamp: new Date('2024-01-02T10:00:00Z')
      });

      auditLogger.logAdminAction({
        action: 'CONFIG_UPDATE',
        severity: 'low',
        clientId: '192.168.1.3',
        userId: 'admin',
        timestamp: new Date('2024-01-03T10:00:00Z')
      });
    });

    it('should search by action', () => {
      const results = auditLogger.searchLog({ action: 'LOGIN' });
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('LOGIN_FAILURE');
    });

    it('should search by severity', () => {
      const results = auditLogger.searchLog({ severity: 'high' });
      expect(results).toHaveLength(1);
      expect(results[0].severity).toBe('high');
    });

    it('should search by client ID', () => {
      const results = auditLogger.searchLog({ clientId: '192.168.1.2' });
      expect(results).toHaveLength(1);
      expect(results[0].clientId).toBe('192.168.1.2');
    });

    it('should search by date range', () => {
      const results = auditLogger.searchLog({
        startDate: new Date('2024-01-02T00:00:00Z'),
        endDate: new Date('2024-01-03T23:59:59Z')
      });
      expect(results).toHaveLength(2);
    });

    it('should limit results', () => {
      const results = auditLogger.searchLog({ limit: 2 });
      expect(results).toHaveLength(2);
    });
  });

  describe('exportLog', () => {
    beforeEach(() => {
      auditLogger.logEvent({
        action: 'TEST_EVENT',
        severity: 'low',
        clientId: '192.168.1.1',
        userId: 'test-user',
        url: '/test',
        details: { test: true },
        timestamp: new Date('2024-01-01T10:00:00Z')
      });
    });

    it('should export as JSON', () => {
      const exported = auditLogger.exportLog('json');
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].action).toBe('TEST_EVENT');
    });

    it('should export as CSV', () => {
      const exported = auditLogger.exportLog('csv');
      const lines = exported.split('\n');
      
      expect(lines[0]).toContain('timestamp,action,severity,clientId');
      expect(lines[1]).toContain('TEST_EVENT');
      expect(lines[1]).toContain('low');
      expect(lines[1]).toContain('192.168.1.1');
    });
  });

  describe('event callbacks', () => {
    it('should notify callbacks when events are logged', () => {
      const callback = vi.fn();
      const unsubscribe = auditLogger.onAuditEvent(callback);

      auditLogger.logEvent({
        action: 'TEST_EVENT',
        severity: 'low',
        clientId: '192.168.1.1',
        timestamp: new Date()
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEST_EVENT',
          severity: 'low'
        })
      );

      unsubscribe();

      auditLogger.logEvent({
        action: 'ANOTHER_EVENT',
        severity: 'medium',
        clientId: '192.168.1.2',
        timestamp: new Date()
      });

      expect(callback).toHaveBeenCalledTimes(1); // Should not be called after unsubscribe
    });

    it('should handle callback errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const faultyCallback = vi.fn(() => {
        throw new Error('Callback error');
      });

      auditLogger.onAuditEvent(faultyCallback);

      auditLogger.logEvent({
        action: 'TEST_EVENT',
        severity: 'low',
        clientId: '192.168.1.1',
        timestamp: new Date()
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in audit callback:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('log size management', () => {
    it('should maintain maximum log size', () => {
      // Set a smaller max size for testing
      const originalMaxSize = (auditLogger as any).maxLogSize;
      (auditLogger as any).maxLogSize = 5;

      // Add more events than the max size
      for (let i = 0; i < 10; i++) {
        auditLogger.logEvent({
          action: `EVENT_${i}`,
          severity: 'low',
          clientId: '192.168.1.1',
          timestamp: new Date()
        });
      }

      const allEvents = auditLogger.exportLog('json');
      const parsed = JSON.parse(allEvents);
      
      expect(parsed).toHaveLength(5);
      expect(parsed[0].action).toBe('EVENT_5'); // Should keep the most recent events

      // Restore original max size
      (auditLogger as any).maxLogSize = originalMaxSize;
    });
  });
});