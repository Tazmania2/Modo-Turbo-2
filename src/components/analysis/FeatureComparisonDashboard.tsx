/**
 * Feature Comparison Dashboard Component
 * Provides UI for feature comparison and gap analysis
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/Alert';
// Chart components would be imported from a chart library like recharts
// For now, we'll use simple div-based charts
import { 
  Play, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';

interface FeatureComparisonConfig {
  essenciaPath: string;
  fnpRankingPath: string;
  currentPlatformPath: string;
  includeCategories?: string[];
  excludeCategories?: string[];
  minPriority?: number;
  generateReport?: boolean;
  reportFormat?: 'json' | 'html' | 'pdf';
}

interface ComparisonSummary {
  totalFeaturesAnalyzed: number;
  gapsIdentified: number;
  highPriorityGaps: number;
  quickWins: number;
  estimatedEffort: number;
  recommendedPhases: number;
  overallRisk: 'low' | 'medium' | 'high';
  nextSteps: string[];
}

interface AnalysisResult {
  totalGaps: number;
  highPriorityGaps: number;
  phases: number;
  overallRisk: 'low' | 'medium' | 'high';
}

interface ComparisonResult {
  summary: ComparisonSummary;
  analysisResult: AnalysisResult;
  report?: {
    id: string;
    generatedAt: string;
    summary: any;
  };
  exportedReportPath?: string;
}

const FEATURE_CATEGORIES = [
  'dashboard',
  'ranking',
  'auth',
  'admin',
  'integration',
  'ui',
  'api'
];

const COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444'
};

export default function FeatureComparisonDashboard() {
  const [config, setConfig] = useState<FeatureComparisonConfig>({
    essenciaPath: '',
    fnpRankingPath: '',
    currentPlatformPath: '',
    includeCategories: [],
    minPriority: 1,
    generateReport: true,
    reportFormat: 'html'
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickSummary, setQuickSummary] = useState<ComparisonSummary | null>(null);

  // Load quick summary on component mount
  useEffect(() => {
    loadQuickSummary();
  }, []);

  const loadQuickSummary = async () => {
    if (!config.essenciaPath || !config.fnpRankingPath || !config.currentPlatformPath) {
      return;
    }

    try {
      const params = new URLSearchParams({
        action: 'quick-summary',
        essenciaPath: config.essenciaPath,
        fnpRankingPath: config.fnpRankingPath,
        currentPlatformPath: config.currentPlatformPath
      });

      const response = await fetch(`/api/analysis/feature-comparison?${params}`);
      const data = await response.json();

      if (data.success) {
        setQuickSummary(data.data);
      }
    } catch (error) {
      console.error('Failed to load quick summary:', error);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis/feature-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean | string) => {
    setConfig(prev => ({
      ...prev,
      includeCategories: checked === true
        ? [...(prev.includeCategories || []), category]
        : (prev.includeCategories || []).filter(c => c !== category)
    }));
  };

  const getRiskColor = (risk: string) => {
    return COLORS[risk as keyof typeof COLORS] || COLORS.medium;
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const generateChartData = () => {
    if (!result) return { categoryData: [], riskData: [], priorityData: [] };

    const categoryData = FEATURE_CATEGORIES.map(category => ({
      category,
      gaps: Math.floor(Math.random() * 10), // Mock data - would come from actual analysis
      priority: Math.floor(Math.random() * 10) + 1
    }));

    const riskData = [
      { name: 'Low Risk', value: 60, color: COLORS.low },
      { name: 'Medium Risk', value: 30, color: COLORS.medium },
      { name: 'High Risk', value: 10, color: COLORS.high }
    ];

    const priorityData = Array.from({ length: 20 }, (_, i) => ({
      complexity: Math.floor(Math.random() * 3) + 1,
      value: Math.floor(Math.random() * 3) + 1,
      name: `Feature ${i + 1}`
    }));

    return { categoryData, riskData, priorityData };
  };

  const { categoryData, riskData, priorityData } = generateChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feature Comparison & Gap Analysis</h1>
          <p className="text-muted-foreground">
            Analyze and compare features across Essencia, FNP-Ranking, and current platform
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Analysis
            </>
          )}
        </Button>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="essenciaPath">Essencia Project Path</Label>
              <Input
                id="essenciaPath"
                value={config.essenciaPath}
                onChange={(e) => setConfig(prev => ({ ...prev, essenciaPath: e.target.value }))}
                placeholder="/path/to/essencia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fnpRankingPath">FNP-Ranking Project Path</Label>
              <Input
                id="fnpRankingPath"
                value={config.fnpRankingPath}
                onChange={(e) => setConfig(prev => ({ ...prev, fnpRankingPath: e.target.value }))}
                placeholder="/path/to/fnp-ranking"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentPlatformPath">Current Platform Path</Label>
              <Input
                id="currentPlatformPath"
                value={config.currentPlatformPath}
                onChange={(e) => setConfig(prev => ({ ...prev, currentPlatformPath: e.target.value }))}
                placeholder="/path/to/current-platform"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Include Categories</Label>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_CATEGORIES.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={config.includeCategories?.includes(category) || false}
                      onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                    />
                    <Label htmlFor={category} className="text-sm capitalize">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minPriority">Minimum Priority (1-10)</Label>
                <Input
                  id="minPriority"
                  type="number"
                  min="1"
                  max="10"
                  value={config.minPriority}
                  onChange={(e) => setConfig(prev => ({ ...prev, minPriority: parseInt(e.target.value) }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportFormat">Report Format</Label>
                <Select
                  value={config.reportFormat}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, reportFormat: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Summary */}
      {quickSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Features</p>
                  <p className="text-2xl font-bold">{quickSummary.totalFeaturesAnalyzed}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gaps Identified</p>
                  <p className="text-2xl font-bold">{quickSummary.gapsIdentified}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quick Wins</p>
                  <p className="text-2xl font-bold">{quickSummary.quickWins}</p>
                </div>
                <Zap className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Risk</p>
                  <div className="flex items-center space-x-2">
                    {getRiskIcon(quickSummary.overallRisk)}
                    <Badge 
                      variant="outline" 
                      style={{ borderColor: getRiskColor(quickSummary.overallRisk) }}
                    >
                      {quickSummary.overallRisk}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Results */}
      {result && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
            <TabsTrigger value="priority">Priority Matrix</TabsTrigger>
            <TabsTrigger value="roadmap">Implementation Roadmap</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Gaps:</span>
                    <Badge>{result.analysisResult.totalGaps}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>High Priority:</span>
                    <Badge variant="destructive">{result.analysisResult.highPriorityGaps}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Implementation Phases:</span>
                    <Badge variant="outline">{result.analysisResult.phases}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Effort:</span>
                    <Badge>{result.summary.estimatedEffort}h</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={riskData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {riskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.summary.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gaps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feature Gaps by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="gaps" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="priority" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Priority vs Complexity Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart data={priorityData}>
                    <CartesianGrid />
                    <XAxis 
                      type="number" 
                      dataKey="complexity" 
                      name="Complexity"
                      domain={[0, 4]}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="value" 
                      name="Business Value"
                      domain={[0, 4]}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="value" fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Implementation Roadmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: result.analysisResult.phases }, (_, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Phase {i + 1}</h4>
                        <Badge variant="outline">
                          Week {i * 2 + 1}-{(i + 1) * 2}
                        </Badge>
                      </div>
                      <Progress value={(i + 1) * 20} className="mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Estimated duration: {2} weeks
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Report Download */}
      {result?.exportedReportPath && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Analysis Report Generated</h4>
                <p className="text-sm text-muted-foreground">
                  Report ID: {result.report?.id}
                </p>
              </div>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}