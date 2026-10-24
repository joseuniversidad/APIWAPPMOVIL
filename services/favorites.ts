import AsyncStorage from '@react-native-async-storage/async-storage';

import { ensureSupabaseSession, supabase } from '@/services/supabase';

// Lenguajes favoritos. Se guardan en la tabla favoritos de Supabase (ver supabase/comunidad.sql)
// y además en el dispositivo, para que funcionen sin conexión o si falta ejecutar el SQL.
const LOCAL_KEY = 'favorite_languages';

async function readLocal(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const writeLocal = (ids: string[]) => AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(ids)).catch(() => {});

export async function getFavorites(): Promise<string[]> {
  if (supabase) {
    try {
      await ensureSupabaseSession();
      const { data, error } = await supabase.from('favoritos').select('language_id');
      if (!error && data) {
        const ids = data.map((row) => row.language_id as string);
        await writeLocal(ids);
        return ids;
      }
    } catch {
      // Se usa el respaldo local.
    }
  }
  return readLocal();
}

export async function setFavorite(languageId: string, favorite: boolean): Promise<void> {
  const local = await readLocal();
  await writeLocal(favorite ? [...new Set([...local, languageId])] : local.filter((id) => id !== languageId));
  if (!supabase) return;
  try {
    await ensureSupabaseSession();
    if (favorite) await supabase.from('favoritos').upsert({ language_id: languageId }, { ignoreDuplicates: true });
    else await supabase.from('favoritos').delete().eq('language_id', languageId);
  } catch {
    // Queda guardado en el dispositivo.
  }
}
