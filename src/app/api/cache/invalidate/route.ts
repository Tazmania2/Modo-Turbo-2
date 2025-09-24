import { NextRequest, NextResponse } from 'next/server';
import { enhancedCacheManager } from '@/services/enhanced-cache-manager.service';
import { z } from 'zod';

const InvalidationRequestSchema = z.object({
  type: z.enum(['player_update', 'team_change', 'leaderboard_update', 'config_change', 'manual']),
  scope: z.enum(['global', 'player', 'team', 'leaderboard', 'config']),
  identifier: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * POST /api/cache/invalidate
 * Invalidate cache entries based on scope and type
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = InvalidationRequestSchema.parse(body);

    const invalidationEvent = {
      type: validatedData.type,
      scope: validatedData.scope,
      identifier: validatedData.identifier,
      metadata: validatedData.metadata,
      timestamp: new Date()
    };

    await enhancedCacheManager.invalidate(invalidationEvent);

    return NextResponse.json({
      success: true,
      message: `Cache invalidation triggered for ${validatedData.scope}${validatedData.identifier ? `: ${validatedData.identifier}` : ''}`,
      event: invalidationEvent
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache/invalidate
 * Clear all caches
 */
export async function DELETE(request: NextRequest) {
  try {
    await enhancedCacheManager.clearAllCaches();

    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing caches:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear caches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}