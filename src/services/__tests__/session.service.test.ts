import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';
import { sessionService, SessionService } from '../session.service';
import { FunifierPlayerStatus } from '@/types/funifier';

// Mock player data
const mockPlayerData: FunifierPlayerStatus = {
  _id: 'player123',
  name: 'Test User',
  total_challenges: 5,
  challenges: {},
  total_points: 1000,
  point_categories: {},
  total_catalog_items: 0,
  catalog_items: {},
  level_progress: {
    percent_completed: 50,
    next_points: 500,
    total_levels: 10,
    percent: 50,
  },
  challenge_progress: [],
  teams: ['team1'],
  positions: [],
  time: Date.now(),
  extra: {},
  pointCategories: {},
};

const mockMetadata = {
  userAgent: 'test-agent',
  ip: '127.0.0.1',
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    // Create a new instance for each test to avoid state pollution
    service = new (SessionService as any)();
  });

  describe('createSession', () => {
    it('should create a new session with correct data', () => {
      const roles = ['user', 'admin'];
      const session = service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        roles,
        mockMetadata
      );

      expect(session.userId).toBe(mockPlayerData._id);
      expect(session.userName).toBe(mockPlayerData.name);
      expect(session.roles).toEqual(roles);
      expect(session.isAdmin).toBe(true);
      expect(session.metadata).toEqual(mockMetadata);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActivity).toBeGreaterThan(0);
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);
    });

    it('should set isAdmin to false when admin role is not present', () => {
      const roles = ['user'];
      const session = service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        roles,
        mockMetadata
      );

      expect(session.isAdmin).toBe(false);
    });
  });

  describe('getSession', () => {
    it('should return session if it exists and is not expired', () => {
      const roles = ['user'];
      const createdSession = service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        roles,
        mockMetadata
      );

      const retrievedSession = service.getSession(mockPlayerData._id);

      expect(retrievedSession).toEqual(createdSession);
    });

    it('should return null if session does not exist', () => {
      const session = service.getSession('nonexistent');
      expect(session).toBeNull();
    });

    it('should return null and remove session if it is expired', () => {
      // Create session with very short expiration
      const session = service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user'],
        mockMetadata,
        { maxAge: -1 } // Already expired
      );

      const retrievedSession = service.getSession(mockPlayerData._id);
      expect(retrievedSession).toBeNull();
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp', async () => {
      service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user'],
        mockMetadata
      );

      const originalSession = service.getSession(mockPlayerData._id);
      const originalActivity = originalSession!.lastActivity;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = service.updateActivity(mockPlayerData._id);
      expect(updated).toBe(true);

      const updatedSession = service.getSession(mockPlayerData._id);
      expect(updatedSession!.lastActivity).toBeGreaterThan(originalActivity);
    });

    it('should return false for non-existent session', () => {
      const updated = service.updateActivity('nonexistent');
      expect(updated).toBe(false);
    });
  });

  describe('validateSession', () => {
    it('should return true for valid session', () => {
      service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user'],
        mockMetadata
      );

      const isValid = service.validateSession(mockPlayerData._id);
      expect(isValid).toBe(true);
    });

    it('should return false for non-existent session', () => {
      const isValid = service.validateSession('nonexistent');
      expect(isValid).toBe(false);
    });

    it('should return false and destroy session if inactive too long', () => {
      const session = service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user'],
        mockMetadata,
        { maxInactivity: 1 } // 1 second inactivity timeout
      );

      // Manually set lastActivity to be older than maxInactivity
      session.lastActivity = Date.now() - 2000; // 2 seconds ago

      const isValid = service.validateSession(mockPlayerData._id);
      expect(isValid).toBe(false);

      // Session should be destroyed
      const retrievedSession = service.getSession(mockPlayerData._id);
      expect(retrievedSession).toBeNull();
    });
  });

  describe('destroySession', () => {
    it('should remove session and return true', () => {
      service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user'],
        mockMetadata
      );

      const destroyed = service.destroySession(mockPlayerData._id);
      expect(destroyed).toBe(true);

      const session = service.getSession(mockPlayerData._id);
      expect(session).toBeNull();
    });

    it('should return false for non-existent session', () => {
      const destroyed = service.destroySession('nonexistent');
      expect(destroyed).toBe(false);
    });
  });

  describe('hasAdminSession', () => {
    it('should return true for admin session', () => {
      service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user', 'admin'],
        mockMetadata
      );

      const hasAdmin = service.hasAdminSession(mockPlayerData._id);
      expect(hasAdmin).toBe(true);
    });

    it('should return false for non-admin session', () => {
      service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user'],
        mockMetadata
      );

      const hasAdmin = service.hasAdminSession(mockPlayerData._id);
      expect(hasAdmin).toBe(false);
    });

    it('should return false for non-existent session', () => {
      const hasAdmin = service.hasAdminSession('nonexistent');
      expect(hasAdmin).toBe(false);
    });
  });

  describe('updateUserRoles', () => {
    it('should update user roles and admin status', () => {
      service.createSession(
        mockPlayerData._id,
        mockPlayerData,
        ['user'],
        mockMetadata
      );

      const newRoles = ['user', 'admin', 'moderator'];
      const updated = service.updateUserRoles(mockPlayerData._id, newRoles);
      expect(updated).toBe(true);

      const session = service.getSession(mockPlayerData._id);
      expect(session!.roles).toEqual(newRoles);
      expect(session!.isAdmin).toBe(true);
    });

    it('should return false for non-existent session', () => {
      const updated = service.updateUserRoles('nonexistent', ['admin']);
      expect(updated).toBe(false);
    });
  });

  describe('getSessionStats', () => {
    it('should return correct session statistics', () => {
      // Create multiple sessions
      service.createSession('user1', mockPlayerData, ['user'], mockMetadata);
      service.createSession('user2', mockPlayerData, ['user', 'admin'], mockMetadata);
      service.createSession('user3', mockPlayerData, ['user'], mockMetadata, { maxAge: -1 }); // Expired

      const stats = service.getSessionStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.admin).toBe(1);
      expect(stats.expired).toBe(1);
    });
  });
});