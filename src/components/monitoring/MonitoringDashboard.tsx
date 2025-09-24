'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Info
} from 'lucide-react';

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    timestamp: string;
  }>;
  timestamp: string;
  uptime: number;
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  recentErrors: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    severity: string;
  }>;
  errorRate: number;
}

interface MonitoringData {
  timestamp: string;
  timeWindow: number;
  systemHealth: SystemHealth;
  errorMetrics: ErrorMetrics;
  serviceMetrics: Array<{
    service: string;
    metrics: {
      uptime: number;
      averageResponseTime: number;
      errorRate: number;
      totalChecks: number;
    };
  }>;
  systemMetrics: {
    overallUptime: number;
    averageResponseTime: number;
    errorRate: number;
    servicesCount: number;
    healthyServices: number;
  };
  alerts: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeWindow, setTimeWindow] = useState(3600000); // 1 hour

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/monitoring/dashboard?timeWindow=${timeWindow}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const monitoringData = await response.json();
      setData(monitoringData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, [timeWindow]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, timeWindow]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <h3 className="text-red-800 font-semibold">Monitoring Error</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={fetchMonitoringData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Monitoring</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={900000}>Last 15 minutes</option>
            <option value={3600000}>Last hour</option>
            <option value={21600000}>Last 6 hours</option>
            <option value={86400000}>Last 24 hours</option>
          </select>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={fetchMonitoringData}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${getStatusColor(data.systemHealth.overall)}`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(data.systemHealth.overall)}
            <span className="font-semibold">System Status</span>
          </div>
          <p className="text-2xl font-bold mt-2 capitalize">{data.systemHealth.overall}</p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-blue-600">Uptime</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-800">
            {data.systemMetrics.overallUptime.toFixed(1)}%
          </p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-500" />
            <span className="font-semibold text-purple-600">Avg Response</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-purple-800">
            {Math.round(data.systemMetrics.averageResponseTime)}ms
          </p>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-orange-600">Error Rate</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-orange-800">
            {data.errorMetrics.errorRate.toFixed(1)}/min
          </p>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-3">Active Alerts</h3>
          <div className="space-y-2">
            {data.alerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-2">
                {alert.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {alert.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                <span className="text-sm">{alert.message}</span>
                <span className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Services Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.serviceMetrics.map((service) => (
            <div key={service.service} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium capitalize">{service.service.replace('-', ' ')}</h4>
                {getStatusIcon(
                  service.metrics.uptime > 95 ? 'healthy' : 
                  service.metrics.uptime > 80 ? 'degraded' : 'unhealthy'
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="font-medium">{service.metrics.uptime.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Response:</span>
                  <span className="font-medium">{Math.round(service.metrics.averageResponseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Error Rate:</span>
                  <span className="font-medium">{service.metrics.errorRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Checks:</span>
                  <span className="font-medium">{service.metrics.totalChecks}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
        {data.errorMetrics.recentErrors.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent errors</p>
        ) : (
          <div className="space-y-2">
            {data.errorMetrics.recentErrors.slice(0, 10).map((error) => (
              <div key={error.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      error.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                      error.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {error.severity}
                    </span>
                    <span className="text-sm font-medium">{error.type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(error.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}