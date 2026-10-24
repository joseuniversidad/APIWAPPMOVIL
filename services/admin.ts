import type { NewLanguage } from '@/services/catalog-api';
import { languageToRow } from '@/services/catalog-api';
import { supabase } from '@/services/supabase';

// Funciones del superusuario (ver supabase/cuentas.sql y clases-retos-avisos.sql).
// Todas se validan también en Supabase: si quien llama no es superusuario, fallan.

function client() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

function rpcError(error: { code?: string; message: string }, sqlFile: string): Error {
  if (error.code === 'PGRST202') return new Error(`Falta ejecutar supabase/${sqlFile} en Supabase`);
  return new Error(error.message);
}

export type AdminReport = {
  usuarios: number;
  usuarios_anonimos: number;
  profesores?: number;
  sin_confirmar?: number;
  clases?: number;
  retos_resueltos?: number;
  activos_7_dias: number;
  lenguajes: number;
  frameworks: number;
  intentos_quiz: number;
  promedio_quiz: number;
  mensajes_ia: number;
  mensajes_ia_hoy: number;
  tokens_ia: number;
  favoritos: number;
  actividad: { dia: string; quiz: number; ia: number }[];
  por_lenguaje: { id: string; nombre: string; color: string; intentos: number; promedio: number; favoritos: number }[];
  ultimos_intentos: { lenguaje: string; puntaje: number; total: number; fecha: string; usuario: string }[];
};

export async function fetchAdminReport(): Promise<AdminReport> {
  const { data, error } = await client().rpc('reporte_admin');
  if (error) throw rpcError(error, 'superusuario.sql');
  return data as AdminReport;
}

// Avisa cuando alguien termina un quiz (requiere el realtime de quiz_scores de superusuario.sql).
export function subscribeToQuizActivity(onChange: () => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel('admin-actividad')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_scores' }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export type AppUser = {
  id: string;
  correo: string;
  nombre: string | null;
  apodo: string | null;
  rol: 'estudiante' | 'profesor' | 'admin';
  confirmado: boolean;
  creado: string;
  ultimo_acceso: string | null;
  quizzes: number;
};

export async function listUsers(): Promise<AppUser[]> {
  const { data, error } = await client().rpc('listar_usuarios');
  if (error) throw rpcError(error, 'cuentas.sql');
  return (data ?? []) as AppUser[];
}

export async function setUserRole(userId: string, role: 'estudiante' | 'profesor'): Promise<void> {
  const { error } = await client().rpc('asignar_rol', { usuario: userId, nuevo_rol: role });
  if (error) throw rpcError(error, 'cuentas.sql');
}

export async function resetNickname(userId: string): Promise<void> {
  const { error } = await client().rpc('moderar_apodo', { usuario: userId });
  if (error) throw rpcError(error, 'cuentas.sql');
}

export async function editLanguage(language: NewLanguage): Promise<void> {
  const { error } = await client().rpc('editar_lenguaje', { datos: languageToRow(language) });
  if (error) throw rpcError(error, 'cuentas.sql');
}

export async function deleteLanguage(languageId: string): Promise<void> {
  const { error } = await client().rpc('borrar_lenguaje', { lenguaje: languageId });
  if (error) throw rpcError(error, 'cuentas.sql');
}
