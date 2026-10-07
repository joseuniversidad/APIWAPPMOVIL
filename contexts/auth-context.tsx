import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { apiRequest, login, type LoginResult } from '@/services/api';
import { sessionStorage } from '@/services/session-storage';

const SESSION_KEY = 'api_session';

export type Session = LoginResult & { email: string };

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  // Hace una petición autenticada; si la API responde 401 cierra la sesión.
  authFetch: <T = unknown>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isExpired(session: Session) {
  return session.expiresAt !== null && session.expiresAt <= Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setSession(null);
    await sessionStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  // Recupera la sesión guardada al abrir la app, descartándola si ya expiró.
  useEffect(() => {
    sessionStorage
      .getItem(SESSION_KEY)
      .then((raw) => {
        const saved = raw ? (JSON.parse(raw) as Session) : null;
        if (saved && !isExpired(saved)) setSession(saved);
        else if (saved) sessionStorage.removeItem(SESSION_KEY);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cierra la sesión automáticamente en el momento en que el token expira.
  useEffect(() => {
    if (!session?.expiresAt) return;
    const delay = Math.max(0, session.expiresAt - Date.now());
    // setTimeout se desborda con más de ~24.8 días; en ese caso basta revisarlo al reabrir la app.
    if (delay > 2_147_483_647) return;
    const timeout = setTimeout(signOut, delay);
    return () => clearTimeout(timeout);
  }, [session, signOut]);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await login(email, password);
      const newSession: Session = { ...result, email: email.trim() };
      await sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Error al iniciar sesión';
    }
  };

  const authFetch = useCallback(
    async <T,>(path: string, options: { method?: string; body?: unknown } = {}) => {
      try {
        return await apiRequest<T>(path, { ...options, token: session?.token });
      } catch (e) {
        if ((e as { status?: number }).status === 401) await signOut();
        throw e;
      }
    },
    [session?.token, signOut]
  );

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut, authFetch }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
