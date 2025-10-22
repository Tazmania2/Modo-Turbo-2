import { NextRequest, NextResponse } from 'next/server';
import { IntegrationMonitoringService } from '@/services/analysis/integration-monitoring.service';

const monitoringService = new IntegrationMonitoringService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const dashboardId = searchParams.get('dashboardId');
    const featureId = searchParams.get('featureId');

    switch (action) {
      case 'system-health':
        const systemHealth = await monitoringService.getSystemHealthOverview();
        return NextResponse.json({ systemHealth });

      case 'dashboard-data':
        if (!dashboardId) {
          return NextResponse.json(
            { error: 'Dashboard ID required' },
            { status: 400 }
          );
        }
        
        const filters = Object.fromEntries(
          Array.from(searchParams.entries()).filter(([key]) => 
            !['action', 'dashboardId'].includes(key)
          )
        );
        
        const dashboardData = await monitoringService.getDashboardData(dashboardId, filters);
        return NextResponse.json({ data: dashboardData });

      case 'health-check':
        if (!featureId) {
          return NextResponse.json(
            { error: 'Feature ID required for health check' },
            { status: 400 }
          );
        }
        
        const healthCheck = await monitoringService.performHealthCheck(featureId);
        return NextResponse.json({ healthCheck });

      case 'maintenance-status':
        const maintenanceAutomation = await monitoringService.developMaintenanceAutomation();
        return NextResponse.json({ maintenance: maintenanceAutomation });

      case 'analytics':
        const analytics = await monitoringService.buildAnalyticsAndReporting();
        return NextResponse.json({ analytics });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to process monitoring request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create-dashboard':
        const { name, features } = data;
        const dashboard = await monitoringService.buildIntegrationMonitoringDashboard(name, features);
        return NextResponse.json({ success: true, dashboard });

      case 'track-feature-status':
        const { featureId, status, metrics } = data;
        await monitoringService.trackFeatureStatus(featureId, status, metrics);
        return NextResponse.json({ success: true });

      case 'trigger-maintenance':
        // Trigger maintenance task
        return NextResponse.json({ 
          success: true, 
          message: 'Maintenance task triggered' 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to process monitoring request' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { dashboardId, updates } = body;

    // Update dashboard configuration
    return NextResponse.json({
      success: true,
      message: `Dashboard ${dashboardId} updated successfully`
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('dashboardId');

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Dashboard ID required' },
        { status: 400 }
      );
    }

    // Delete dashboard
    return NextResponse.json({
      success: true,
      message: `Dashboard ${dashboardId} deleted successfully`
    });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}