import { NextRequest, NextResponse } from 'next/server';
import { demoDataService } from '@/services/demo-data.service';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in demo mode
    if (!demoDataService.isDemoMode()) {
      return NextResponse.json(
        { error: 'Demo mode not available' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId') || 'demo_player_1';
    const leaderboardId = searchParams.get('leaderboardId') || 'demo_leaderboard_1';

    // Generate demo ranking data
    const players = demoDataService.generatePlayers(50);
    const leaderboards = demoDataService.generateLeaderboards();
    const raceVisualization = demoDataService.generateRaceVisualization(players);
    const personalCard = demoDataService.generatePersonalCard(playerId, players);
    const contextualRanking = demoDataService.generateContextualRanking(playerId, players);

    return NextResponse.json({
      players: players.slice(0, 20), // Top 20 for performance
      leaderboards,
      raceVisualization,
      personalCard,
      contextualRanking,
      isDemoMode: true,
      message: 'Demo ranking data loaded successfully'
    });

  } catch (error) {
    console.error('Demo ranking error:', error);
    return NextResponse.json(
      { error: 'Failed to load demo ranking data' },
      { status: 500 }
    );
  }
}