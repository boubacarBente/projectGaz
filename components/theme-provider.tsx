'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { toast } from 'react-toastify';

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

  useEffect(() => {
    // Load theme from API (SQLite) or localStorage
    async function loadTheme() {
      try {
        const res = await fetch('/api/parametres');
        const data = await res.json();
        const serverTheme = data.theme || 'light';
        setTheme(serverTheme);
        localStorage.setItem(THEME_KEY, serverTheme);
      } catch {
        // Fallback to localStorage
        const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
        if (saved) setTheme(saved);
        else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadTheme();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Apply theme class
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme, isLoading]);

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    // Save to database in background (optional - will work offline)
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
