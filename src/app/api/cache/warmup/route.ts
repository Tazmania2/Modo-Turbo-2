import { NextRequest, NextResponse } from 'next/server';
import { enhancedCacheManager } from '@/services/enhanced-cache-manager.service';

/**
 * POST /api/cache/warmup
 * Trigger cache warmup process
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    await enhancedCacheManager.warmUpCaches();
    
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Cache warmup completed successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error warming up caches:', error);
    return NextResponse.json(
      { 
        error: 'Failed to warm up caches',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}