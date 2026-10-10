import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { FRAMEWORKS, type Framework } from '@/data/frameworks';
import { LANGUAGES, type ProgrammingLanguage } from '@/data/languages';
import { fetchCatalog, subscribeToCatalogChanges } from '@/services/catalog-api';
import { isSupabaseConfigured } from '@/services/supabase';

export type CatalogSource = 'local' | 'supabase';

type CatalogContextValue = {
  languages: ProgrammingLanguage[];
  frameworks: Framework[];
  source: CatalogSource;
  loading: boolean;
  error: string | null;
  reload: () => void;
  getLanguageById: (id: string | undefined) => ProgrammingLanguage | undefined;
  getFrameworkById: (id: string | undefined) => Framework | undefined;
  getFrameworksByLanguage: (languageId: string) => Framework[];
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

// Conserva el orden curado del catálogo local; lo nuevo que exista solo en Supabase va al final.
function sortLike<T extends { id: string }>(items: T[], reference: { id: string }[]): T[] {
  const order = new Map(reference.map((item, index) => [item.id, index]));
  return [...items].sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
}

// Muestra al instante los datos locales y los reemplaza por los de Supabase cuando llegan.
// Si Supabase no responde, la app sigue funcionando con el catálogo local.
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ languages: ProgrammingLanguage[]; frameworks: Framework[]; source: CatalogSource }>({
    languages: LANGUAGES,
    frameworks: FRAMEWORKS,
    source: 'local',
  });
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    fetchCatalog()
      .then((data) => {
        if (!active) return;
        setState({
          languages: sortLike(data.languages, LANGUAGES),
          frameworks: sortLike(data.frameworks, FRAMEWORKS),
          source: 'supabase',
        });
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudo leer Supabase'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  // Cuando otro usuario agrega o cambia un lenguaje en Supabase, se vuelve a leer el catálogo
  // en segundo plano. Se espera un momento para agrupar varios cambios seguidos en una sola lectura.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToCatalogChanges(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setAttempt((n) => n + 1), 500);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const value = useMemo<CatalogContextValue>(
    () => ({
      ...state,
      loading,
      error,
      reload,
      getLanguageById: (id) => state.languages.find((language) => language.id === id),
      getFrameworkById: (id) => state.frameworks.find((framework) => framework.id === id),
      getFrameworksByLanguage: (languageId) => state.frameworks.filter((framework) => framework.languageId === languageId),
    }),
    [state, loading, error, reload]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>');
  return context;
}
