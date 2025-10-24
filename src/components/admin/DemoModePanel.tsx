'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemoMode } from '@/hooks/useDemoMode';

interface DemoModePanelProps {
  instanceId?: string;
  userId?: string;
}

export const DemoModePanel: React.FC<DemoModePanelProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isDemoMode, enableDemoMode, disableDemoMode, config } = useDemoMode();

  const handleEnterDemoMode = async () => {
    setIsLoading(true);
    try {
      // Enable demo mode
      enableDemoMode();
      
      // Generate a demo instance ID
      const demoInstanceId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      // Redirect to dashboard with demo instance
      router.push(`/dashboard?instance=${demoInstanceId}&mode=demo`);
    } catch (error) {
      console.error('Error entering demo mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitDemoMode = async () => {
    setIsLoading(true);
    try {
      disableDemoMode();
      router.push('/setup');
    } catch (error) {
      console.error('Error exiting demo mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          🎮 Demo Mode
        </h3>
        
        <div className="space-y-4">
          {/* Current Status */}
          {isDemoMode && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-orange-800">
                    Demo Mode Currently Active
                  </h4>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>Source: {config.source}</p>
                    {config.reason && <p className="text-xs mt-1">{config.reason}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  Demo Mode Features
                </h4>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Full platform functionality with sample data</li>
                    <li>No real Funifier API calls</li>
                    <li>Perfect for testing and demonstrations</li>
                    <li>All features enabled by default</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Note
                </h4>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Demo mode uses mock data and doesn&apos;t connect to real Funifier APIs. Use this for testing and demonstrations only.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {isDemoMode && (
              <button
                onClick={handleExitDemoMode}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Exit Demo Mode
              </button>
            )}
            <button
              onClick={handleEnterDemoMode}
              disabled={isLoading || isDemoMode}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isDemoMode ? 'Refreshing...' : 'Entering Demo Mode...'}
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isDemoMode ? 'Refresh Demo' : 'Enter Demo Mode'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};