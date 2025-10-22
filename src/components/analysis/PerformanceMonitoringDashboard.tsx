'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  Zap,
  Database,
  Monitor
} from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export default function PerformanceMonitoringDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/analysis/performance-monitoring');
      const data = await response.json();
      setPerformanceData(data.metrics || []);
      setIsMonitoring(data.isMonitoring || false);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    }
  };

  const toggleMonitoring = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analysis/performance-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isMonitoring ? 'stop' : 'start' })
      });
      
      const result = await response.json();
      setIsMonitoring(result.isMonitoring);
      
      if (result.isMonitoring) {
        // Start polling for updates
        const interval = setInterval(fetchPerformanceData, 5000);
        return () => clearInterval(interval);
      }
    } catch (error) {
      console.error('Failed to toggle monitoring:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMetrics = (): PerformanceMetrics | null => {
    return performanceData.length > 0 ? performanceData[performanceData.length - 1] : null;
  };

  const getMetricTrend = (metric: keyof PerformanceMetrics): 'up' | 'down' | 'stable' => {
    if (performanceData.length < 2) return 'stable';
    
    const current = performanceData[performanceData.length - 1][metric];
    const previous = performanceData[performanceData.length - 2][metric];
    
    if (current > previous * 1.05) return 'up';
    if (current < previous * 0.95) return 'down';
    return 'stable';
  };

  const currentMetrics = getCurrentMetrics();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Performance Monitoring</h1>
        <Button
          onClick={toggleMonitoring}
          disabled={loading}
          variant={isMonitoring ? 'secondary' : 'primary'}
        >
          {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
        </Button>
      </div>

      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bundle Size</p>
                  <p className="text-2xl font-bold">{(currentMetrics.bundleSize / 1024 / 1024).toFixed(2)}MB</p>
                </div>
                <div className="flex items-center">
                  {getMetricTrend('bundleSize') === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {getMetricTrend('bundleSize') === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {getMetricTrend('bundleSize') === 'stable' && <Activity className="h-4 w-4 text-gray-500" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Load Time</p>
                  <p className="text-2xl font-bold">{currentMetrics.loadTime}ms</p>
                </div>
                <div className="flex items-center">
                  {getMetricTrend('loadTime') === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {getMetricTrend('loadTime') === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {getMetricTrend('loadTime') === 'stable' && <Clock className="h-4 w-4 text-gray-500" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold">{(currentMetrics.memoryUsage / 1024 / 1024).toFixed(0)}MB</p>
                </div>
                <div className="flex items-center">
                  {getMetricTrend('memoryUsage') === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {getMetricTrend('memoryUsage') === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {getMetricTrend('memoryUsage') === 'stable' && <Database className="h-4 w-4 text-gray-500" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">CPU Usage</p>
                  <p className="text-2xl font-bold">{currentMetrics.cpuUsage.toFixed(1)}%</p>
                </div>
                <div className="flex items-center">
                  {getMetricTrend('cpuUsage') === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {getMetricTrend('cpuUsage') === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {getMetricTrend('cpuUsage') === 'stable' && <Zap className="h-4 w-4 text-gray-500" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 flex items-center justify-center border border-gray-200 rounded">
                  <div className="text-center text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-2" />
                    <p>Performance Chart</p>
                    <p className="text-sm">Load Time & Render Time Trends</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 flex items-center justify-center border border-gray-200 rounded">
                  <div className="text-center text-gray-500">
                    <Monitor className="h-12 w-12 mx-auto mb-2" />
                    <p>Resource Chart</p>
                    <p className="text-sm">Memory & CPU Usage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Performance Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.slice(-10).map((metric, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge variant="default">
                        Load: {metric.loadTime}ms
                      </Badge>
                      <Badge variant="info">
                        Memory: {(metric.memoryUsage / 1024 / 1024).toFixed(0)}MB
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">CPU: {metric.cpuUsage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentMetrics && currentMetrics.loadTime > 3000 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Load time is above 3 seconds ({currentMetrics.loadTime}ms). Consider optimizing bundle size.
                    </AlertDescription>
                  </Alert>
                )}
                
                {currentMetrics && currentMetrics.cpuUsage > 80 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      CPU usage is high ({currentMetrics.cpuUsage.toFixed(1)}%). Monitor for performance issues.
                    </AlertDescription>
                  </Alert>
                )}

                {currentMetrics && (currentMetrics.memoryUsage / 1024 / 1024) > 100 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Memory usage is high ({(currentMetrics.memoryUsage / 1024 / 1024).toFixed(0)}MB). Check for memory leaks.
                    </AlertDescription>
                  </Alert>
                )}

                {(!currentMetrics || (currentMetrics.loadTime <= 3000 && currentMetrics.cpuUsage <= 80 && (currentMetrics.memoryUsage / 1024 / 1024) <= 100)) && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-2" />
                    <p>No performance alerts at this time</p>
                    <p className="text-sm">System is performing within normal parameters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}