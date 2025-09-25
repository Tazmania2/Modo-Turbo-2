import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { handleApiError } from '@/middleware/error-handler';
import { dashboardProcessorService } from '@/services/dashboard-processor.service';

type RouteParams = {
  params: Promise<{ playerId: string }>;
};

/**
 * GET /api/dashboard/player/[playerId]
 * Retrieves dashboard data for a specific player
 * Implements requirements 1.1, 1.2, 1.3: Display personal dashboard metrics
 */
async function handler(request: NextRequest, { params }: RouteParams) {
  const { playerId } = await params;
  
  try {
    // Validate player ID parameter
    if (!playerId || typeof playerId !== 'string') {
      return NextResponse.json(
        { error: 'Valid player ID is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const dashboardType = searchParams.get('type') || 'default';

    // Fetch dashboard data
    const dashboardData = await dashboardProcessorService.processDashboardData({
      playerId,
      dashboardType: dashboardType !== 'default' ? dashboardType : undefined,
      includeHistory: false,
      cacheTTL: forceRefresh ? 0 : undefined
    });

    // Check if player exists
    if (!dashboardData) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(dashboardData);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch dashboard data');
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => handler(req, context));
}