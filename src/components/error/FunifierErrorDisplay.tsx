'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Wifi,
  Lock,
  Settings,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { UserFriendlyError, ErrorAction } from '@/services/error-handler.service';
import { useRouter } from 'next/navigation';

interface FunifierErrorDisplayProps {
  error: UserFriendlyError;
  onRetry?: () => void;
  showTechnicalDetails?: boolean;
  compact?: boolean;
}

/**
 * Enhanced error display component for Funifier API errors
 * Shows user-friendly messages with actionable suggestions
 */
export function FunifierErrorDisplay({
  error,
  onRetry,
  showTechnicalDetails = process.env.NODE_ENV === 'development',
  compact = false,
}: FunifierErrorDisplayProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  const getSeverityStyles = () => {
    switch (error.severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-300',
          icon: 'text-red-700',
          title: 'text-red-900',
          message: 'text-red-800',
        };
      case 'high':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
        };
      case 'low':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-800',
          message: 'text-gray-700',
        };
    }
  };

  const getActionIcon = (action: ErrorAction) => {
    switch (action) {
      case 'REDIRECT_TO_LOGIN':
        return <Lock className="h-4 w-4" />;
      case 'RETRY_WITH_BACKOFF':
      case 'RETRY_ONCE':
        return <RefreshCw className="h-4 w-4" />;
      case 'CHECK_CONFIGURATION':
        return <Settings className="h-4 w-4" />;
      case 'CONTACT_SUPPORT':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleAction = () => {
    switch (error.action) {
      case 'REDIRECT_TO_LOGIN':
        router.push('/login');
        break;
      case 'RETRY_WITH_BACKOFF':
      case 'RETRY_ONCE':
        if (onRetry) onRetry();
        break;
      case 'CHECK_CONFIGURATION':
        router.push('/admin');
        break;
      case 'REFRESH_PAGE':
        window.location.reload();
        break;
      case 'SHOW_SETUP_GUIDE':
        router.push('/setup');
        break;
      default:
        break;
    }
  };

  const getActionLabel = (action: ErrorAction): string => {
    switch (action) {
      case 'REDIRECT_TO_LOGIN':
        return 'Go to Login';
      case 'RETRY_WITH_BACKOFF':
      case 'RETRY_ONCE':
        return 'Try Again';
      case 'CHECK_CONFIGURATION':
        return 'Check Configuration';
      case 'REFRESH_PAGE':
        return 'Refresh Page';
      case 'SHOW_SETUP_GUIDE':
        return 'Setup Guide';
      case 'CONTACT_SUPPORT':
        return 'Contact Support';
      case 'WAIT_AND_RETRY':
        return 'Wait and Retry';
      default:
        return 'Dismiss';
    }
  };

  const styles = getSeverityStyles();

  if (compact) {
    return (
      <div className={`rounded-md border p-4 ${styles.container}`}>
        <div className="flex items-center space-x-3">
          <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${styles.icon}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${styles.message}`}>{error.message}</p>
          </div>
          {error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="flex-shrink-0 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-6 ${styles.container}`}>
      <div className="flex items-start space-x-4">
        <AlertTriangle className={`h-6 w-6 flex-shrink-0 mt-0.5 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold ${styles.title}`}>
            {error.severity === 'critical' ? 'Critical Error' : 'Error Occurred'}
          </h3>
          <p className={`mt-2 text-sm ${styles.message}`}>{error.message}</p>

          {error.errorCode && (
            <div className="mt-3 flex items-center space-x-2">
              <span className="text-xs text-gray-500">Error Code:</span>
              <code className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded font-mono">
                {error.errorCode}
              </code>
            </div>
          )}

          {error.suggestions && error.suggestions.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {showSuggestions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>Suggestions ({error.suggestions.length})</span>
              </button>

              {showSuggestions && (
                <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
                  {error.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showTechnicalDetails && error.details && (
            <div className="mt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
              >
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>{showDetails ? 'Hide' : 'Show'} technical details</span>
              </button>

              {showDetails && (
                <div className="mt-2 p-3 bg-white bg-opacity-50 rounded text-xs font-mono overflow-auto max-h-40">
                  <pre className="whitespace-pre-wrap">
                    {typeof error.details === 'string' 
                      ? error.details 
                      : JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {error.action !== 'NONE' && (
              <button
                onClick={handleAction}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                {getActionIcon(error.action)}
                <span>{getActionLabel(error.action)}</span>
              </button>
            )}

            {error.retryable && onRetry && error.action === 'NONE' && (
              <button
                onClick={onRetry}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            )}

            {error.severity === 'critical' && (
              <a
                href="/admin"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Admin Panel</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Specialized error displays for common Funifier scenarios
 */
export function FunifierAuthenticationError({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();

  return (
    <FunifierErrorDisplay
      error={{
        message: 'Your session has expired. Please log in again to continue.',
        action: 'REDIRECT_TO_LOGIN',
        retryable: false,
        errorCode: 'AUTH_EXPIRED',
        severity: 'high',
        suggestions: [
          'Click the button below to go to the login page',
          'Make sure you remember your credentials',
          'Contact support if you cannot access your account',
        ],
      }}
      onRetry={() => router.push('/login')}
    />
  );
}

export function FunifierNetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <FunifierErrorDisplay
      error={{
        message: 'Unable to connect to the Funifier service. Please check your connection.',
        action: 'RETRY_WITH_BACKOFF',
        retryable: true,
        errorCode: 'NET_ERROR',
        severity: 'medium',
        suggestions: [
          'Check your internet connection',
          'Verify the Funifier service is online',
          'Try again in a few moments',
          'Contact your administrator if the problem persists',
        ],
      }}
      onRetry={onRetry}
    />
  );
}

export function FunifierServiceUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <FunifierErrorDisplay
      error={{
        message: 'The Funifier service is temporarily unavailable. Please try again shortly.',
        action: 'RETRY_WITH_BACKOFF',
        retryable: true,
        errorCode: 'SERVICE_UNAVAILABLE',
        severity: 'high',
        suggestions: [
          'Wait a few moments and try again',
          'Check if there is scheduled maintenance',
          'The service should be back online soon',
        ],
      }}
      onRetry={onRetry}
    />
  );
}

export function FunifierConfigurationError() {
  return (
    <FunifierErrorDisplay
      error={{
        message: 'There is a configuration issue. Please check your system settings.',
        action: 'CHECK_CONFIGURATION',
        retryable: false,
        errorCode: 'CONFIG_ERROR',
        severity: 'critical',
        suggestions: [
          'Go to the admin panel to verify configuration',
          'Check Funifier API credentials',
          'Ensure all required settings are configured',
          'Contact your administrator for assistance',
        ],
      }}
    />
  );
}

export function FunifierDataNotFound({ resourceName, onRetry }: { resourceName?: string; onRetry?: () => void }) {
  return (
    <FunifierErrorDisplay
      error={{
        message: `${resourceName || 'The requested data'} was not found. This might be a new configuration.`,
        action: 'SHOW_SETUP_GUIDE',
        retryable: false,
        errorCode: 'NOT_FOUND',
        severity: 'medium',
        suggestions: [
          'Verify the resource exists in Funifier',
          'Complete initial setup if this is a new installation',
          'Check if you have the correct permissions',
        ],
      }}
    />
  );
}
