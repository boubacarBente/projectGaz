'use client';

import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { toast } from 'react-toastify';
import { applyThemeColors } from '@/lib/colors';

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

// Fonction pour charger les couleurs depuis les settings et les appliquer
async function loadAndApplyColors(isDark: boolean) {
  try {
    const res = await fetch('/api/parametres');
    const data = await res.json();
    applyThemeColors(
      data.primaryColor || '#1e40af',
      data.sidebarColor || '#1e293b',
      isDark,
    );
  } catch {
    // Si erreur, appliquer les couleurs par défaut
    applyThemeColors('#1e40af', '#1e293b', isDark);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  const applyTheme = useCallback((newTheme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Appliquer aussi les couleurs sauvegardées
    loadAndApplyColors(newTheme === 'dark');
  }, []);

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
  }, [applyTheme]);

  const handleSetTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);

    const themeName = newTheme === 'dark' ? 'Mode Nuit' : 'Mode Jour';
    const themeIcon = newTheme === 'dark' ? '🌙' : '☀️';
    toast.success(`${themeIcon} Thème changé pour ${themeName}`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: newTheme,
    });
    
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
