import { NextResponse } from 'next/server';

interface PerformanceTrend {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  period: string;
}

// In-memory storage for demo purposes
// In production, this would be calculated from historical data
let trends: PerformanceTrend[] = [];

// Initialize with sample trends
if (trends.length === 0) {
  trends = [
    {
      metric: 'Bundle Size',
      trend: 'increasing',
      change: 12.5,
      period: 'Last 7 days'
    },
    {
      metric: 'Load Time',
      trend: 'decreasing',
      change: -8.3,
      period: 'Last 24 hours'
    },
    {
      metric: 'Memory Usage',
      trend: 'stable',
      change: 1.2,
      period: 'Last 7 days'
    },
    {
      metric: 'CPU Usage',
      trend: 'decreasing',
      change: -15.7,
      period: 'Last 24 hours'
    },
    {
      metric: 'Render Time',
      trend: 'increasing',
      change: 5.4,
      period: 'Last 7 days'
    },
    {
      metric: 'Network Requests',
      trend: 'stable',
      change: -2.1,
      period: 'Last 24 hours'
    }
  ];
}

export async function GET() {
  try {
    // In a real implementation, this would calculate trends from historical data
    const calculatedTrends = calculateTrends();
    
    return NextResponse.json({ 
      trends: calculatedTrends,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Performance trends API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance trends' },
      { status: 500 }
    );
  }
}

function calculateTrends(): PerformanceTrend[] {
  // In a real implementation, this would:
  // 1. Fetch historical performance data from database
  // 2. Calculate statistical trends using regression analysis
  // 3. Determine trend direction and magnitude
  // 4. Return calculated trends
  
  // For demo purposes, we'll add some variation to the sample data
  return trends.map(trend => ({
    ...trend,
    change: trend.change + (Math.random() - 0.5) * 2 // Add small random variation
  }));
}

export async function POST(request: Request) {
  try {
    const { metric, period } = await request.json();
    
    if (!metric || !period) {
      return NextResponse.json(
        { error: 'Metric and period are required' },
        { status: 400 }
      );
    }
    
    // In a real implementation, this would calculate the trend for the specific metric and period
    const calculatedTrend = calculateTrendForMetric(metric, period);
    
    return NextResponse.json({ 
      trend: calculatedTrend,
      message: 'Trend calculated successfully'
    });
  } catch (error) {
    console.error('Failed to calculate performance trend:', error);
    return NextResponse.json(
      { error: 'Failed to calculate trend' },
      { status: 500 }
    );
  }
}

function calculateTrendForMetric(metric: string, period: string): PerformanceTrend {
  // Simulate trend calculation
  const change = (Math.random() - 0.5) * 30; // Random change between -15% and +15%
  
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(change) < 2) {
    trend = 'stable';
  } else if (change > 0) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }
  
  return {
    metric,
    trend,
    change,
    period
  };
}

// Helper function to analyze historical data and detect performance regressions
export function detectPerformanceRegressions(
  historicalData: any[],
  thresholds: Record<string, number>
): PerformanceTrend[] {
  const regressions: PerformanceTrend[] = [];
  
  if (historicalData.length < 2) {
    return regressions;
  }
  
  const recent = historicalData.slice(-10); // Last 10 data points
  const older = historicalData.slice(-20, -10); // Previous 10 data points
  
  const metrics = ['bundleSize', 'loadTime', 'renderTime', 'memoryUsage', 'cpuUsage'];
  
  for (const metric of metrics) {
    const recentAvg = recent.reduce((sum, data) => sum + data[metric], 0) / recent.length;
    const olderAvg = older.reduce((sum, data) => sum + data[metric], 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    const threshold = thresholds[metric] || 5; // 5% default threshold
    
    if (Math.abs(change) > threshold) {
      regressions.push({
        metric: metric.charAt(0).toUpperCase() + metric.slice(1),
        trend: change > 0 ? 'increasing' : 'decreasing',
        change,
        period: 'Recent comparison'
      });
    }
  }
  
  return regressions;
}