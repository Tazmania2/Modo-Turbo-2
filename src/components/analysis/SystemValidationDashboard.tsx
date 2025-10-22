'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  Zap, 
  Database,
  AlertTriangle,
  Play,
  Download
} from 'lucide-react';

interface ValidationResult {
  id: string;
  type: 'comprehensive' | 'security' | 'deployment';
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  phases: ValidationPhase[];
  startTime: string;
  endTime?: string;
  issues: ValidationIssue[];
}

interface ValidationPhase {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  tests: ValidationTest[];
}

interface ValidationTest {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  duration?: number;
  message?: string;
}

interface ValidationIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export default function SystemValidationDashboard() {
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [currentValidation, setCurrentValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchValidationStatus();
  }, []);

  const fetchValidationStatus = async () => {
    try {
      const response = await fetch('/api/analysis/system-validation');
      const data = await response.json();
      setValidations(data.validations || []);
    } catch (error) {
      console.error('Failed to fetch validation status:', error);
    }
  };

  const startValidation = async (type: 'comprehensive' | 'security' | 'deployment') => {
    setLoading(true);
    try {
      const response = await fetch('/api/analysis/system-validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          validationType: type,
          options: {
            includePerformanceTests: true,
            includeSecurityScans: true,
            includeCompatibilityTests: true
          }
        })
      });
      
      const result = await response.json();
      setCurrentValidation(result);
      
      // Poll for updates
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`/api/analysis/system-validation?validationId=${result.id}`);
        const status = await statusResponse.json();
        setCurrentValidation(status);
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          fetchValidationStatus();
        }
      }, 2000);
      
    } catch (error) {
      console.error('Failed to start validation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Validation Dashboard</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => startValidation('comprehensive')}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Comprehensive Test
          </Button>
          <Button
            onClick={() => startValidation('security')}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Security Validation
          </Button>
          <Button
            onClick={() => startValidation('deployment')}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Deployment Check
          </Button>
        </div>
      </div>

      {currentValidation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(currentValidation.status)}
              Current Validation: {currentValidation.type}
              <Badge variant={currentValidation.status === 'completed' ? 'default' : 'secondary'}>
                {currentValidation.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Progress</span>
                  <span>{currentValidation.progress}%</span>
                </div>
                <ProgressBar value={currentValidation.progress} className="h-2" />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{currentValidation.results.passed}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{currentValidation.results.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{currentValidation.results.warnings}</div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{currentValidation.results.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>

              <div className="space-y-3">
                {currentValidation.phases.map((phase, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(phase.status)}
                        <span className="font-medium">{phase.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{phase.progress}%</span>
                    </div>
                    <ProgressBar value={phase.progress} className="h-1 mb-2" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {phase.tests.map((test, testIndex) => (
                        <div key={testIndex} className="flex items-center gap-2">
                          {getStatusIcon(test.status)}
                          <span className={test.status === 'failed' ? 'text-red-600' : ''}>{test.name}</span>
                          {test.duration && <span className="text-gray-500">({test.duration}ms)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {currentValidation.issues.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Issues Found</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {currentValidation.issues.map((issue, index) => (
                      <Alert key={index} className={getSeverityColor(issue.severity)}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{issue.category}</div>
                              <div>{issue.message}</div>
                              {issue.file && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {issue.file}{issue.line && `:${issue.line}`}
                                </div>
                              )}
                              {issue.suggestion && (
                                <div className="text-sm text-blue-600 mt-1">
                                  Suggestion: {issue.suggestion}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {validations.map((validation) => (
          <Card key={validation.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{validation.type}</span>
                {getStatusIcon(validation.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <span>{Math.round((validation.results.passed / validation.results.total) * 100)}%</span>
                </div>
                <ProgressBar 
                  value={(validation.results.passed / validation.results.total) * 100} 
                  className="h-2" 
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{validation.results.passed} passed</span>
                  <span>{validation.results.failed} failed</span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(validation.startTime).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}