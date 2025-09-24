'use client';

import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

export const HistorySkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonLoader width={160} height={32} variant="rounded" />
        <SkeletonLoader width={120} height={36} variant="rounded" />
      </div>

      {/* Season navigation skeleton */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((index) => (
          <SkeletonLoader key={index} width={100} height={36} variant="rounded" className="flex-shrink-0" />
        ))}
      </div>

      {/* Performance graph skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <SkeletonLoader width={180} height={24} className="mb-6" />
        <div className="h-64 bg-gray-100 rounded-lg relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <SkeletonLoader key={index} width={40} height={16} />
            ))}
          </div>
          {/* Graph area */}
          <div className="ml-12 h-full flex items-end justify-between px-4 pb-8">
            {[1, 2, 3, 4, 5, 6, 7].map((index) => (
              <SkeletonLoader
                key={index}
                width={20}
                height={Math.random() * 150 + 50}
                variant="rounded"
              />
            ))}
          </div>
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-12 right-0 flex justify-between px-4">
            {[1, 2, 3, 4, 5, 6, 7].map((index) => (
              <SkeletonLoader key={index} width={30} height={16} />
            ))}
          </div>
        </div>
      </div>

      {/* Season details skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <SkeletonLoader width={140} height={24} className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="text-center">
              <SkeletonLoader width={60} height={32} className="mx-auto mb-2" />
              <SkeletonLoader width={80} height={16} className="mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Achievements skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <SkeletonLoader width={120} height={24} className="mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <SkeletonLoader width={48} height={48} variant="circular" className="mb-2" />
              <SkeletonLoader width={80} height={16} className="mb-1" />
              <SkeletonLoader width={60} height={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};