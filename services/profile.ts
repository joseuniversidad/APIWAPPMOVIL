import AsyncStorage from '@react-native-async-storage/async-storage';

import { ensureSupabaseSession, supabase } from '@/services/supabase';

// Apodo con el que el usuario aparece en el ranking del quiz (tabla perfiles, ver supabase/comunidad.sql).
const LOCAL_KEY = 'profile_nickname';

export async function getNickname(): Promise<string | null> {
  if (supabase) {
    try {
      const userId = await ensureSupabaseSession();
      const { data } = await supabase.from('perfiles').select('apodo').eq('user_id', userId).maybeSingle();
      if (data?.apodo) return data.apodo as string;
    } catch {
      // Se usa el respaldo local.
    }
  }
  return AsyncStorage.getItem(LOCAL_KEY).catch(() => null);
}

export async function saveNickname(nickname: string): Promise<void> {
  const value = nickname.trim();
  if (value.length < 2 || value.length > 24) throw new Error('El apodo debe tener entre 2 y 24 caracteres');
  await AsyncStorage.setItem(LOCAL_KEY, value).catch(() => {});
  if (!supabase) return;
  await ensureSupabaseSession();
  const { error } = await supabase.from('perfiles').upsert({ apodo: value, updated_at: new Date().toISOString() });
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') throw new Error('Falta ejecutar supabase/comunidad.sql en Supabase');
    throw new Error(error.message);
  }
}
