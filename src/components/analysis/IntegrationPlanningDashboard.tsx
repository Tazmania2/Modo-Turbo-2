'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  FileText,
  Settings,
  Download,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import {
  IntegrationPlan,
  IntegrationPhase,
  MigrationStep,
  RiskLevel,
  EffortEstimate
} from '@/services/analysis/integration-planning.service';
import { PrioritizedFeature, PriorityMatrix } from '@/services/analysis/integration-priority-matrix.service';

interface IntegrationPlanningDashboardProps {
  plan?: IntegrationPlan;
  priorityMatrix?: PriorityMatrix;
  onCreatePlan?: () => void;
  onExecutePhase?: (phaseId: string) => void;
  onRollback?: (stepId: string) => void;
  onExportPlan?: (format: 'json' | 'csv' | 'pdf') => void;
}

export default function IntegrationPlanningDashboard({
  plan,
  priorityMatrix,
  onCreatePlan,
  onExecutePhase,
  onRollback,
  onExportPlan
}: IntegrationPlanningDashboardProps) {
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [executionStatus, setExecutionStatus] = useState<Record<string, 'pending' | 'running' | 'completed' | 'failed'>>({});

  useEffect(() => {
    if (plan && plan.phases.length > 0) {
      setSelectedPhase(plan.phases[0].id);
    }
  }, [plan]);

  const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running': return <Play className="h-4 w-4 text-blue-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const calculateProgress = (): number => {
    if (!plan) return 0;
    const completedPhases = Object.values(executionStatus).filter(status => status === 'completed').length;
    return (completedPhases / plan.phases.length) * 100;
  };

  if (!plan) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Integration Planning Dashboard</CardTitle>
            <CardDescription>
              Create and manage integration plans for base project improvements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Integration Plan</h3>
              <p className="text-gray-500 mb-4">
                Create an integration plan to start managing your project improvements
              </p>
              <Button onClick={onCreatePlan}>
                Create Integration Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {priorityMatrix && (
          <Card>
            <CardHeader>
              <CardTitle>Priority Matrix Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{priorityMatrix.highPriority}</div>
                  <div className="text-sm text-gray-500">High Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{priorityMatrix.mediumPriority}</div>
                  <div className="text-sm text-gray-500">Medium Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{priorityMatrix.lowPriority}</div>
                  <div className="text-sm text-gray-500">Low Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{priorityMatrix.totalFeatures}</div>
                  <div className="text-sm text-gray-500">Total Features</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onExportPlan?.('json')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{plan.totalFeatures}</div>
                <div className="text-sm text-gray-500">Features</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{plan.totalEstimatedHours}h</div>
                <div className="text-sm text-gray-500">Estimated Hours</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{plan.phases.length}</div>
                <div className="text-sm text-gray-500">Phases</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <Badge className={getRiskColor(plan.overallRiskLevel)}>
                  {plan.overallRiskLevel.toUpperCase()}
                </Badge>
                <div className="text-sm text-gray-500">Risk Level</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(calculateProgress())}%</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard */}
      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="phases">Integration Phases</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="risks">Risk Management</TabsTrigger>
          <TabsTrigger value="testing">Testing Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="phases" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Phase List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Phases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.phases.map((phase) => (
                    <div
                      key={phase.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPhase === phase.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPhase(phase.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{phase.name}</h4>
                        {getStatusIcon(executionStatus[phase.id] || 'pending')}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{phase.features.length} features</span>
                        <span>{phase.estimatedDuration}h</span>
                        <Badge size="sm" className={getRiskColor(phase.riskLevel)}>
                          {phase.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Phase Details */}
            <div className="lg:col-span-2">
              {selectedPhase && (
                <PhaseDetails
                  phase={plan.phases.find(p => p.id === selectedPhase)!}
                  status={executionStatus[selectedPhase] || 'pending'}
                  onExecute={() => onExecutePhase?.(selectedPhase)}
                  onRollback={() => onRollback?.(selectedPhase)}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <TimelineView plan={plan} executionStatus={executionStatus} />
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <RiskManagementView plan={plan} />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <TestingStrategyView plan={plan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PhaseDetails({ 
  phase, 
  status, 
  onExecute, 
  onRollback 
}: { 
  phase: IntegrationPhase; 
  status: string; 
  onExecute: () => void; 
  onRollback: () => void; 
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{phase.name}</CardTitle>
          <div className="flex gap-2">
            {status === 'pending' && (
              <Button onClick={onExecute}>
                <Play className="h-4 w-4 mr-2" />
                Execute Phase
              </Button>
            )}
            {status === 'running' && (
              <Button variant="outline">
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {(status === 'completed' || status === 'failed') && (
              <Button variant="outline" onClick={onRollback}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Rollback
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Phase Information</h4>
            <div className="space-y-1 text-sm">
              <div>Features: {phase.features.length}</div>
              <div>Duration: {phase.estimatedDuration} hours</div>
              <div>Risk Level: <Badge className={`ml-1 ${getRiskColor(phase.riskLevel)}`}>{phase.riskLevel}</Badge></div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">Dependencies</h4>
            <div className="space-y-1">
              {phase.dependencies.length > 0 ? (
                phase.dependencies.map((dep, index) => (
                  <Badge key={index} variant="outline" className="mr-1">
                    {dep}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">No dependencies</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Features in this Phase</h4>
          <div className="space-y-2">
            {phase.features.map((featureId, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{featureId}</span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            ))}
          </div>
        </div>

        {phase.prerequisites.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Prerequisites</h4>
            <div className="space-y-1">
              {phase.prerequisites.map((prereq, index) => (
                <div key={index} className="text-sm text-gray-600">• {prereq}</div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineView({ 
  plan, 
  executionStatus 
}: { 
  plan: IntegrationPlan; 
  executionStatus: Record<string, string>; 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Timeline</CardTitle>
        <CardDescription>
          Timeline view of integration phases and milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {plan.startDate && plan.estimatedEndDate && (
            <div className="flex justify-between text-sm text-gray-600 mb-4">
              <span>Start: {plan.startDate.toLocaleDateString()}</span>
              <span>End: {plan.estimatedEndDate.toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="relative">
            {plan.phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white">
                  {executionStatus[phase.id] === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="font-medium">{phase.name}</h4>
                  <p className="text-sm text-gray-500">
                    {phase.features.length} features • {phase.estimatedDuration}h
                  </p>
                </div>
                <Badge className={getRiskColor(phase.riskLevel)}>
                  {phase.riskLevel}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskManagementView({ plan }: { plan: IntegrationPlan }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Identified Risks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.riskMitigation.risks.map((risk) => (
              <div key={risk.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{risk.description}</h4>
                  <Badge className={getRiskColor(risk.riskLevel)}>
                    {risk.riskLevel}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Category: {risk.category}</div>
                  <div>Probability: {risk.probability}</div>
                  <div>Impact: {risk.impact}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mitigation Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.riskMitigation.mitigationStrategies.map((strategy) => (
              <div key={strategy.riskId} className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">{strategy.strategy}</h4>
                <div className="space-y-1">
                  {strategy.actions.map((action, index) => (
                    <div key={index} className="text-sm text-gray-600">• {action}</div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Effectiveness: {strategy.effectiveness} • Cost: {strategy.cost}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TestingStrategyView({ plan }: { plan: IntegrationPlan }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Testing Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {plan.testingStrategy.automationLevel}%
              </div>
              <div className="text-sm text-gray-500">Automation Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {plan.testingStrategy.coverageTargets.overall}%
              </div>
              <div className="text-sm text-gray-500">Target Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {plan.testingStrategy.phases.length}
              </div>
              <div className="text-sm text-gray-500">Testing Phases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {plan.testingStrategy.phases.reduce((sum, phase) => sum + phase.estimatedHours, 0)}h
              </div>
              <div className="text-sm text-gray-500">Testing Hours</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plan.testingStrategy.phases.map((phase) => (
              <div key={phase.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{phase.name}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={phase.automatable ? 'default' : 'secondary'}>
                      {phase.automatable ? 'Automated' : 'Manual'}
                    </Badge>
                    <span className="text-sm text-gray-500">{phase.estimatedHours}h</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium mb-1">Prerequisites</h5>
                    <ul className="text-gray-600">
                      {phase.prerequisites.map((prereq, index) => (
                        <li key={index}>• {prereq}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-1">Success Criteria</h5>
                    <ul className="text-gray-600">
                      {phase.successCriteria.map((criteria, index) => (
                        <li key={index}>• {criteria}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'low': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'critical': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}