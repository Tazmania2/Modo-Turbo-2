'use client';

import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonLoader width={200} height={32} variant="rounded" />
        <SkeletonLoader width={120} height={40} variant="rounded" />
      </div>

      {/* Points display skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <SkeletonLoader width={150} height={24} className="mb-4" />
        <SkeletonLoader width={100} height={48} variant="rounded" />
      </div>

      {/* Goals grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <SkeletonLoader width={120} height={20} />
              <SkeletonLoader width={40} height={40} variant="circular" />
            </div>
            <SkeletonLoader width="100%" height={8} variant="rounded" className="mb-2" />
            <SkeletonLoader width={80} height={16} />
          </div>
        ))}
      </div>

      {/* Cycle progress skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <SkeletonLoader width={180} height={24} className="mb-4" />
        <SkeletonLoader width="100%" height={12} variant="rounded" className="mb-2" />
        <div className="flex justify-between">
          <SkeletonLoader width={60} height={16} />
          <SkeletonLoader width={80} height={16} />
        </div>
      </div>
    </div>
  );
};