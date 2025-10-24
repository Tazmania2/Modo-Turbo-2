'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  requiresAdmin: boolean;
  description?: string;
}

export interface SystemNavigationProps {
  className?: string;
  variant?: 'sidebar' | 'header' | 'mobile';
  showLabels?: boolean;
}

/**
 * SystemNavigation Component
 * 
 * Provides seamless navigation across admin and user interfaces
 * with role-based visibility and authentication-aware routing
 */
export const SystemNavigation: React.FC<SystemNavigationProps> = ({
  className,
  variant = 'sidebar',
  showLabels = true,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isAdmin, isLoading } = useAuthContext();

  const navigationItems: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      requiresAuth: true,
      requiresAdmin: false,
      description: 'View your personal dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Ranking',
      href: '/ranking',
      requiresAuth: true,
      requiresAdmin: false,
      description: 'View rankings and leaderboards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      name: 'History',
      href: '/history',
      requiresAuth: true,
      requiresAdmin: false,
      description: 'View your performance history',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Admin Panel',
      href: '/admin',
      requiresAuth: true,
      requiresAdmin: true,
      description: 'Manage system configuration',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  // Filter navigation items based on authentication and role
  const visibleItems = navigationItems.filter((item) => {
    // Show all items if loading (will be hidden by parent)
    if (isLoading) return false;

    // Check authentication requirement
    if (item.requiresAuth && !isAuthenticated) return false;

    // Check admin requirement
    if (item.requiresAdmin && !isAdmin) return false;

    return true;
  });

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('animate-pulse', className)}>
        {variant === 'sidebar' && (
          <div className="space-y-2 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <nav className={cn('px-4 py-6 space-y-2', className)}>
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Navigation
          </h2>
        </div>

        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
              title={item.description}
            >
              <span
                className={cn(
                  'mr-3 flex-shrink-0',
                  isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                )}
              >
                {item.icon}
              </span>
              {showLabels && item.name}
            </Link>
          );
        })}

        {/* Authentication Status */}
        {isAuthenticated && (
          <div className="pt-6 mt-6 border-t border-gray-200">
            <div className="px-3 py-2 text-xs text-gray-500">
              {isAdmin ? (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Admin Access</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>User Access</span>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    );
  }

  // Header variant
  if (variant === 'header') {
    return (
      <nav className={cn('flex items-center space-x-1', className)}>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )}
              title={item.description}
            >
              <span className="mr-2">{item.icon}</span>
              {showLabels && item.name}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Mobile variant
  if (variant === 'mobile') {
    return (
      <nav className={cn('grid grid-cols-2 gap-2 p-4', className)}>
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-500'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
              )}
            >
              <span className={cn('mb-2', isActive ? 'text-blue-500' : 'text-gray-400')}>
                {item.icon}
              </span>
              {showLabels && (
                <span className="text-xs font-medium">{item.name}</span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  return null;
};

/**
 * SystemNavigationHeader Component
 * 
 * Compact navigation for page headers
 */
export const SystemNavigationHeader: React.FC<{ className?: string }> = ({ className }) => {
  return <SystemNavigation variant="header" className={className} />;
};

/**
 * SystemNavigationMobile Component
 * 
 * Mobile-optimized navigation
 */
export const SystemNavigationMobile: React.FC<{ className?: string }> = ({ className }) => {
  return <SystemNavigation variant="mobile" className={className} />;
};
