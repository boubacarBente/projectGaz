'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/app/parametres/page';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, isLoading } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && mounted) {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [settings.theme, isLoading, mounted]);

  return <>{children}</>;
}
