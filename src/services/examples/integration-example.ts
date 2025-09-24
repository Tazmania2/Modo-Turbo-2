/**
 * Integration Example: Funifier API Services
 * 
 * This example demonstrates how to use the Funifier API services together
 * to authenticate, fetch player data, and manage white-label configurations.
 */

import {
  funifierAuthService,
  funifierPlayerService,
  funifierDatabaseService,
  type LoginRequest,
} from '../index';
import { type FunifierCredentials } from '@/types/funifier';

export class FunifierIntegrationExample {
  /**
   * Complete setup and authentication flow
   */
  async setupAndAuthenticate(
    credentials: FunifierCredentials,
    loginRequest: LoginRequest
  ): Promise<{
    isAuthenticated: boolean;
    isAdmin: boolean;
    playerData: any;
  }> {
    try {
      // 1. Initialize the auth service with Funifier credentials
      funifierAuthService.initialize(credentials);

      // 2. Authenticate the user
      const authResponse = await funifierAuthService.login(loginRequest);
      console.log('Authentication successful:', authResponse.access_token);

      // 3. Verify admin role (if needed)
      const adminVerification = await funifierAuthService.verifyAdminRole();
      console.log('Admin verification:', adminVerification);

      // 4. Get current user data
      const currentUser = await funifierAuthService.getCurrentUser();
      console.log('Current user:', currentUser.name);

      return {
        isAuthenticated: true,
        isAdmin: adminVerification.isAdmin,
        playerData: currentUser,
      };
    } catch (error) {
      console.error('Setup and authentication failed:', error);
      return {
        isAuthenticated: false,
        isAdmin: false,
        playerData: null,
      };
    }
  }

  /**
   * Fetch and display player dashboard data
   */
  async getPlayerDashboard(playerId: string) {
    try {
      // 1. Get player status
      const playerStatus = await funifierPlayerService.getPlayerStatus(playerId);
      console.log('Player Status:', playerStatus);

      // 2. Get player performance data
      const performance = await funifierPlayerService.getPlayerPerformance(playerId);
      console.log('Player Performance:', performance);

      // 3. Get active leaderboards
      const leaderboards = await funifierPlayerService.getLeaderboards({ active: true });
      console.log('Active Leaderboards:', leaderboards.length);

      // 4. Get player's position in first leaderboard
      if (leaderboards.length > 0) {
        const position = await funifierPlayerService.getPlayerPosition(
          leaderboards[0]._id,
          playerId
        );
        console.log('Player Position:', position);

        // 5. Get contextual ranking
        const contextualRanking = await funifierPlayerService.getContextualRanking(
          leaderboards[0]._id,
          playerId
        );
        console.log('Contextual Ranking:', contextualRanking);
      }

      return {
        playerStatus,
        performance,
        leaderboards,
      };
    } catch (error) {
      console.error('Failed to fetch player dashboard:', error);
      throw error;
    }
  }

  /**
   * Setup white-label configuration
   */
  async setupWhiteLabelConfig(instanceId: string) {
    try {
      // 1. Check if white-label collection exists
      const collectionExists = await funifierDatabaseService.collectionExists('whitelabel__c');
      
      if (!collectionExists) {
        // 2. Create the collection if it doesn't exist
        await funifierDatabaseService.createCollection('whitelabel__c');
        console.log('Created whitelabel__c collection');
      }

      // 3. Check if configuration already exists for this instance
      const existingConfig = await funifierDatabaseService.findOne('whitelabel__c', {
        filter: { instanceId },
      });

      if (existingConfig) {
        console.log('Existing configuration found:', existingConfig);
        return existingConfig;
      }

      // 4. Create default white-label configuration
      const defaultConfig = {
        instanceId,
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          accentColor: '#F59E0B',
          logo: '',
          favicon: '',
          companyName: 'Your Company',
          tagline: 'Gamification Platform',
        },
        features: {
          ranking: true,
          dashboards: {
            carteira_i: true,
            carteira_ii: true,
            carteira_iii: false,
            carteira_iv: false,
          },
          history: true,
          personalizedRanking: true,
        },
        funifierIntegration: {
          apiKey: '', // Will be encrypted
          serverUrl: 'https://service2.funifier.com',
          authToken: '', // Will be encrypted
          customCollections: ['whitelabel__c'],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 5. Insert the configuration
      const result = await funifierDatabaseService.insertOne('whitelabel__c', defaultConfig);
      console.log('Created white-label configuration:', result);

      return defaultConfig;
    } catch (error) {
      console.error('Failed to setup white-label configuration:', error);
      throw error;
    }
  }

  /**
   * Update white-label configuration
   */
  async updateWhiteLabelConfig(
    instanceId: string,
    updates: Record<string, unknown>
  ) {
    try {
      // 1. Find existing configuration
      const existingConfig = await funifierDatabaseService.findOne('whitelabel__c', {
        filter: { instanceId },
      });

      if (!existingConfig) {
        throw new Error('Configuration not found for instance: ' + instanceId);
      }

      // 2. Update the configuration
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
      };

      const result = await funifierDatabaseService.updateById(
        'whitelabel__c',
        existingConfig._id,
        updateData
      );

      console.log('Updated white-label configuration:', result);
      return result;
    } catch (error) {
      console.error('Failed to update white-label configuration:', error);
      throw error;
    }
  }

  /**
   * Get team leaderboard data
   */
  async getTeamLeaderboard(teamName: string) {
    try {
      // 1. Get team members
      const teamMembers = await funifierPlayerService.getTeamMembers(teamName);
      console.log(`Team ${teamName} has ${teamMembers.length} members`);

      // 2. Get performance data for all team members
      const memberIds = teamMembers.map(member => member._id);
      const performanceData = await funifierPlayerService.getBatchPlayerPerformance(memberIds);

      // 3. Sort by total points
      const sortedPerformance = performanceData.sort((a, b) => b.totalPoints - a.totalPoints);

      console.log('Team Leaderboard:', sortedPerformance);
      return sortedPerformance;
    } catch (error) {
      console.error('Failed to get team leaderboard:', error);
      throw error;
    }
  }

  /**
   * Validate Funifier credentials
   */
  async validateCredentials(credentials: FunifierCredentials): Promise<boolean> {
    try {
      return await funifierAuthService.validateCredentials(credentials);
    } catch (error) {
      console.error('Credential validation failed:', error);
      return false;
    }
  }

  /**
   * Cleanup and logout
   */
  async cleanup() {
    try {
      await funifierAuthService.logout();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}

// Example usage:
/*
const example = new FunifierIntegrationExample();

// Setup credentials
const credentials: FunifierCredentials = {
  apiKey: 'your-api-key',
  serverUrl: 'https://your-funifier-instance.com',
  authToken: 'your-auth-token',
};

const loginRequest: LoginRequest = {
  username: 'admin@example.com',
  password: 'your-password',
};

// Run the example
async function runExample() {
  try {
    // 1. Setup and authenticate
    const auth = await example.setupAndAuthenticate(credentials, loginRequest);
    
    if (auth.isAuthenticated) {
      // 2. Setup white-label configuration
      await example.setupWhiteLabelConfig('my-company-instance');
      
      // 3. Get player dashboard
      await example.getPlayerDashboard(auth.playerData._id);
      
      // 4. Get team leaderboard (if player has a team)
      if (auth.playerData.teams?.length > 0) {
        await example.getTeamLeaderboard(auth.playerData.teams[0]);
      }
    }
  } catch (error) {
    console.error('Example failed:', error);
  } finally {
    // 5. Cleanup
    await example.cleanup();
  }
}
*/