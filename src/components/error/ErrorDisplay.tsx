'use client';

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Copy, CheckCircle } from 'lucide-react';

interface ErrorDisplayProps {
  title: string;
  message: string;
  errorId?: string;
  onRetry?: () => void;
  showDetails?: boolean;
  details?: string;
  actions?: React.ReactNode;
  variant?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({
  title,
  message,
  errorId,
  onRetry,
  showDetails = false,
  details,
  actions,
  variant = 'error'
}: ErrorDisplayProps) {
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyErrorId = async () => {
    if (errorId) {
      try {
        await navigator.clipboard.writeText(errorId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy error ID:', err);
      }
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700'
        };
      default:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`rounded-lg border p-6 ${styles.container}`}>
      <div className="flex items-start space-x-3">
        <AlertTriangle className={`h-6 w-6 flex-shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold ${styles.title}`}>
            {title}
          </h3>
          <p className={`mt-2 text-sm ${styles.message}`}>
            {message}
          </p>

          {errorId && (
            <div className="mt-3 flex items-center space-x-2">
              <span className="text-xs text-gray-500">Error ID:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                {errorId}
              </code>
              <button
                onClick={handleCopyErrorId}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                title="Copy error ID"
              >
                {copied ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          )}

          {showDetails && details && (
            <div className="mt-4">
              <button
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
              >
                {showFullDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>{showFullDetails ? 'Hide' : 'Show'} technical details</span>
              </button>

              {showFullDetails && (
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                  <pre className="whitespace-pre-wrap">{details}</pre>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </button>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

// Specialized error displays for common scenarios
export function NetworkErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Connection Problem"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      variant="warning"
    />
  );
}

export function FunifierErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Service Unavailable"
      message="The gamification service is temporarily unavailable. Please try again in a few moments."
      onRetry={onRetry}
      variant="warning"
    />
  );
}

export function ConfigurationErrorDisplay() {
  return (
    <ErrorDisplay
      title="Configuration Error"
      message="There's an issue with the system configuration. Please contact your administrator for assistance."
      variant="error"
      actions={
        <a
          href="/admin"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go to Admin Panel
        </a>
      }
    />
  );
}