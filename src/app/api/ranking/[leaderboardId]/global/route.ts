import { NextRequest, NextResponse } from 'next/server';
import { rankingIntegrationService } from '@/services/ranking-integration.service';

interface RouteParams {
  params: Promise<{
    leaderboardId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { leaderboardId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!leaderboardId) {
      return NextResponse.json(
        { error: 'Missing leaderboardId' },
        { status: 400 }
      );
    }

    const globalRanking = await rankingIntegrationService.getGlobalRanking(
      leaderboardId,
      forceRefresh
    );

    return NextResponse.json(globalRanking);
  } catch (error) {
    console.error('Failed to fetch global ranking:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch global ranking',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}