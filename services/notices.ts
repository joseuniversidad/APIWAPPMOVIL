import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { notificationsSupported } from '@/services/notifications';
import { supabase } from '@/services/supabase';

// Avisos para todos (tabla avisos de supabase/clases-retos-avisos.sql). Llegan de tres formas:
// push de Expo con la app cerrada, Realtime con la app abierta y la lista dentro de la app.
export type Notice = {
  id: number;
  titulo: string;
  cuerpo: string;
  language_id: string | null;
  reto_id: number | null;
  created_at: string;
};

const READ_KEY = 'notices_read_at';
const TOKEN_KEY = 'push_token';

export async function fetchNotices(): Promise<Notice[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('avisos')
    .select('id, titulo, cuerpo, language_id, reto_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Notice[];
}

export async function sendNotice(titulo: string, cuerpo: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado');
  const { error } = await supabase.from('avisos').insert({ titulo: titulo.trim(), cuerpo: cuerpo.trim() });
  if (error) {
    if (error.code === '42501') throw new Error('Solo el superusuario puede enviar avisos');
    throw new Error(error.message);
  }
}

export function subscribeToNotices(onNotice: (notice: Notice) => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel('avisos')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'avisos' }, (payload) => onNotice(payload.new as Notice))
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export async function getReadAt(): Promise<string | null> {
  return AsyncStorage.getItem(READ_KEY).catch(() => null);
}

export async function markNoticesRead(): Promise<string> {
  const now = new Date().toISOString();
  await AsyncStorage.setItem(READ_KEY, now).catch(() => {});
  return now;
}

// Muestra un aviso como notificación local (cuando el push no está disponible en este celular).
export async function showLocalNotice(notice: Notice): Promise<void> {
  if (!notificationsSupported) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title: notice.titulo, body: notice.cuerpo, data: { aviso: notice.id, lenguaje: notice.language_id } },
    trigger: null,
  });
}

// Registra el token push de Expo del celular. Devuelve false si no se pudo (web, Expo Go en
// Android, emulador o permiso negado); en ese caso los avisos llegan por Realtime.
export async function registerPushToken(): Promise<boolean> {
  if (!notificationsSupported || !supabase) return false;
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const { error } = await supabase.from('push_tokens').upsert({ token, actualizado: new Date().toISOString() });
    if (error) return false;
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

// Al cerrar sesión el celular deja de recibir avisos de esa cuenta.
export async function unregisterPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (!token || !supabase) return;
  await supabase.from('push_tokens').delete().eq('token', token);
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}
