'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

interface OfflineContextType {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isSlowConnection: false,
  connectionType: null,
});

export function useOfflineDetection() {
  return useContext(OfflineContext);
}

interface OfflineDetectorProps {
  children: ReactNode;
  onOnline?: () => void;
  onOffline?: () => void;
  showBanner?: boolean;
}

/**
 * Provider component that detects online/offline status
 * and provides context to child components
 */
export function OfflineDetector({
  children,
  onOnline,
  onOffline,
  showBanner = true,
}: OfflineDetectorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection?.effectiveType || null);
      setIsSlowConnection(connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g');
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
      if (onOnline) {
        onOnline();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      if (onOffline) {
        onOffline();
      }
    };

    const handleConnectionChange = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const effectiveType = connection?.effectiveType;
        setConnectionType(effectiveType || null);
        setIsSlowConnection(effectiveType === 'slow-2g' || effectiveType === '2g');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [onOnline, onOffline]);

  return (
    <OfflineContext.Provider value={{ isOnline, isSlowConnection, connectionType }}>
      {showBanner && showOfflineBanner && <OfflineBanner />}
      {showBanner && isSlowConnection && isOnline && <SlowConnectionBanner />}
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Banner that appears when offline
 */
function OfflineBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-center space-x-3">
        <WifiOff className="h-5 w-5" />
        <p className="text-sm font-medium">
          You are currently offline. Some features may not be available.
        </p>
      </div>
    </div>
  );
}

/**
 * Banner that appears when connection is slow
 */
function SlowConnectionBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">
            Your connection appears to be slow. Loading may take longer than usual.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white hover:text-gray-200 text-sm font-medium"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/**
 * Component that shows different content based on online status
 */
interface OfflineGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function OfflineGuard({ children, fallback }: OfflineGuardProps) {
  const { isOnline } = useOfflineDetection();

  if (!isOnline) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-8">
          <WifiOff className="h-16 w-16 text-gray-400" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">You're Offline</h3>
            <p className="text-sm text-gray-600 max-w-md">
              This feature requires an internet connection. Please check your connection and try again.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      )
    );
  }

  return <>{children}</>;
}

/**
 * Inline offline indicator
 */
export function OfflineIndicator() {
  const { isOnline, isSlowConnection } = useOfflineDetection();

  if (isOnline && !isSlowConnection) return null;

  return (
    <div className="flex items-center space-x-2 text-sm">
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Offline</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-600">Slow Connection</span>
        </>
      )}
    </div>
  );
}

/**
 * Hook for checking online status with periodic polling
 */
export function useOnlineStatus(pollInterval = 30000) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastChecked, setLastChecked] = useState(Date.now());

  useEffect(() => {
    const checkOnlineStatus = async () => {
      try {
        // Try to fetch a small resource to verify actual connectivity
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      }
      setLastChecked(Date.now());
    };

    // Check immediately
    checkOnlineStatus();

    // Set up polling
    const interval = setInterval(checkOnlineStatus, pollInterval);

    // Listen to browser events
    const handleOnline = () => {
      setIsOnline(true);
      checkOnlineStatus();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pollInterval]);

  return { isOnline, lastChecked };
}
