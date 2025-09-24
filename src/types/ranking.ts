// Ranking System Types

export interface Player {
  _id: string;
  name: string;
  points: number;
  position: number;
  previousPosition?: number;
  avatar?: string;
  team: string;
  pointsGainedToday?: number;
}

export interface RaceVisualization {
  totalDistance: number;
  players: Array<{
    player: Player;
    distanceCompleted: number;
    percentageCompleted: number;
  }>;
}

export interface PersonalCard {
  player: Player;
  stats: {
    totalPoints: number;
    currentPosition: number;
    pointsToNext?: number;
    streak?: number;
  };
}

export interface ContextualRanking {
  above: Player | null;
  current: Player;
  below: Player | null;
}

export interface LeaderboardsResponse {
  leaderboards: Array<{
    _id: string;
    name: string;
    description?: string;
    type: string;
    active: boolean;
  }>;
}

export interface PersonalRankingResponse {
  raceData: RaceVisualization;
  personalCard: PersonalCard;
  topThree: Player[];
  contextualRanking: ContextualRanking;
}

export interface GlobalRankingResponse {
  raceData: RaceVisualization;
  fullRanking: Player[];
}