import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useSystemColorScheme } from '@/hooks/use-system-color-scheme';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colorScheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleColorScheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const resolvedSystem = systemScheme === 'dark' ? 'dark' : 'light';
  const colorScheme = mode === 'system' ? resolvedSystem : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colorScheme,
      mode,
      setMode,
      toggleColorScheme: () => setMode(colorScheme === 'dark' ? 'light' : 'dark'),
    }),
    [colorScheme, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return ctx;
}
