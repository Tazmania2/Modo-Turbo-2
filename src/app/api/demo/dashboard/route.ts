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

    // Generate demo dashboard data
    const playerStatus = demoDataService.generatePlayerStatus(playerId);
    const players = demoDataService.generatePlayers(50);
    const currentPlayer = players.find(p => p._id === playerId) || players[0];

    return NextResponse.json({
      playerStatus,
      currentPlayer,
      isDemoMode: true,
      message: 'Demo dashboard data loaded successfully'
    });

  } catch (error) {
    console.error('Demo dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load demo dashboard data' },
      { status: 500 }
    );
  }
}