import { NextRequest, NextResponse } from 'next/server';
import { rankingIntegrationService } from '@/services/ranking-integration.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const leaderboards = await rankingIntegrationService.getLeaderboards(forceRefresh);

    return NextResponse.json(leaderboards);
  } catch (error) {
    console.error('Failed to fetch leaderboards:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch leaderboards',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}