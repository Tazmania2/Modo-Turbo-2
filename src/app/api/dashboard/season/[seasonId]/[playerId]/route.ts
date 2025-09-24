import { NextRequest, NextResponse } from 'next/server';
import { HistoryService } from '../../../../../../services/history.service';
import { validateAuth } from '../../../../../../middleware/auth';

const historyService = new HistoryService();

/**
 * GET /api/dashboard/season/[seasonId]/[playerId]
 * Retrieves detailed information for a specific season and player
 * Implements requirement 3.2: Show season-specific metrics and achievements
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; playerId: string }> }
) {
  const { seasonId, playerId } = await params;
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { seasonId, playerId  } = await params;

    if (!seasonId || !playerId) {
      return NextResponse.json(
        { error: 'Season ID and Player ID are required' },
        { status: 400 }
      );
    }

    // Fetch season details
    const seasonDetails = await historyService.getSeasonDetails(seasonId, playerId);

    if (!seasonDetails) {
      // Requirement 3.4: Indicate missing data period
      return NextResponse.json(
        { 
          error: 'Season not found',
          message: 'No data available for this season and player combination'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(seasonDetails);
  } catch (error) {
    console.error('Error in season details API:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch season details'
      },
      { status: 500 }
    );
  }
}