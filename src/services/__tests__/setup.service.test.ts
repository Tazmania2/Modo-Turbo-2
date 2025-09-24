import { describe, it, expect } from 'vitest';
import { setupService } from '../setup.service';
import { SetupRequest } from '@/types/white-label';

describe('SetupService', () => {
  describe('handleSetup - validation', () => {
    it('should fail with invalid setup request', async () => {
      const request: SetupRequest = {
        mode: 'funifier'
        // Missing funifierCredentials
      };

      const result = await setupService.handleSetup(request);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Funifier credentials are required for Funifier mode');
    });
  });

  describe('validateFunifierCredentials', () => {
    it('should fail validation with missing credentials', async () => {
      const credentials = {
        apiKey: '',
        serverUrl: 'https://service2.funifier.com',
        authToken: 'test-auth-token'
      };

      const result = await setupService.validateFunifierCredentials(credentials);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All credentials are required');
    });

    it('should fail validation with invalid URL', async () => {
      const credentials = {
        apiKey: 'test-api-key',
        serverUrl: 'invalid-url',
        authToken: 'test-auth-token'
      };

      const result = await setupService.validateFunifierCredentials(credentials);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid server URL format');
    });
  });

  describe('needsSetup', () => {
    it('should return true when no instance ID is provided', async () => {
      const result = await setupService.needsSetup();
      expect(result).toBe(true);
    });

    it('should return true when configuration does not exist', async () => {
      const result = await setupService.needsSetup('non-existent-instance');
      expect(result).toBe(true);
    });
  });

  describe('generateDemoData', () => {
    it('should generate demo data with all required components', () => {
      const demoData = setupService.generateDemoData();

      expect(demoData.players).toBeDefined();
      expect(demoData.leaderboards).toBeDefined();
      expect(demoData.samplePlayerStatus).toBeDefined();
      expect(demoData.seasonHistory).toBeDefined();

      expect(Array.isArray(demoData.players)).toBe(true);
      expect(Array.isArray(demoData.leaderboards)).toBe(true);
      expect(Array.isArray(demoData.seasonHistory)).toBe(true);

      expect(demoData.players.length).toBeGreaterThan(0);
      expect(demoData.leaderboards.length).toBeGreaterThan(0);
      expect(demoData.seasonHistory.length).toBeGreaterThan(0);
    });

    it('should generate players with required properties', () => {
      const demoData = setupService.generateDemoData();
      const player = demoData.players[0];

      expect(player._id).toBeDefined();
      expect(player.name).toBeDefined();
      expect(player.totalPoints).toBeDefined();
      expect(player.position).toBeDefined();
      expect(player.team).toBeDefined();
      expect(Array.isArray(player.goals)).toBe(true);
    });
  });
});