import AsyncStorage from '@react-native-async-storage/async-storage';

import { ensureSupabaseSession, supabase } from '@/services/supabase';

// Puntajes del quiz. Se guardan en la tabla quiz_scores de Supabase (cada usuario,
// incluso el anónimo, solo ve los suyos gracias a RLS). Si Supabase no está disponible
// se usa el almacenamiento local del dispositivo como respaldo.
export type ScoreSource = 'supabase' | 'local';
export type BestScore = { score: number; total: number; attempts: number; source: ScoreSource } | null;

const LOCAL_PREFIX = 'quiz_scores_';
const localKey = (languageId: string) => `${LOCAL_PREFIX}${languageId}`;

type LocalAttempt = { score: number; total: number; at: string };

async function readLocal(languageId: string): Promise<LocalAttempt[]> {
  try {
    const raw = await AsyncStorage.getItem(localKey(languageId));
    return raw ? (JSON.parse(raw) as LocalAttempt[]) : [];
  } catch {
    return [];
  }
}

function best(attempts: { score: number; total: number }[], source: ScoreSource): BestScore {
  if (attempts.length === 0) return null;
  const top = attempts.reduce((a, b) => (b.score / b.total > a.score / a.total ? b : a));
  return { score: top.score, total: top.total, attempts: attempts.length, source };
}

export async function getBestScore(languageId: string): Promise<BestScore> {
  if (supabase) {
    try {
      // Se filtra por usuario: el administrador puede leer los puntajes de todos (ver superusuario.sql).
      const userId = await ensureSupabaseSession();
      const { data, error } = await supabase
        .from('quiz_scores')
        .select('score, total')
        .eq('language_id', languageId)
        .eq('user_id', userId);
      if (!error && data) return best(data, 'supabase');
    } catch {
      // Se usa el respaldo local.
    }
  }
  return best(await readLocal(languageId), 'local');
}

export async function saveQuizScore(languageId: string, score: number, total: number): Promise<ScoreSource> {
  if (supabase) {
    try {
      await ensureSupabaseSession();
      const { error } = await supabase.from('quiz_scores').insert({ language_id: languageId, score, total });
      if (!error) return 'supabase';
    } catch {
      // Se usa el respaldo local.
    }
  }
  const attempts = await readLocal(languageId);
  attempts.push({ score, total, at: new Date().toISOString() });
  await AsyncStorage.setItem(localKey(languageId), JSON.stringify(attempts)).catch(() => {});
  return 'local';
}


// Mejor puntaje de cada lenguaje y totales del usuario (para el catálogo y el perfil).
export type QuizStats = { best: Record<string, BestScore>; attempts: number; averagePercent: number | null };

export async function getQuizStats(): Promise<QuizStats> {
  let rows: { language_id: string; score: number; total: number }[] | null = null;
  let source: ScoreSource = 'local';
  if (supabase) {
    try {
      const userId = await ensureSupabaseSession();
      const { data, error } = await supabase.from('quiz_scores').select('language_id, score, total').eq('user_id', userId);
      if (!error && data) {
        rows = data;
        source = 'supabase';
      }
    } catch {
      // Se usa el respaldo local.
    }
  }
  if (!rows) {
    rows = [];
    const keys = (await AsyncStorage.getAllKeys().catch(() => [])).filter((key) => key.startsWith(LOCAL_PREFIX));
    for (const key of keys) {
      const languageId = key.slice(LOCAL_PREFIX.length);
      for (const attempt of await readLocal(languageId)) rows.push({ language_id: languageId, ...attempt });
    }
  }

  const byLanguage = new Map<string, { score: number; total: number }[]>();
  for (const row of rows) byLanguage.set(row.language_id, [...(byLanguage.get(row.language_id) ?? []), row]);
  const bestByLanguage: Record<string, BestScore> = {};
  byLanguage.forEach((attempts, languageId) => {
    bestByLanguage[languageId] = best(attempts, source);
  });

  const averagePercent = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + row.score / row.total, 0) / rows.length) * 100)
    : null;
  return { best: bestByLanguage, attempts: rows.length, averagePercent };
}

export type RankingRow = {
  posicion: number;
  apodo: string;
  puntaje: number;
  total: number;
  porcentaje: number;
  intentos: number;
  soy_yo: boolean;
};

// Top 10 del quiz de un lenguaje (función ranking_quiz de supabase/comunidad.sql).
export async function getRanking(languageId: string): Promise<RankingRow[]> {
  if (!supabase) throw new Error('El ranking necesita Supabase');
  await ensureSupabaseSession();
  const { data, error } = await supabase.rpc('ranking_quiz', { lenguaje: languageId });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Falta ejecutar supabase/comunidad.sql en Supabase');
    throw new Error(error.message);
  }
  return (data ?? []) as RankingRow[];
}
