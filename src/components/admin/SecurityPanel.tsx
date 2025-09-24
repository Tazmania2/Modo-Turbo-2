'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Activity, 
  Download,
  Search,
  Clock,
  User,
  Globe
} from 'lucide-react';

interface SecurityViolation {
  id: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  clientId: string;
  userAgent?: string;
  url: string;
  timestamp: Date;
  details?: any;
}

interface BlockedIP {
  ip: string;
  until: Date;
  reason: string;
}

interface SecurityMetrics {
  totalViolations: number;
  violationsBySeverity: Record<string, number>;
  recentViolations: SecurityViolation[];
}

interface SecurityData {
  violations: SecurityViolation[];
  securityStatus: {
    blockedIPs: BlockedIP[];
    timestamp: Date;
  };
  metrics: SecurityMetrics;
}

export default function SecurityPanel() {
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockIPForm, setBlockIPForm] = useState({
    ip: '',
    reason: '',
    duration: 3600000 // 1 hour default
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSecurityData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      const response = await fetch('/api/security/violations');
      if (!response.ok) throw new Error('Failed to fetch security data');
      
      const result = await response.json();
      if (result.success) {
        setSecurityData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch security data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/security/block-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(blockIPForm)
      });
      
      if (!response.ok) throw new Error('Failed to block IP');
      
      const result = await response.json();
      if (result.success) {
        setBlockIPForm({ ip: '', reason: '', duration: 3600000 });
        fetchSecurityData(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to block IP');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleExportAuditLogs = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/security/audit/export?format=${format}`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) throw new Error('Failed to export audit logs');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const filteredViolations = securityData?.violations.filter(violation =>
    violation.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    violation.clientId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading security data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Error: {error}
          </div>
          <Button onClick={fetchSecurityData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Violations</p>
                <p className="text-2xl font-bold">{securityData?.metrics.totalViolations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Ban className="h-8 w-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Blocked IPs</p>
                <p className="text-2xl font-bold">{securityData?.securityStatus.blockedIPs.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Critical Events</p>
                <p className="text-2xl font-bold">{securityData?.metrics.violationsBySeverity.critical || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Recent Events</p>
                <p className="text-2xl font-bold">{securityData?.metrics.recentViolations.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="violations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="violations">Security Violations</TabsTrigger>
          <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          <TabsTrigger value="actions">Admin Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Security Violations
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search violations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button
                    onClick={() => handleExportAuditLogs('csv')}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredViolations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No security violations found</p>
                ) : (
                  filteredViolations.map((violation) => (
                    <div key={violation.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={getSeverityColor(violation.severity)}>
                              {violation.severity.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{violation.action}</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 mr-1" />
                              IP: {violation.clientId}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(violation.timestamp).toLocaleString()}
                            </div>
                            {violation.userAgent && (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {violation.userAgent.substring(0, 100)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {violation.details && (
                        <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(violation.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ban className="h-5 w-5 mr-2" />
                Blocked IP Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityData?.securityStatus.blockedIPs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No blocked IP addresses</p>
                ) : (
                  securityData?.securityStatus.blockedIPs.map((blocked, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{blocked.ip}</div>
                          <div className="text-sm text-gray-600">{blocked.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Until: {new Date(blocked.until).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(blocked.until) > new Date() ? 'Active' : 'Expired'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Block IP Form */}
          <Card>
            <CardHeader>
              <CardTitle>Block IP Address</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBlockIP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">IP Address</label>
                  <Input
                    type="text"
                    placeholder="192.168.1.1"
                    value={blockIPForm.ip}
                    onChange={(e) => setBlockIPForm(prev => ({ ...prev, ip: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <Input
                    type="text"
                    placeholder="Suspicious activity detected"
                    value={blockIPForm.reason}
                    onChange={(e) => setBlockIPForm(prev => ({ ...prev, reason: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <select
                    value={blockIPForm.duration}
                    onChange={(e) => setBlockIPForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value={300000}>5 minutes</option>
                    <option value={1800000}>30 minutes</option>
                    <option value={3600000}>1 hour</option>
                    <option value={21600000}>6 hours</option>
                    <option value={86400000}>24 hours</option>
                    <option value={604800000}>7 days</option>
                  </select>
                </div>
                <Button type="submit" className="w-full">
                  Block IP Address
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Admin Actions & Audit Log
                </CardTitle>
                <Button
                  onClick={() => handleExportAuditLogs('json')}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Complete audit logs can be exported for compliance and analysis. 
                Use the export buttons to download logs in JSON or CSV format.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleExportAuditLogs('json')}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as JSON
                </Button>
                <Button
                  onClick={() => handleExportAuditLogs('csv')}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}