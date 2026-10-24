import type { Session as SupabaseSession, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchRole, isAccountSession, signInAccount, signOutAccount, signUpAccount, type Role } from '@/services/account';
import { apiRequest, login, type LoginResult } from '@/services/api';
import { unregisterPushToken } from '@/services/notices';
import { sessionStorage } from '@/services/session-storage';
import { supabase } from '@/services/supabase';

const SESSION_KEY = 'api_session';
// Clave del antiguo modo invitado; se borra al abrir la app.
const LEGACY_GUEST_KEY = 'guest_mode';

export type Session = LoginResult & { email: string };

// Resultado de iniciar sesión en la cuenta: null si entró, o el motivo por el que no.
export type AccountSignInResult = null | { error: string };

type AuthContextValue = {
  // --- Cuenta de MiApp54 (Supabase Auth: nombre, correo y contraseña) ---
  user: User | null;
  role: Role;
  isAdmin: boolean;
  isTeacher: boolean;
  signInAccount: (email: string, password: string) => Promise<AccountSignInResult>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  refreshRole: () => Promise<void>;
  // Cierra todo: la cuenta y la sesión de la API del compañero.
  signOut: () => Promise<void>;

  // --- API del compañero (sin cambios) ---
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  // Cierra solo la sesión de la API del compañero (p. ej. cuando el token expira).
  signOutApi: () => Promise<void>;
  // Hace una petición autenticada; si la API responde 401 cierra la sesión.
  authFetch: <T = unknown>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isExpired(session: Session) {
  return session.expiresAt !== null && session.expiresAt <= Date.now();
}

const messageOf = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<SupabaseSession | null>(null);
  const [role, setRole] = useState<Role>('estudiante');
  const [accountLoading, setAccountLoading] = useState(Boolean(supabase));

  const signOutApi = useCallback(async () => {
    setSession(null);
    await sessionStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  // Cuenta de la app: solo cuenta una sesión real con correo (no la anónima del catálogo).
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const apply = async (next: SupabaseSession | null) => {
      if (!isAccountSession(next)) {
        if (active) {
          setAccount(null);
          setRole('estudiante');
        }
        return;
      }
      const nextRole = await fetchRole(next);
      if (!active) return;
      setAccount(next);
      setRole(nextRole);
    };
    client.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => {})
      .finally(() => active && setAccountLoading(false));
    const { data } = client.auth.onAuthStateChange((event, next) => {
      // Al renovar el token el usuario es el mismo: no hace falta volver a pedir el rol.
      if (event === 'TOKEN_REFRESHED') return;
      apply(next);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    await sessionStorage.removeItem(SESSION_KEY).catch(() => {});
    await unregisterPushToken().catch(() => {});
    await signOutAccount().catch(() => {});
    setAccount(null);
    setRole('estudiante');
  }, []);

  // Recupera la sesión guardada de la API al abrir la app, descartándola si ya expiró.
  useEffect(() => {
    sessionStorage.removeItem(LEGACY_GUEST_KEY).catch(() => {});
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

  // Cierra la sesión de la API automáticamente en el momento en que el token expira.
  useEffect(() => {
    if (!session?.expiresAt) return;
    const delay = Math.max(0, session.expiresAt - Date.now());
    // setTimeout se desborda con más de ~24.8 días; en ese caso basta revisarlo al reabrir la app.
    if (delay > 2_147_483_647) return;
    const timeout = setTimeout(signOutApi, delay);
    return () => clearTimeout(timeout);
  }, [session, signOutApi]);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await login(email, password);
      const newSession: Session = { ...result, email: email.trim() };
      await sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
      return null;
    } catch (e) {
      return messageOf(e, 'Error al iniciar sesión');
    }
  };

  const authFetch = useCallback(
    async <T,>(path: string, options: { method?: string; body?: unknown } = {}) => {
      try {
        return await apiRequest<T>(path, { ...options, token: session?.token });
      } catch (e) {
        if ((e as { status?: number }).status === 401) await signOutApi();
        throw e;
      }
    },
    [session?.token, signOutApi]
  );

  const signInToAccount = async (email: string, password: string): Promise<AccountSignInResult> => {
    try {
      await signInAccount(email, password);
      return null;
    } catch (e) {
      return { error: messageOf(e, 'Error al iniciar sesión') };
    }
  };

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action();
      return null;
    } catch (e) {
      return messageOf(e, fallback);
    }
  };

  const refreshRole = useCallback(async () => {
    if (account) setRole(await fetchRole(account));
  }, [account]);

  return (
    <AuthContext.Provider
      value={{
        user: account?.user ?? null,
        role,
        isAdmin: role === 'admin',
        isTeacher: role === 'profesor' || role === 'admin',
        signInAccount: signInToAccount,
        signUp: (name, email, password) => run(() => signUpAccount(name, email, password), 'No se pudo crear la cuenta'),
        refreshRole,
        signOut,
        session,
        loading: loading || accountLoading,
        signIn,
        signOutApi,
        authFetch,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
