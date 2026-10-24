import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { fetchAppConfig, saveAppConfig, subscribeToAppConfig, type AppConfig } from '@/services/app-config';

type AppConfigContextValue = {
  config: AppConfig | null;
  // Solo el superusuario: guarda y aplica al instante para todos (Realtime).
  save: (changes: Partial<Omit<AppConfig, 'actualizado'>>) => Promise<void>;
};

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchAppConfig().then((next) => active && setConfig(next));
    const unsubscribe = subscribeToAppConfig((next) => active && setConfig(next));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId]);

  const save = useCallback(async (changes: Partial<Omit<AppConfig, 'actualizado'>>) => {
    await saveAppConfig(changes);
    setConfig(await fetchAppConfig());
  }, []);

  return <AppConfigContext.Provider value={{ config, save }}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfigContextValue {
  const context = useContext(AppConfigContext);
  if (!context) throw new Error('useAppConfig debe usarse dentro de <AppConfigProvider>');
  return context;
}
