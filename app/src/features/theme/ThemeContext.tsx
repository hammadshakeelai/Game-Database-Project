import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'night' | 'day';

const KEY = 'ttt-theme';

interface ThemeValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function read(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'day' || stored === 'night') return stored;
  } catch {
    // Storage can be blocked; night is the default either way.
  }
  return 'night';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // A viewer who cannot persist still gets the theme for this session.
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => (t === 'night' ? 'day' : 'night')), []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
}
