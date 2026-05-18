import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'standard' | 'retro' | 'neon' | 'minimalist';
type Mode = 'dark' | 'bright';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const MODE_KEY = 'sttt_mode';

function readStoredMode(): Mode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'bright' ? 'bright' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('standard');
  const [mode, setModeState] = useState<Mode>(readStoredMode);

  useEffect(() => {
    const root = document.documentElement;
    // Keep theme class (retro/neon/minimalist) AND mode class (bright/dark).
    root.classList.remove('retro', 'neon', 'minimalist', 'bright', 'dark');
    if (theme !== 'standard') root.classList.add(theme);
    root.classList.add(mode);
  }, [theme, mode]);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'bright' : 'dark');
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
