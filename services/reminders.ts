import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { notificationsSupported } from '@/services/notifications';

// Recordatorio diario de estudio con notificaciones locales (no requiere servidor de push).
// En web no hay notificaciones programadas, por eso la opción se oculta ahí.
const PREFS_KEY = 'reminder_prefs';
const CHANNEL_ID = 'recordatorios';

export type ReminderPrefs = { enabled: boolean; hour: number };
const DEFAULT_PREFS: ReminderPrefs = { enabled: false, hour: 19 };

export const remindersSupported = notificationsSupported;

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as ReminderPrefs) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

// Programa (o cancela) el recordatorio. Devuelve false si el usuario no dio permiso.
export async function applyReminder(prefs: ReminderPrefs, context: { languageName?: string; streak: number }): Promise<boolean> {
  if (!remindersSupported) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (prefs.enabled) {
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, enabled: false })).catch(() => {});
      return false;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recordatorios de estudio',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: context.streak > 0 ? `¡Llevas ${context.streak} ${context.streak === 1 ? 'día' : 'días'} seguidos!` : 'Hora de practicar',
        body: context.languageName
          ? `Sigue con ${context.languageName}: un paso del tutorial o un quiz rápido.`
          : 'Elige un lenguaje y haz un quiz rápido de 5 preguntas.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: prefs.hour,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  }

  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
  return true;
}
