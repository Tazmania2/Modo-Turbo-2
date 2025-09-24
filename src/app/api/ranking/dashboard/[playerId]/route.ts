import { NextRequest, NextResponse } from 'next/server';
import { rankingIntegrationService } from '@/services/ranking-integration.service';

interface RouteParams {
  params: Promise<{
    playerId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { playerId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const leaderboardId = searchParams.get('leaderboardId') || undefined;
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!playerId) {
      return NextResponse.json(
        { error: 'Missing playerId' },
        { status: 400 }
      );
    }

    const dashboardData = await rankingIntegrationService.getRankingDashboardData(
      playerId,
      leaderboardId,
      forceRefresh
    );

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Failed to fetch ranking dashboard data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch ranking dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}