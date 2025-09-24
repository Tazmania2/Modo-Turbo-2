'use client';

import { SetupMode } from '@/types/white-label';

export interface SetupProgressProps {
  mode: SetupMode;
}

export function SetupProgress({ mode }: SetupProgressProps) {
  const steps = mode === 'demo' 
    ? [
        'Initializing demo environment',
        'Generating sample data',
        'Creating default configuration',
        'Setting up dashboard',
        'Finalizing setup'
      ]
    : [
        'Validating Funifier credentials',
        'Testing API connection',
        'Creating white-label configuration',
        'Setting up admin access',
        'Finalizing setup'
      ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Setting Up Your Platform
        </h2>
        <p className="text-gray-600">
          {mode === 'demo' 
            ? 'Creating your demo environment with sample data...'
            : 'Connecting to Funifier and configuring your platform...'
          }
        </p>
      </div>

      {/* Animated Progress Circle */}
      <div className="flex justify-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray="251.2"
              strokeDashoffset="62.8"
              className="text-blue-600 transition-all duration-1000 ease-in-out"
              style={{
                animation: 'progress 3s ease-in-out infinite'
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">{step}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Estimated Time */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Estimated time:</span> {mode === 'demo' ? '10-15 seconds' : '30-45 seconds'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Please don&apos;t close this window while setup is in progress
        </p>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% {
            stroke-dashoffset: 251.2;
          }
          50% {
            stroke-dashoffset: 125.6;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}