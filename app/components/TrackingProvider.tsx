'use client';

import { useEffect } from 'react';
import { initTracking } from '@/lib/tracking';

export default function TrackingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initTracking();
  }, []);

  return <>{children}</>;
}









