'use client';

import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';

export const RankingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonLoader width={180} height={32} variant="rounded" />
        <SkeletonLoader width={100} height={36} variant="rounded" />
      </div>

      {/* Race visualization skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <SkeletonLoader width={200} height={24} className="mb-6" />
        <div className="relative h-32 bg-gray-100 rounded-lg mb-4">
          {/* Race track skeleton */}
          <SkeletonLoader width="100%" height={4} className="absolute top-1/2 transform -translate-y-1/2" />
          {/* Player positions */}
          {[20, 45, 70, 85].map((position, index) => (
            <div
              key={index}
              className="absolute top-1/2 transform -translate-y-1/2"
              style={{ left: `${position}%` }}
            >
              <SkeletonLoader
                width={32}
                height={32}
                variant="circular"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Personal ranking card skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <SkeletonLoader width={64} height={64} variant="circular" />
          <div className="flex-1">
            <SkeletonLoader width={150} height={24} className="mb-2" />
            <SkeletonLoader width={100} height={20} className="mb-1" />
            <SkeletonLoader width={80} height={16} />
          </div>
          <div className="text-right">
            <SkeletonLoader width={60} height={32} className="mb-1" />
            <SkeletonLoader width={40} height={16} />
          </div>
        </div>
      </div>

      {/* Contextual ranking skeleton */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <SkeletonLoader width={160} height={24} className="mb-4" />
        
        {/* Top 3 skeleton */}
        <div className="space-y-3 mb-4">
          {[1, 2, 3].map((position) => (
            <div key={position} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <SkeletonLoader width={24} height={24} variant="rounded" />
              <SkeletonLoader width={40} height={40} variant="circular" />
              <div className="flex-1">
                <SkeletonLoader width={120} height={18} className="mb-1" />
                <SkeletonLoader width={80} height={14} />
              </div>
              <SkeletonLoader width={60} height={20} />
            </div>
          ))}
        </div>

        {/* Divider */}
        <SkeletonLoader width="100%" height={1} className="my-4" />

        {/* User context skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg">
              <SkeletonLoader width={24} height={24} variant="rounded" />
              <SkeletonLoader width={40} height={40} variant="circular" />
              <div className="flex-1">
                <SkeletonLoader width={120} height={18} className="mb-1" />
                <SkeletonLoader width={80} height={14} />
              </div>
              <SkeletonLoader width={60} height={20} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};