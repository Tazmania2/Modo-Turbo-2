import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/services/performance-monitor.service';

/**
 * PATCH /api/performance/alerts/[alertId]
 * Resolve a performance alert
 */
export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const { alertId } = await params;
    
    const success = performanceMonitor.resolveAlert(alertId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Alert ${alertId} resolved successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { 
        error: 'Failed to resolve alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}