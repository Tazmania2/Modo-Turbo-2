import { NextResponse } from 'next/server';

interface PerformanceAlert {
  id: string;
  type: 'regression' | 'improvement' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
}

// In-memory storage for demo purposes
// In production, this would be stored in a database
let alerts: PerformanceAlert[] = [];

// Initialize with some sample alerts
if (alerts.length === 0) {
  alerts = [
    {
      id: '1',
      type: 'regression',
      severity: 'high',
      message: 'Bundle size increased by 15% in the last hour',
      timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      metric: 'bundleSize',
      value: 2.3 * 1024 * 1024, // 2.3MB
      threshold: 2 * 1024 * 1024 // 2MB threshold
    },
    {
      id: '2',
      type: 'warning',
      severity: 'medium',
      message: 'Memory usage approaching 80% of available memory',
      timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      metric: 'memoryUsage',
      value: 75 * 1024 * 1024, // 75MB
      threshold: 80 * 1024 * 1024 // 80MB threshold
    },
    {
      id: '3',
      type: 'regression',
      severity: 'medium',
      message: 'Load time increased to 2.1s (target: <2s)',
      timestamp: Date.now() - 45 * 60 * 1000, // 45 minutes ago
      metric: 'loadTime',
      value: 2100, // 2.1s
      threshold: 2000 // 2s threshold
    },
    {
      id: '4',
      type: 'improvement',
      severity: 'low',
      message: 'CPU usage decreased by 10% after optimization',
      timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago
      metric: 'cpuUsage',
      value: 20, // 20%
      threshold: 30 // 30% threshold
    },
    {
      id: '5',
      type: 'warning',
      severity: 'critical',
      message: 'Render time exceeded 1.5s threshold',
      timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      metric: 'renderTime',
      value: 1800, // 1.8s
      threshold: 1500 // 1.5s threshold
    }
  ];
}

export async function GET() {
  try {
    // Sort alerts by timestamp (newest first)
    const sortedAlerts = alerts.sort((a, b) => b.timestamp - a.timestamp);
    
    return NextResponse.json({ 
      alerts: sortedAlerts,
      count: sortedAlerts.length
    });
  } catch (error) {
    console.error('Performance alerts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const alert: Omit<PerformanceAlert, 'id'> = await request.json();
    
    const newAlert: PerformanceAlert = {
      ...alert,
      id: Date.now().toString(),
      timestamp: alert.timestamp || Date.now()
    };
    
    alerts.unshift(newAlert);
    
    // Keep only the last 100 alerts to prevent memory issues
    if (alerts.length > 100) {
      alerts = alerts.slice(0, 100);
    }
    
    return NextResponse.json({ 
      alert: newAlert,
      message: 'Alert created successfully'
    });
  } catch (error) {
    console.error('Failed to create performance alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    
    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }
    
    const initialLength = alerts.length;
    alerts = alerts.filter(alert => alert.id !== alertId);
    
    if (alerts.length === initialLength) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete performance alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}