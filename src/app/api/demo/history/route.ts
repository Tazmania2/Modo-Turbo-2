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

    // Generate demo history data
    const seasonHistory = demoDataService.generateSeasonHistory(playerId);
    const performanceGraphs = demoDataService.generateCurrentSeasonPerformanceGraphs(playerId);

    return NextResponse.json({
      seasonHistory,
      performanceGraphs,
      currentSeason: {
        name: 'Q4 2024',
        startDate: new Date(2024, 9, 1),
        endDate: new Date(2024, 11, 31),
        isActive: true
      },
      isDemoMode: true,
      message: 'Demo history data loaded successfully'
    });

  } catch (error) {
    console.error('Demo history error:', error);
    return NextResponse.json(
      { error: 'Failed to load demo history data' },
      { status: 500 }
    );
  }
}