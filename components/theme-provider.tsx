'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';

const THEME_KEY = 'app-theme';

type ThemeContextType = {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  isLoading: true,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme instantly to the document
  const applyTheme = (newTheme: 'light' | 'dark') => {
    // Apply both data-theme attribute (for DaisyUI) and class (for our CSS)
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    async function loadTheme() {
      try {
        const res = await fetch('/api/parametres');
        const data = await res.json();
        const serverTheme = data.theme || 'light';
        setTheme(serverTheme);
        applyTheme(serverTheme);
        localStorage.setItem(THEME_KEY, serverTheme);
      } catch {
        const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
        if (saved) {
          setTheme(saved);
          applyTheme(saved);
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const newTheme = prefersDark ? 'dark' : 'light';
          setTheme(newTheme);
          applyTheme(newTheme);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, []);

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    // Apply instantly for immediate feedback
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    
    // Save to database in background
    try {
      await fetch('/api/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch {
      // Ignore errors - localStorage already has the value
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}
