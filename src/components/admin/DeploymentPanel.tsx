'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Rocket, 
  History, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Undo2,
  Eye
} from 'lucide-react';

interface Deployment {
  id: string;
  url: string;
  status: 'BUILDING' | 'ERROR' | 'READY' | 'QUEUED';
  createdAt: string;
  readyAt?: string;
  creator: {
    username?: string;
    email?: string;
  };
  source?: string;
  gitSource?: {
    type: string;
    repo: string;
    ref: string;
  };
}

interface VerificationReport {
  deploymentId: string;
  url: string;
  overallSuccess: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalFailures: number;
  duration: number;
  tests: Array<{
    name: string;
    success: boolean;
    message: string;
    duration: number;
    critical: boolean;
  }>;
  recommendations: string[];
}

export function DeploymentPanel() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeploymentHistory();
  }, []);

  const loadDeploymentHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/deployment/history');
      
      if (!response.ok) {
        throw new Error('Failed to load deployment history');
      }

      const data = await response.json();
      setDeployments(data.deployments || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load deployments');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerDeployment = async () => {
    setIsDeploying(true);
    setError(null);

    try {
      const response = await fetch('/api/deployment/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceId: 'default', // This would come from context in a real app
          target: 'production'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Deployment failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Refresh deployment history
        await loadDeploymentHistory();
        
        // Auto-verify after a short delay
        setTimeout(() => {
          verifyDeployment(result.deploymentId);
        }, 5000);
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const verifyDeployment = async (deploymentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/deployment/verify/${deploymentId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      setVerificationReport(data.report);
      setSelectedDeployment(deploymentId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const rollbackDeployment = async (deploymentId: string) => {
    if (!confirm('Are you sure you want to rollback to this deployment?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/deployment/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deploymentId,
          reason: 'Manual rollback from admin panel'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rollback failed');
      }

      // Refresh deployment history
      await loadDeploymentHistory();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rollback failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Ready</Badge>;
      case 'BUILDING':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" />Building</Badge>;
      case 'ERROR':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'QUEUED':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deployment Management</h2>
          <p className="text-gray-600">Manage deployments and monitor application health</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadDeploymentHistory}
            variant="outline"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={triggerDeployment}
            disabled={isDeploying}
          >
            <Rocket className="w-4 h-4 mr-2" />
            {isDeploying ? 'Deploying...' : 'Deploy Now'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center text-red-800">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </Card>
      )}

      <Tabs defaultValue="deployments" className="w-full">
        <TabsList>
          <TabsTrigger value="deployments">
            <History className="w-4 h-4 mr-2" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="verification">
            <Eye className="w-4 h-4 mr-2" />
            Verification
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deployments" className="space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Deployments</h3>
              
              {isLoading && deployments.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Loading deployments...</p>
                </div>
              ) : deployments.length === 0 ? (
                <div className="text-center py-8">
                  <Rocket className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">No deployments found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(deployment.status)}
                          <span className="font-mono text-sm text-gray-600">
                            {deployment.id.substring(0, 8)}...
                          </span>
                          {deployment.url && (
                            <a
                              href={deployment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>Created: {formatDate(deployment.createdAt)}</p>
                          {deployment.readyAt && (
                            <p>Ready: {formatDate(deployment.readyAt)}</p>
                          )}
                          {deployment.creator.username && (
                            <p>By: {deployment.creator.username}</p>
                          )}
                          {deployment.gitSource && (
                            <p>
                              Source: {deployment.gitSource.repo}#{deployment.gitSource.ref}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {deployment.status === 'READY' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyDeployment(deployment.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rollbackDeployment(deployment.id)}
                            >
                              <Undo2 className="w-4 h-4 mr-1" />
                              Rollback
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Deployment Verification</h3>
              
              {verificationReport ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">
                        Deployment: {verificationReport.deploymentId.substring(0, 8)}...
                      </h4>
                      <p className="text-sm text-gray-600">{verificationReport.url}</p>
                    </div>
                    <div className="text-right">
                      {verificationReport.overallSuccess ? (
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {verificationReport.passedTests}
                      </div>
                      <div className="text-sm text-gray-600">Passed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {verificationReport.failedTests}
                      </div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {verificationReport.criticalFailures}
                      </div>
                      <div className="text-sm text-gray-600">Critical</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {verificationReport.duration}ms
                      </div>
                      <div className="text-sm text-gray-600">Duration</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium">Test Results</h5>
                    {verificationReport.tests.map((test, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded border ${
                          test.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {test.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-medium">{test.name}</span>
                            {test.critical && (
                              <Badge variant="destructive" size="sm">Critical</Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{test.duration}ms</span>
                        </div>
                        <p className="text-sm mt-1 text-gray-700">{test.message}</p>
                      </div>
                    ))}
                  </div>

                  {verificationReport.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Recommendations</h5>
                      <ul className="space-y-1">
                        {verificationReport.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">
                    Select a deployment and click &quot;Verify&quot; to see verification results
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Deployment Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Auto-deploy on configuration changes
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      defaultChecked={false}
                    />
                    <span className="text-sm text-gray-600">
                      Automatically trigger deployments when white-label configuration changes
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rollback on failure
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      defaultChecked={true}
                    />
                    <span className="text-sm text-gray-600">
                      Automatically rollback to previous deployment if verification fails
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Health check timeout (seconds)
                  </label>
                  <input
                    type="number"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue={300}
                    min={30}
                    max={600}
                  />
                </div>

                <Button>Save Settings</Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}