import { supabase } from '@/services/supabase';

// Configuración que el superusuario edita y todos ven (tabla configuracion_app de admin-extra.sql):
// anuncio fijado en el inicio, lenguaje destacado y mensaje de bienvenida.
export type NoticeTone = 'info' | 'exito' | 'alerta';

export type AppConfig = {
  anuncio_activo: boolean;
  anuncio_titulo: string | null;
  anuncio_texto: string | null;
  anuncio_tono: NoticeTone;
  anuncio_language_id: string | null;
  destacado_language_id: string | null;
  destacado_nota: string | null;
  bienvenida_activa: boolean;
  bienvenida_titulo: string | null;
  bienvenida_texto: string | null;
  actualizado: string;
};

const COLUMNS =
  'anuncio_activo, anuncio_titulo, anuncio_texto, anuncio_tono, anuncio_language_id, destacado_language_id, destacado_nota, bienvenida_activa, bienvenida_titulo, bienvenida_texto, actualizado';

export async function fetchAppConfig(): Promise<AppConfig | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('configuracion_app').select(COLUMNS).eq('id', 1).maybeSingle();
  if (error) return null;
  return data as AppConfig | null;
}

export async function saveAppConfig(changes: Partial<Omit<AppConfig, 'actualizado'>>): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { data, error } = await supabase
    .from('configuracion_app')
    .update({ ...changes, actualizado: new Date().toISOString() })
    .eq('id', 1)
    .select('actualizado');
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') throw new Error('Falta ejecutar supabase/admin-extra.sql en Supabase');
    throw new Error(error.message);
  }
  // Si RLS no dejó actualizar, Supabase no da error: simplemente no devuelve filas.
  if (!data?.length) throw new Error('Solo el superusuario puede cambiar esto');
}

export function subscribeToAppConfig(onChange: (config: AppConfig) => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel('configuracion-app')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'configuracion_app' }, (payload) => onChange(payload.new as AppConfig))
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
