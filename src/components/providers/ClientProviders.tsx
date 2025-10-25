'use client';

import { ReactNode, useEffect, useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { DemoModeIndicator } from '@/components/common/DemoModeIndicator';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // During SSR or initial hydration, render without providers
  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <DemoModeIndicator />
      {children}
    </AuthProvider>
  );
}
