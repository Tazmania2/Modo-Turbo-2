import { NextRequest, NextResponse } from 'next/server';
import { HistoryService } from '../../../../../services/history.service';
import { validateAuth } from '../../../../../middleware/auth';

const historyService = new HistoryService();

/**
 * GET /api/dashboard/history/[playerId]
 * Retrieves complete history data for a player including seasons and performance graphs
 * Implements requirement 3.1: Display historical data and current season performance graphs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId } = await params;
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { playerId } = params;

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Fetch history data
    const historyData = await historyService.getPlayerHistoryData(playerId);

    // Check if any data was found
    if (historyData.seasons.length === 0 && historyData.currentSeasonGraphs.length === 0) {
      // Requirement 3.4: Indicate missing data period
      return NextResponse.json({
        seasons: [],
        currentSeasonGraphs: [],
        message: 'No historical data available for this player'
      });
    }

    return NextResponse.json(historyData);
  } catch (error) {
    console.error('Error in history API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch history data'
      },
      { status: 500 }
    );
  }
}