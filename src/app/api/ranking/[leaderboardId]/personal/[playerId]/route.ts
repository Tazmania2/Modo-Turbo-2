import { NextRequest, NextResponse } from 'next/server';
import { rankingIntegrationService } from '@/services/ranking-integration.service';

type RouteParams = {
  params: Promise<{ leaderboardId: string; playerId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { leaderboardId, playerId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!leaderboardId || !playerId) {
      return NextResponse.json(
        { error: 'Missing leaderboardId or playerId' },
        { status: 400 }
      );
    }

    const personalRanking = await rankingIntegrationService.getPersonalRanking(
      leaderboardId,
      playerId,
      forceRefresh
    );

    return NextResponse.json(personalRanking);
  } catch (error) {
    console.error('Failed to fetch personal ranking:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch personal ranking',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}