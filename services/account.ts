import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';

// Cuentas de MiApp54 en Supabase Auth: nombre, correo y contraseña.
// Requiere "Confirm email" desactivado en Supabase para que la cuenta entre al instante (ver README).
// Es independiente del login de la API del compañero, que sigue en services/api.ts.

export type Role = 'estudiante' | 'profesor' | 'admin';

// Basta con que tenga "@" y algo antes y después; no se verifica que el correo exista.
const EMAIL = /^[^\s@]+@[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailError(email: string): string | null {
  const value = normalizeEmail(email);
  if (!value) return 'Escribe tu correo';
  if (!EMAIL.test(value)) return 'El correo debe tener @';
  return null;
}

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (password.length < 8) return { score: 0, label: 'Mínimo 8 caracteres' };
  let points = 0;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++;
  if (/\d/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) points++;
  return points >= 3 ? { score: 3, label: 'Contraseña segura' } : points === 2 ? { score: 2, label: 'Contraseña aceptable' } : { score: 1, label: 'Contraseña débil' };
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado (revisa el archivo .env)');
  return supabase;
}

// Traduce los errores más comunes de Supabase Auth.
function friendly(message: string): string {
  if (message === 'Invalid login credentials') return 'Correo o contraseña incorrectos';
  if (message.includes('already registered')) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (message.includes('rate limit')) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  if (message.includes('Password should be')) return 'La contraseña debe tener al menos 8 caracteres';
  return message;
}

export async function signInAccount(email: string, password: string): Promise<Session> {
  const { data, error } = await client().auth.signInWithPassword({ email: normalizeEmail(email), password });
  if (error) throw new Error(friendly(error.message));
  return data.session;
}

// Crea la cuenta e inicia sesión de una vez.
export async function signUpAccount(name: string, email: string, password: string): Promise<void> {
  const problem = emailError(email);
  if (problem) throw new Error(problem);
  const { data, error } = await client().auth.signUp({
    email: normalizeEmail(email),
    password,
    options: { data: { full_name: name.trim() } },
  });
  if (error) throw new Error(friendly(error.message));
  // Si Supabase sigue pidiendo confirmar el correo, no devuelve sesión.
  if (!data.session) {
    if (data.user?.identities?.length === 0) throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
    throw new Error('La cuenta se creó, pero Supabase pide confirmar el correo. Desactiva "Confirm email" en Supabase (ver README).');
  }
}

export async function signOutAccount(): Promise<void> {
  await supabase?.auth.signOut();
}

// El rol se lee de la base (función mi_rol de cuentas.sql) para que un cambio del superusuario
// aplique sin esperar a que se renueve el token.
export async function fetchRole(session: Session): Promise<Role> {
  const fromToken = session.user.app_metadata?.role;
  try {
    const { data, error } = await client().rpc('mi_rol');
    if (!error && (data === 'admin' || data === 'profesor' || data === 'estudiante')) return data;
  } catch {
    // Se usa el rol del token.
  }
  return fromToken === 'admin' || fromToken === 'profesor' ? fromToken : 'estudiante';
}

// Solo cuenta como sesión de la app una cuenta real con correo (no la anónima del catálogo).
export function isAccountSession(session: Session | null): session is Session {
  return Boolean(session && !session.user.is_anonymous && session.user.email);
}
