'use client';

import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

/**
 * Skeleton loader for Funifier dashboard data
 */
export function FunifierDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-3">
        <SkeletonLoader variant="text" width="60%" height={32} />
        <SkeletonLoader variant="text" width="40%" height={20} />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <SkeletonLoader variant="text" width="50%" height={16} />
            <SkeletonLoader variant="text" width="70%" height={28} />
            <SkeletonLoader variant="text" width="40%" height={14} />
          </div>
        ))}
      </div>

      {/* Goals section skeleton */}
      <div className="space-y-4">
        <SkeletonLoader variant="text" width="30%" height={24} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <SkeletonLoader variant="text" width="60%" height={20} />
              <SkeletonLoader variant="rounded" width="100%" height={8} />
              <div className="flex justify-between">
                <SkeletonLoader variant="text" width="30%" height={14} />
                <SkeletonLoader variant="text" width="20%" height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements skeleton */}
      <div className="space-y-4">
        <SkeletonLoader variant="text" width="35%" height={24} />
        <div className="flex space-x-4 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-32 space-y-2">
              <SkeletonLoader variant="circular" width={80} height={80} className="mx-auto" />
              <SkeletonLoader variant="text" width="100%" height={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Funifier ranking data
 */
export function FunifierRankingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-3">
        <SkeletonLoader variant="text" width="50%" height={32} />
        <SkeletonLoader variant="text" width="35%" height={20} />
      </div>

      {/* Filters skeleton */}
      <div className="flex space-x-3">
        {[1, 2, 3].map((i) => (
          <SkeletonLoader key={i} variant="rounded" width={100} height={36} />
        ))}
      </div>

      {/* Top 3 podium skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* 2nd place */}
        <div className="flex flex-col items-center space-y-2 pt-8">
          <SkeletonLoader variant="circular" width={60} height={60} />
          <SkeletonLoader variant="text" width="80%" height={16} />
          <SkeletonLoader variant="text" width="60%" height={14} />
        </div>
        {/* 1st place */}
        <div className="flex flex-col items-center space-y-2">
          <SkeletonLoader variant="circular" width={80} height={80} />
          <SkeletonLoader variant="text" width="80%" height={16} />
          <SkeletonLoader variant="text" width="60%" height={14} />
        </div>
        {/* 3rd place */}
        <div className="flex flex-col items-center space-y-2 pt-12">
          <SkeletonLoader variant="circular" width={60} height={60} />
          <SkeletonLoader variant="text" width="80%" height={16} />
          <SkeletonLoader variant="text" width="60%" height={14} />
        </div>
      </div>

      {/* Ranking list skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <SkeletonLoader variant="text" width={40} height={24} />
            <SkeletonLoader variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="text" width="40%" height={18} />
              <SkeletonLoader variant="text" width="25%" height={14} />
            </div>
            <SkeletonLoader variant="text" width={80} height={20} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Funifier user profile
 */
export function FunifierProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Profile header skeleton */}
      <div className="flex items-center space-x-6">
        <SkeletonLoader variant="circular" width={120} height={120} />
        <div className="flex-1 space-y-3">
          <SkeletonLoader variant="text" width="40%" height={28} />
          <SkeletonLoader variant="text" width="30%" height={20} />
          <div className="flex space-x-4">
            <SkeletonLoader variant="rounded" width={100} height={32} />
            <SkeletonLoader variant="rounded" width={100} height={32} />
          </div>
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center space-y-2">
            <SkeletonLoader variant="text" width="60%" height={32} className="mx-auto" />
            <SkeletonLoader variant="text" width="80%" height={16} className="mx-auto" />
          </div>
        ))}
      </div>

      {/* Recent activity skeleton */}
      <div className="space-y-4">
        <SkeletonLoader variant="text" width="30%" height={24} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3 p-3 border rounded-lg">
              <SkeletonLoader variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <SkeletonLoader variant="text" width="70%" height={16} />
                <SkeletonLoader variant="text" width="40%" height={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Funifier white label configuration
 */
export function FunifierConfigSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Section header */}
      <div className="space-y-2">
        <SkeletonLoader variant="text" width="40%" height={28} />
        <SkeletonLoader variant="text" width="60%" height={18} />
      </div>

      {/* Form fields skeleton */}
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonLoader variant="text" width="25%" height={16} />
            <SkeletonLoader variant="rounded" width="100%" height={40} />
          </div>
        ))}
      </div>

      {/* Color picker skeleton */}
      <div className="space-y-4">
        <SkeletonLoader variant="text" width="30%" height={20} />
        <div className="flex space-x-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} variant="circular" width={48} height={48} />
          ))}
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="flex space-x-3 pt-4">
        <SkeletonLoader variant="rounded" width={120} height={40} />
        <SkeletonLoader variant="rounded" width={100} height={40} />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for Funifier admin overview
 */
export function FunifierAdminSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonLoader variant="text" width="35%" height={32} />
        <SkeletonLoader variant="text" width="50%" height={18} />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <SkeletonLoader variant="text" width="60%" height={16} />
            <SkeletonLoader variant="text" width="40%" height={28} />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-4">
        <SkeletonLoader variant="text" width="25%" height={24} />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonLoader key={i} variant="rounded" width="100%" height={48} />
          ))}
        </div>
      </div>

      {/* Recent activity table */}
      <div className="space-y-4">
        <SkeletonLoader variant="text" width="30%" height={24} />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-3 border rounded">
              <SkeletonLoader variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <SkeletonLoader variant="text" width="50%" height={16} />
                <SkeletonLoader variant="text" width="30%" height={14} />
              </div>
              <SkeletonLoader variant="text" width={80} height={16} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic card skeleton for Funifier data
 */
export function FunifierCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <SkeletonLoader variant="text" width="60%" height={20} />
            <SkeletonLoader variant="circular" width={32} height={32} />
          </div>
          <SkeletonLoader variant="text" width="100%" height={16} />
          <SkeletonLoader variant="text" width="80%" height={16} />
          <div className="flex justify-between items-center pt-2">
            <SkeletonLoader variant="text" width="40%" height={14} />
            <SkeletonLoader variant="rounded" width={80} height={28} />
          </div>
        </div>
      ))}
    </>
  );
}
