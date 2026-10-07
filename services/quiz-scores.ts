import AsyncStorage from '@react-native-async-storage/async-storage';

import { ensureSupabaseSession, supabase } from '@/services/supabase';

// Puntajes del quiz. Se guardan en la tabla quiz_scores de Supabase (cada usuario,
// incluso el anónimo, solo ve los suyos gracias a RLS). Si Supabase no está disponible
// se usa el almacenamiento local del dispositivo como respaldo.
export type ScoreSource = 'supabase' | 'local';
export type BestScore = { score: number; total: number; attempts: number; source: ScoreSource } | null;

const localKey = (languageId: string) => `quiz_scores_${languageId}`;

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
      await ensureSupabaseSession();
      const { data, error } = await supabase.from('quiz_scores').select('score, total').eq('language_id', languageId);
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
