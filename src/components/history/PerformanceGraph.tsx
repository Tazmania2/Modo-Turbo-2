'use client';

import React from 'react';
import { PerformanceGraph as PerformanceGraphData } from '../../types/dashboard';

interface PerformanceGraphProps {
  data: PerformanceGraphData[];
  title: string;
  type: 'points' | 'position';
  isLoading?: boolean;
}

/**
 * Performance graph component for visualizing trends
 * Implements requirement 3.3: Display performance trends and progress visualization
 */
export function PerformanceGraph({
  data,
  title,
  type,
  isLoading = false
}: PerformanceGraphProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-sm">No data available</div>
            <div className="text-xs mt-1">
              Performance data will appear here once available
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate min/max values for scaling
  const values = data.map(d => type === 'points' ? d.points : d.position);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // For position graphs, we want lower positions (better ranks) at the top
  const isPositionGraph = type === 'position';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            {type === 'points' ? 'Points' : 'Position'}
          </div>
        </div>
      </div>

      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
          <span>{isPositionGraph ? minValue : maxValue}</span>
          <span>{isPositionGraph ? Math.ceil((minValue + maxValue) / 2) : Math.ceil((minValue + maxValue) / 2)}</span>
          <span>{isPositionGraph ? maxValue : minValue}</span>
        </div>

        {/* Graph area */}
        <div className="ml-8 h-full relative">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="10" height="20" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            {/* Performance line */}
            {data.length > 1 && (
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points={data.map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const value = type === 'points' ? point.points : point.position;
                  let y;
                  
                  if (isPositionGraph) {
                    // For positions, invert the scale (lower position = higher on graph)
                    y = ((maxValue - value) / range) * 100;
                  } else {
                    // For points, normal scale
                    y = ((maxValue - value) / range) * 100;
                  }
                  
                  return `${x},${y}`;
                }).join(' ')}
              />
            )}

            {/* Data points */}
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const value = type === 'points' ? point.points : point.position;
              let y;
              
              if (isPositionGraph) {
                y = ((maxValue - value) / range) * 100;
              } else {
                y = ((maxValue - value) / range) * 100;
              }

              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="#3b82f6"
                  className="hover:r-2 transition-all cursor-pointer"
                >
                  <title>
                    {formatDate(point.date)}: {value.toLocaleString()} {type === 'points' ? 'points' : ''}
                  </title>
                </circle>
              );
            })}
          </svg>

          {/* X-axis labels */}
          <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-500">
            <span>{formatDate(data[0].date)}</span>
            {data.length > 2 && (
              <span>{formatDate(data[Math.floor(data.length / 2)].date)}</span>
            )}
            <span>{formatDate(data[data.length - 1].date)}</span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {type === 'points' ? 'Total Points' : 'Best Position'}
          </div>
          <div className="text-lg font-semibold text-blue-600">
            {type === 'points' 
              ? Math.max(...values).toLocaleString()
              : `#${Math.min(...values)}`
            }
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {type === 'points' ? 'Average' : 'Average Position'}
          </div>
          <div className="text-lg font-semibold text-gray-600">
            {type === 'points' 
              ? Math.round(values.reduce((a, b) => a + b, 0) / values.length).toLocaleString()
              : `#${Math.round(values.reduce((a, b) => a + b, 0) / values.length)}`
            }
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            Trend
          </div>
          <div className="text-lg font-semibold">
            {getTrend(values, type)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Helper function to calculate trend
 */
function getTrend(values: number[], type: 'points' | 'position'): string {
  if (values.length < 2) return '—';
  
  const first = values[0];
  const last = values[values.length - 1];
  
  if (type === 'points') {
    if (last > first) return '📈';
    if (last < first) return '📉';
    return '➡️';
  } else {
    // For positions, lower is better
    if (last < first) return '📈';
    if (last > first) return '📉';
    return '➡️';
  }
}