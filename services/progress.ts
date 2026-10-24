import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/services/supabase';

// Progreso de estudio: pasos completados del tutorial de cada lenguaje (en el dispositivo y en la
// tabla progreso_tutorial, para que el profesor lo vea) y los días con actividad (para la racha).
const STEPS_KEY = 'progress_steps';
const DAYS_KEY = 'progress_days';
const LAST_KEY = 'progress_last_language';

export type StepsProgress = Record<string, number[]>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const writeJson = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

// Fecha local en formato AAAA-MM-DD (no UTC: la racha debe seguir el día del usuario).
export function dayKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function loadProgress(): Promise<{ steps: StepsProgress; days: string[]; lastLanguage: string | null }> {
  const [steps, days, lastLanguage] = await Promise.all([
    readJson<StepsProgress>(STEPS_KEY, {}),
    readJson<string[]>(DAYS_KEY, []),
    AsyncStorage.getItem(LAST_KEY).catch(() => null),
  ]);
  return { steps, days, lastLanguage };
}

export const saveSteps = (steps: StepsProgress) => writeJson(STEPS_KEY, steps);
export const saveDays = (days: string[]) => writeJson(DAYS_KEY, days);
export const saveLastLanguage = (id: string) => AsyncStorage.setItem(LAST_KEY, id).catch(() => {});

// Días seguidos con actividad, contando hacia atrás desde hoy (o desde ayer si hoy aún no estudió).
export function currentStreak(days: string[]): number {
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Racha más larga de la historia (para las insignias).
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of sorted) {
    const date = new Date(`${day}T12:00:00`);
    run = previous && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

// Sube los pasos completados de un lenguaje (si falla, quedan en el dispositivo).
export async function syncStepsToCloud(languageId: string, steps: number[]): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('progreso_tutorial')
    .upsert({ language_id: languageId, pasos: steps, actualizado: new Date().toISOString() });
}

// Pasos guardados en la nube (al iniciar sesión en otro celular).
export async function fetchCloudSteps(): Promise<StepsProgress> {
  if (!supabase) return {};
  const { data, error } = await supabase.from('progreso_tutorial').select('language_id, pasos');
  if (error || !data) return {};
  return Object.fromEntries(data.map((row) => [row.language_id as string, row.pasos as number[]]));
}
