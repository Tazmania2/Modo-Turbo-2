'use client';

import { useEffect, useState } from 'react';
import { demoModeService } from '@/services/demo-mode.service';

/**
 * Visual indicator that shows when the system is running in demo mode
 * This component should be included in the main layout
 */
export const DemoModeIndicator: React.FC = () => {
  const [indicator, setIndicator] = useState<{
    show: boolean;
    message: string;
    color: string;
    icon: string;
  } | null>(null);

  useEffect(() => {
    const indicatorConfig = demoModeService.getVisualIndicator();
    setIndicator(indicatorConfig);
  }, []);

  if (!indicator?.show) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium text-white shadow-lg"
      style={{ backgroundColor: indicator.color }}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">{indicator.icon}</span>
        <span>{indicator.message}</span>
        <span className="text-xs opacity-75">
          (Using mock data for demonstration)
        </span>
      </div>
    </div>
  );
};
