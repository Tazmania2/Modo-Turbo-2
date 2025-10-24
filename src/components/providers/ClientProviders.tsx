'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { DemoModeIndicator } from '@/components/common/DemoModeIndicator';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <DemoModeIndicator />
      {children}
    </AuthProvider>
  );
}
