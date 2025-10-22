'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Settings,
  Download
} from 'lucide-react';

interface MonitoringDashboardProps {
  dashboardId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface SystemHealth {
  overallStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  timestamp: Date;
  components: ComponentHealth[];
  metrics: SystemMetrics;
  alerts: SystemAlert[];
  trends: HealthTrend[];
}

interface ComponentHealth {
  componentId: string;
  componentName: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  metrics: {
    availability: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

interface SystemMetrics {
  totalFeatures: number;
  activeFeatures: number;
  healthyFeatures: number;
  degradedFeatures: number;
  failedFeatures: number;
  overallAvailability: number;
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
}

interface SystemAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  status: 'open' | 'acknowledged' | 'resolved';
}

interface HealthTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'degrading';
  change: number;
  timeframe: string;
  confidence: number;
}

export default function MonitoringDashboard({
  dashboardId = 'default-dashboard',
  autoRefresh = true,
  refreshInterval = 30000
}: MonitoringDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [dashboardId, autoRefresh, refreshInterval]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load system health
      const healthResponse = await fetch('/api/analysis/monitoring?action=system-health');
      const healthData = await healthResponse.json();
      setSystemHealth(healthData.systemHealth);

      // Load dashboard data
      const dashboardResponse = await fetch(
        `/api/analysis/monitoring?action=dashboard-data&dashboardId=${dashboardId}`
      );
      const dashboardResult = await dashboardResponse.json();
      setDashboardData(dashboardResult.data);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'degrading': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'info': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading && !systemHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading monitoring data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* System Overview */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(systemHealth.overallStatus)}
                System Health Overview
              </CardTitle>
              <Badge className={getStatusColor(systemHealth.overallStatus)}>
                {systemHealth.overallStatus.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {systemHealth.metrics.healthyFeatures}
                </div>
                <div className="text-sm text-gray-500">Healthy Features</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {systemHealth.metrics.degradedFeatures}
                </div>
                <div className="text-sm text-gray-500">Degraded Features</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {systemHealth.metrics.failedFeatures}
                </div>
                <div className="text-sm text-gray-500">Failed Features</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {systemHealth.metrics.overallAvailability.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Availability</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>System Availability</span>
                <span>{systemHealth.metrics.overallAvailability.toFixed(2)}%</span>
              </div>
              <ProgressBar value={systemHealth.metrics.overallAvailability} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Real-time system performance</CardDescription>
              </CardHeader>
              <CardContent>
                {systemHealth && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Response Time</span>
                      <span className="text-sm text-gray-600">
                        {systemHealth.metrics.averageResponseTime}ms
                      </span>
                    </div>
                    <ProgressBar 
                      value={Math.min((systemHealth.metrics.averageResponseTime / 1000) * 100, 100)} 
                      className="h-2" 
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Error Rate</span>
                      <span className="text-sm text-gray-600">
                        {(systemHealth.metrics.errorRate * 100).toFixed(3)}%
                      </span>
                    </div>
                    <ProgressBar 
                      value={systemHealth.metrics.errorRate * 100} 
                      className="h-2" 
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Requests</span>
                      <span className="text-sm text-gray-600">
                        {systemHealth.metrics.totalRequests.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Status */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Status</CardTitle>
                <CardDescription>Status of integrated features</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.['feature-status'] && (
                  <div className="space-y-3">
                    {dashboardData['feature-status'].map((feature: any) => (
                      <div key={feature.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(feature.status)}
                          <div>
                            <div className="font-medium">{feature.name}</div>
                            <div className="text-sm text-gray-500">
                              Adoption: {feature.adoption.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(feature.status)}>
                          {feature.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Component Health</CardTitle>
              <CardDescription>Health status of system components</CardDescription>
            </CardHeader>
            <CardContent>
              {systemHealth?.components && (
                <div className="space-y-4">
                  {systemHealth.components.map((component) => (
                    <div key={component.componentId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(component.status)}
                          <div>
                            <h4 className="font-medium">{component.componentName}</h4>
                            <p className="text-sm text-gray-500 capitalize">{component.type}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(component.status)}>
                          {component.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Availability</div>
                          <div className="font-medium">{component.metrics.availability.toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Response Time</div>
                          <div className="font-medium">{component.metrics.responseTime}ms</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Error Rate</div>
                          <div className="font-medium">{(component.metrics.errorRate * 100).toFixed(3)}%</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Throughput</div>
                          <div className="font-medium">{component.metrics.throughput}/s</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>Current system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              {systemHealth?.alerts && systemHealth.alerts.length > 0 ? (
                <div className="space-y-3">
                  {systemHealth.alerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm text-gray-500">{alert.component}</span>
                          </div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={alert.status === 'open' ? 'destructive' : 'secondary'}>
                          {alert.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                  <p className="text-gray-500">All systems are operating normally</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Trends</CardTitle>
              <CardDescription>System health trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              {systemHealth?.trends && (
                <div className="space-y-4">
                  {systemHealth.trends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTrendIcon(trend.direction)}
                        <div>
                          <div className="font-medium capitalize">{trend.metric}</div>
                          <div className="text-sm text-gray-500">
                            {trend.timeframe} • {(trend.confidence * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          trend.direction === 'improving' ? 'text-green-600' : 
                          trend.direction === 'degrading' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500 capitalize">{trend.direction}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}