// Dashboard and User Interface Types

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

export interface DashboardData {
  playerName: string;
  totalPoints: number;
  pointsLocked: boolean;
  currentCycleDay: number;
  totalCycleDays: number;
  primaryGoal: Goal;
  secondaryGoal1: Goal;
  secondaryGoal2: Goal;
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

export interface PerformanceGraph {
  date: string;
  points: number;
  position: number;
}

export interface HistoryData {
  seasons: Season[];
  currentSeasonGraphs: PerformanceGraph[];
}