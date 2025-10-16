'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  RefreshCw
} from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  bundleSize: number;
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

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

interface PerformanceTrend {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  period: string;
}

export default function PerformanceMonitoringDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');

  useEffect(() => {
    loadPerformanceData();
    loadAlerts();
    loadTrends();
  }, [selectedTimeRange]);

  const loadPerformanceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/analysis/performance-monitoring?range=${selectedTimeRange}`);
      const data = await response.json();
      setPerformanceData(data.metrics || []);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/analysis/performance-alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const loadTrends = async () => {
    try {
      const response = await fetch('/api/analysis/performance-trends');
      const data = await response.json();
      setTrends(data.trends || []);
    } catch (error) {
      console.error('Failed to load trends:', error);
    }
  };

  const startMonitoring = async () => {
    try {
      setIsMonitoring(true);
      await fetch('/api/analysis/performance-monitoring/start', { method: 'POST' });
      // Refresh data every 30 seconds while monitoring
      const interval = setInterval(loadPerformanceData, 30000);
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = async () => {
    try {
      await fetch('/api/analysis/performance-monitoring/stop', { method: 'POST' });
      setIsMonitoring(false);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getCurrentMetrics = () => {
    if (performanceData.length === 0) return null;
    return performanceData[performanceData.length - 1];
  };

  const currentMetrics = getCurrentMetrics();

  const pieChartData = currentMetrics ? [
    { name: 'Bundle Size', value: currentMetrics.bundleSize, color: '#8884d8' },
    { name: 'Memory Usage', value: currentMetrics.memoryUsage, color: '#82ca9d' },
    { name: 'CPU Usage', value: currentMetrics.cpuUsage, color: '#ffc658' }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time performance metrics and trend analysis
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            disabled={isLoading}
          >
            {isMonitoring ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Stop Monitoring
              </>
            ) : (
              <>
                <Activity className="h-4 w-4 mr-2" />
                Start Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Current Metrics Cards */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bundle Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(currentMetrics.bundleSize)}</div>
              <p className="text-xs text-muted-foreground">
                Current bundle size
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Load Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(currentMetrics.loadTime)}</div>
              <p className="text-xs text-muted-foreground">
                Average load time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(currentMetrics.memoryUsage)}</div>
              <p className="text-xs text-muted-foreground">
                Current memory usage
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics.cpuUsage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Current CPU usage
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <Alert key={alert.id} className="border-l-4 border-l-orange-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.severity)}
                      <span className="font-medium">{alert.message}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.type === 'regression' ? 'destructive' : 'default'}>
                        {alert.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bundle">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="runtime">Runtime Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value, name) => {
                        if (name === 'bundleSize' || name === 'memoryUsage') {
                          return [formatBytes(value as number), name];
                        }
                        if (name === 'loadTime' || name === 'renderTime') {
                          return [formatTime(value as number), name];
                        }
                        return [value, name];
                      }}
                    />
                    <Line type="monotone" dataKey="loadTime" stroke="#8884d8" name="Load Time" />
                    <Line type="monotone" dataKey="renderTime" stroke="#82ca9d" name="Render Time" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => {
                      if (name === 'Bundle Size' || name === 'Memory Usage') {
                        return [formatBytes(value as number), name];
                      }
                      return [value, name];
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bundle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Size Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis tickFormatter={(value) => formatBytes(value)} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value) => [formatBytes(value as number), 'Bundle Size']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bundleSize" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runtime" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis tickFormatter={(value) => formatBytes(value)} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [formatBytes(value as number), 'Memory Usage']}
                    />
                    <Line type="monotone" dataKey="memoryUsage" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value}%`, 'CPU Usage']}
                    />
                    <Line type="monotone" dataKey="cpuUsage" stroke="#ffc658" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTrendIcon(trend.trend)}
                      <div>
                        <h3 className="font-medium">{trend.metric}</h3>
                        <p className="text-sm text-muted-foreground">
                          {trend.period} trend
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        trend.trend === 'increasing' ? 'text-red-500' : 
                        trend.trend === 'decreasing' ? 'text-green-500' : 
                        'text-gray-500'
                      }`}>
                        {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                      </div>
                      <Badge variant={trend.trend === 'increasing' ? 'destructive' : 'default'}>
                        {trend.trend}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}