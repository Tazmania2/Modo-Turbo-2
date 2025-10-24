import { 
  FunifierPlayerStatus, 
  Goal, 
  Season, 
  Leaderboard,
  Player,
  RaceVisualization,
  PersonalCard
} from '@/types/funifier';
import { PerformanceGraph } from '@/types/dashboard';
import { demoModeService } from './demo-mode.service';

/**
 * Service for generating demo data for the white-label platform
 * IMPORTANT: This service should ONLY be used when demo mode is active
 */
export class DemoDataService {
  private static instance: DemoDataService;

  private constructor() {}

  static getInstance(): DemoDataService {
    if (!DemoDataService.instance) {
      DemoDataService.instance = new DemoDataService();
    }
    return DemoDataService.instance;
  }

  /**
   * Check if the app is running in demo mode
   * @deprecated Use demoModeService.isDemoMode() instead
   */
  isDemoMode(): boolean {
    return demoModeService.isDemoMode();
  }

  /**
   * Simulate demo authentication
   */
  async authenticateDemo(username: string, password: string): Promise<{ 
    access_token: string; 
    token_type: string;
    expires_in: number;
    user_type: 'admin' | 'player';
  }> {
    // Simple demo authentication - accept specific demo credentials
    const validCredentials = {
      'demo': { password: 'demo', type: 'player' as const },
      'admin': { password: 'admin', type: 'admin' as const },
      'player1': { password: 'demo', type: 'player' as const },
      'player2': { password: 'demo', type: 'player' as const }
    };

    const credential = validCredentials[username as keyof typeof validCredentials];
    
    if (!credential || credential.password !== password) {
      throw new Error('Invalid demo credentials. Use "demo/demo", "admin/admin", or "player1/demo"');
    }

    return {
      access_token: `demo_token_${username}_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 3600,
      user_type: credential.type
    };
  }

  /**
   * Generate demo players with realistic data
   */
  generatePlayers(count: number = 50): Player[] {
    const names = [
      'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown',
      'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Ivy Chen', 'Jack Anderson',
      'Kate Thompson', 'Liam Garcia', 'Maya Patel', 'Noah Martinez', 'Olivia Rodriguez',
      'Paul Jackson', 'Quinn White', 'Ruby Harris', 'Sam Clark', 'Tina Lewis',
      'Uma Walker', 'Victor Hall', 'Wendy Allen', 'Xavier Young', 'Yara King',
      'Zoe Wright', 'Alex Green', 'Blake Adams', 'Chloe Baker', 'Dylan Cooper'
    ];

    const teams = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
    const avatars = [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=',
      'https://api.dicebear.com/7.x/personas/svg?seed=',
      'https://api.dicebear.com/7.x/initials/svg?seed='
    ];

    return Array.from({ length: count }, (_, index) => {
      const name = names[index % names.length] || `Player ${index + 1}`;
      const basePoints = Math.floor(Math.random() * 5000) + 1000;
      const todayGain = Math.floor(Math.random() * 200) + 10;
      
      return {
        _id: `demo_player_${index + 1}`,
        name,
        totalPoints: basePoints,
        position: index + 1,
        previousPosition: index + 1 + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3),
        pointsGainedToday: todayGain,
        avatar: `${avatars[index % avatars.length]}${name.replace(' ', '')}`,
        team: teams[index % teams.length],
        goals: this.generateGoalsForPlayer(),
        lastUpdated: new Date()
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints)
      .map((player, index) => ({ ...player, position: index + 1 }));
  }

  /**
   * Generate demo leaderboards
   */
  generateLeaderboards(): Leaderboard[] {
    return [
      {
        _id: 'demo_leaderboard_1',
        name: 'Monthly Challenge',
        description: 'Complete monthly goals and earn points',
        type: 'points',
        period: 'monthly',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        isActive: true,
        participants: 50,
        maxParticipants: 100
      },
      {
        _id: 'demo_leaderboard_2',
        name: 'Weekly Sprint',
        description: 'Weekly performance tracking',
        type: 'achievements',
        period: 'weekly',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        isActive: true,
        participants: 35,
        maxParticipants: 50
      }
    ];
  }

  /**
   * Generate season history for a player
   */
  generateSeasonHistory(_playerId: string): Season[] {
    const seasons = [
      { name: 'Q1 2024', months: 3 },
      { name: 'Q2 2024', months: 3 },
      { name: 'Q3 2024', months: 3 }
    ];

    return seasons.map((season, index) => {
      const basePoints = Math.floor(Math.random() * 3000) + 1500;
      const finalPosition = Math.floor(Math.random() * 20) + 1;

      return {
        _id: `demo_season_${index + 1}`,
        name: season.name,
        startDate: new Date(2024, index * 3, 1),
        endDate: new Date(2024, (index + 1) * 3, 0),
        playerStats: {
          totalPoints: basePoints,
          finalPosition,
          achievements: this.generateAchievements(basePoints),
          goals: this.generateGoalsForPlayer()
        }
      };
    });
  }

  /**
   * Generate current season performance graphs
   */
  generateCurrentSeasonPerformanceGraphs(_playerId: string): PerformanceGraph[] {
    const days = 30; // Last 30 days
    const graphs: PerformanceGraph[] = [];
    
    let currentPoints = Math.floor(Math.random() * 1000) + 500;
    let currentPosition = Math.floor(Math.random() * 10) + 1;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate realistic progression
      const pointsGain = Math.floor(Math.random() * 100) + 10;
      currentPoints += pointsGain;
      
      // Position can fluctuate but generally improves with more points
      const positionChange = Math.random() > 0.6 ? (Math.random() > 0.5 ? -1 : 1) : 0;
      currentPosition = Math.max(1, Math.min(50, currentPosition + positionChange));
      
      graphs.push({
        date: date.toISOString().split('T')[0],
        points: currentPoints,
        position: currentPosition
      });
    }
    
    return graphs;
  }

  /**
   * Generate demo player status (for dashboard)
   */
  generatePlayerStatus(playerId: string): FunifierPlayerStatus {
    const totalPoints = Math.floor(Math.random() * 5000) + 1000;
    const levelProgress = Math.floor(Math.random() * 100);

    return {
      _id: playerId,
      name: `Demo Player ${playerId.slice(-2)}`,
      image: {
        small: {
          url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`,
          size: 1024,
          width: 32,
          height: 32,
          depth: 24
        },
        medium: {
          url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`,
          size: 4096,
          width: 64,
          height: 64,
          depth: 24
        },
        original: {
          url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}`,
          size: 16384,
          width: 128,
          height: 128,
          depth: 24
        }
      },
      total_challenges: Math.floor(Math.random() * 50) + 10,
      challenges: {
        'daily_tasks': Math.floor(Math.random() * 20) + 5,
        'weekly_goals': Math.floor(Math.random() * 10) + 2,
        'monthly_objectives': Math.floor(Math.random() * 5) + 1
      },
      total_points: totalPoints,
      point_categories: {
        'performance': Math.floor(totalPoints * 0.4),
        'collaboration': Math.floor(totalPoints * 0.3),
        'innovation': Math.floor(totalPoints * 0.2),
        'bonus': Math.floor(totalPoints * 0.1)
      },
      total_catalog_items: Math.floor(Math.random() * 20) + 5,
      catalog_items: {
        'badges': Math.floor(Math.random() * 10) + 2,
        'achievements': Math.floor(Math.random() * 8) + 1,
        'rewards': Math.floor(Math.random() * 5) + 1
      },
      level_progress: {
        percent_completed: levelProgress,
        next_points: Math.floor((100 - levelProgress) * 50),
        total_levels: 20,
        percent: levelProgress / 100
      },
      challenge_progress: [],
      teams: ['Demo Team Alpha'],
      positions: [],
      time: Date.now(),
      extra: {
        currentStreak: Math.floor(Math.random() * 15) + 1,
        longestStreak: Math.floor(Math.random() * 30) + 10,
        lastActivity: Date.now() - Math.floor(Math.random() * 86400000) // Within last 24 hours
      },
      pointCategories: {
        'performance': Math.floor(totalPoints * 0.4),
        'collaboration': Math.floor(totalPoints * 0.3),
        'innovation': Math.floor(totalPoints * 0.2),
        'bonus': Math.floor(totalPoints * 0.1)
      }
    };
  }

  /**
   * Generate race visualization data
   */
  generateRaceVisualization(players: Player[]): RaceVisualization {
    const topPlayers = players.slice(0, 10);
    const maxPoints = topPlayers[0]?.totalPoints || 5000;

    return {
      raceTrack: {
        length: 1000,
        segments: 10,
        theme: 'racing'
      },
      participants: topPlayers.map((player, index) => ({
        playerId: player._id,
        playerName: player.name,
        avatar: player.avatar,
        position: {
          x: (player.totalPoints / maxPoints) * 900 + 50, // Position on track
          y: 50 + (index * 40), // Vertical spacing
          progress: (player.totalPoints / maxPoints) * 100
        },
        vehicle: {
          type: 'car',
          color: this.getTeamColor(player.team),
          speed: Math.random() * 5 + 1
        },
        isCurrentUser: false // Will be set by the calling component
      })),
      animations: {
        enabled: true,
        speed: 1.5,
        effects: ['dust', 'speed_lines']
      }
    };
  }

  /**
   * Generate personal card data
   */
  generatePersonalCard(playerId: string, players: Player[]): PersonalCard {
    const player = players.find(p => p._id === playerId) || players[0];
    
    return {
      playerId: player._id,
      playerName: player.name,
      avatar: player.avatar,
      currentPosition: player.position,
      previousPosition: player.previousPosition,
      totalPoints: player.totalPoints,
      pointsGainedToday: player.pointsGainedToday,
      team: player.team,
      level: Math.floor(player.totalPoints / 500) + 1,
      nextLevelPoints: ((Math.floor(player.totalPoints / 500) + 1) * 500) - player.totalPoints,
      achievements: this.generateAchievements(player.totalPoints),
      streaks: {
        current: Math.floor(Math.random() * 15) + 1,
        longest: Math.floor(Math.random() * 30) + 10
      },
      lastActivity: new Date(Date.now() - Math.floor(Math.random() * 86400000))
    };
  }

  /**
   * Generate contextual ranking (top 3 + user context)
   */
  generateContextualRanking(playerId: string, players: Player[]): {
    topThree: Player[];
    contextual: {
      above: Player | null;
      current: Player;
      below: Player | null;
    };
  } {
    const currentPlayer = players.find(p => p._id === playerId) || players[0];
    const currentIndex = players.findIndex(p => p._id === playerId);
    
    return {
      topThree: players.slice(0, 3),
      contextual: {
        above: currentIndex > 0 ? players[currentIndex - 1] : null,
        current: currentPlayer,
        below: currentIndex < players.length - 1 ? players[currentIndex + 1] : null
      }
    };
  }

  // Private helper methods

  private generateGoalsForPlayer(): Goal[] {
    const goalTemplates = [
      { name: 'Daily Tasks', emoji: '✅', unit: 'tasks' },
      { name: 'Team Collaboration', emoji: '🤝', unit: 'interactions' },
      { name: 'Skill Development', emoji: '📚', unit: 'hours' },
      { name: 'Innovation Points', emoji: '💡', unit: 'ideas' }
    ];

    return goalTemplates.map(template => {
      const target = Math.floor(Math.random() * 20) + 5;
      const current = Math.floor(Math.random() * target);
      const percentage = Math.floor((current / target) * 100);

      return {
        name: template.name,
        percentage,
        description: `Complete ${target} ${template.unit} this period`,
        emoji: template.emoji,
        target,
        current,
        unit: template.unit,
        hasBoost: Math.random() > 0.7,
        isBoostActive: Math.random() > 0.5,
        daysRemaining: Math.floor(Math.random() * 7) + 1
      };
    });
  }

  private generateAchievements(totalPoints: number): string[] {
    const allAchievements = [
      'First Steps', 'Team Player', 'Consistent Performer', 'Goal Crusher',
      'Innovation Leader', 'Collaboration Master', 'Streak Champion', 'Point Collector',
      'Challenge Accepted', 'Rising Star', 'Veteran Player', 'Elite Performer'
    ];

    const achievementCount = Math.min(
      Math.floor(totalPoints / 500) + 2,
      allAchievements.length
    );

    return allAchievements.slice(0, achievementCount);
  }

  private getTeamColor(team: string): string {
    const teamColors: Record<string, string> = {
      'Alpha': '#3B82F6',
      'Beta': '#10B981',
      'Gamma': '#F59E0B',
      'Delta': '#EF4444',
      'Epsilon': '#8B5CF6'
    };

    return teamColors[team] || '#6B7280';
  }
}

// Export singleton instance
export const demoDataService = DemoDataService.getInstance();