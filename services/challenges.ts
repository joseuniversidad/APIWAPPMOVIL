import { supabase } from '@/services/supabase';

// Retos semanales (ver supabase/clases-retos-avisos.sql). La salida esperada nunca llega
// al celular: la app envía la salida del programa y Supabase la compara.

function client() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

function rpcError(error: { code?: string; message: string }): Error {
  if (error.code === 'PGRST202' || error.code === '42P01') {
    return new Error('Falta ejecutar supabase/clases-retos-avisos.sql en Supabase');
  }
  return new Error(error.message);
}

export type Challenge = {
  id: number;
  titulo: string;
  enunciado: string;
  language_id: string;
  codigo_inicial: string | null;
  inicia: string; // AAAA-MM-DD
  termina: string;
  resueltos: number;
  lo_resolvi: boolean;
  puedo_borrar: boolean;
};

export async function getChallenges(): Promise<Challenge[]> {
  const { data, error } = await client().rpc('retos_publicos');
  if (error) throw rpcError(error);
  return (data ?? []) as Challenge[];
}

// Días que faltan para que cierre el reto (0 = cierra hoy, negativo = ya cerró).
export function daysLeft(challenge: Challenge): number {
  const end = new Date(`${challenge.termina}T23:59:59`);
  return Math.floor((end.getTime() - Date.now()) / 86_400_000);
}

// Devuelve la posición en que lo resolviste, o null si la salida no coincide.
export async function verifyChallenge(challengeId: number, output: string, code: string): Promise<number | null> {
  const { data, error } = await client().rpc('verificar_reto', { reto: challengeId, salida: output, codigo: code });
  if (error) throw rpcError(error);
  return (data as number | null) ?? null;
}

export async function getMySolvedCount(): Promise<number> {
  const { data, error } = await client().rpc('mis_retos_resueltos');
  if (error) return 0;
  return (data as number) ?? 0;
}

export type NewChallenge = {
  titulo: string;
  enunciado: string;
  languageId: string;
  codigoInicial: string;
  salidaEsperada: string;
  dias: number;
};

export async function createChallenge(challenge: NewChallenge): Promise<void> {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + challenge.dias);
  const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const { error } = await client()
    .from('retos')
    .insert({
      titulo: challenge.titulo.trim(),
      enunciado: challenge.enunciado.trim(),
      language_id: challenge.languageId,
      codigo_inicial: challenge.codigoInicial.trim() ? challenge.codigoInicial : null,
      salida_esperada: challenge.salidaEsperada,
      inicia: iso(today),
      termina: iso(end),
    });
  if (error) {
    if (error.code === '42501') throw new Error('Solo profesores y el superusuario pueden publicar retos');
    throw rpcError(error);
  }
}

export async function deleteChallenge(challengeId: number): Promise<void> {
  const { error } = await client().rpc('borrar_reto', { reto: challengeId });
  if (error) throw rpcError(error);
}
