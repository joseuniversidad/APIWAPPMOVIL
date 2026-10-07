import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { sessionStorage } from '@/services/session-storage';

// Backend propio de MiApp54 (tablas languages, frameworks y quiz_scores).
// La publishable key es pública por diseño: los datos están protegidos con Row Level Security.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL as string, SUPABASE_KEY as string, {
      auth: {
        storage: sessionStorage,
        storageKey: 'miapp54_supabase_session',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Las tablas solo se pueden leer con un token válido (rol "authenticated").
// Para no pedir usuario y contraseña al visitante se inicia una sesión anónima:
// Supabase emite un JWT con expiración y un id de usuario propio del dispositivo.
let pendingSession: Promise<string | null> | null = null;

export function ensureSupabaseSession(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null);
  const client = supabase;
  pendingSession ??= (async () => {
    const { data } = await client.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: anon, error } = await client.auth.signInAnonymously();
    if (error) throw new Error(error.message);
    return anon.user?.id ?? null;
  })().finally(() => {
    pendingSession = null;
  });
  return pendingSession;
}
