'use client';

import { useAuthContext } from '@/contexts/AuthContext';

export const dynamic = 'force-dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { FeatureTogglePanel } from '@/components/admin/FeatureTogglePanel';
import { BrandingPanel } from '@/components/admin/BrandingPanel';
import { FunifierStatusPanel } from '@/components/admin/FunifierStatusPanel';
import { AdminOverview } from '@/components/admin/AdminOverview';
import SecurityPanel from '@/components/admin/SecurityPanel';
import { DemoModePanel } from '@/components/admin/DemoModePanel';
import { SystemNavigationHeader } from '@/components/navigation';
import { WhiteLabelFeatures } from '@/types/funifier';

function AdminPageContent() {
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [instanceId, setInstanceId] = useState<string>('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    } else if (!isLoading && isAuthenticated && !isAdmin) {
      router.push('/dashboard');
    }

    // Get instance ID from URL params or generate a default one
    const instance = searchParams.get('instance');
    if (instance) {
      setInstanceId(instance);
    } else {
      // Generate a default instance ID if none provided
      setInstanceId(`admin_${Date.now()}`);
    }
  }, [isAuthenticated, isAdmin, isLoading, router, searchParams]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleFeaturesUpdated = (features: WhiteLabelFeatures) => {
    // Handle feature updates if needed
    console.log('Features updated:', features);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'features', name: 'Feature Toggles', icon: '🎛️' },
    { id: 'branding', name: 'Branding', icon: '🎨' },
    { id: 'settings', name: 'Funifier Settings', icon: '⚙️' },
    { id: 'demo', name: 'Demo Mode', icon: '🎮' },
    { id: 'security', name: 'Security', icon: '🔒' }
  ];

  const handleNavigateToTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600">White-Label Configuration</p>
              {instanceId && (
                <p className="text-sm text-gray-500 mt-1">
                  Instance: <span className="font-mono">{instanceId}</span>
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* System Navigation */}
          <div className="pb-4 border-t border-gray-200 mt-4 pt-4">
            <SystemNavigationHeader />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Overview Tab */}
          {activeTab === 'overview' && user && (
            <AdminOverview
              user={user}
              instanceId={instanceId}
              onNavigateToTab={handleNavigateToTab}
            />
          )}

          {/* Feature Toggles Tab */}
          {activeTab === 'features' && (
            <FeatureTogglePanel
              instanceId={instanceId}
              userId={user?._id || 'unknown'}
              onFeaturesUpdated={handleFeaturesUpdated}
            />
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <BrandingPanel
              instanceId={instanceId}
              userId={user?._id || 'unknown'}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <FunifierStatusPanel
              instanceId={instanceId}
              userId={user?._id || 'unknown'}
            />
          )}

          {/* Demo Mode Tab */}
          {activeTab === 'demo' && (
            <DemoModePanel
              instanceId={instanceId}
              userId={user?._id || 'unknown'}
            />
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <SecurityPanel />
          )}

          {/* No Instance ID Warning */}
          {!instanceId && activeTab === 'features' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Instance ID Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Please provide an instance ID in the URL to manage features (e.g., ?instance=your-instance-id).</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}