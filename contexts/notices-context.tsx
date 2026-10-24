import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/contexts/auth-context';
import {
  fetchNotices,
  getReadAt,
  markNoticesRead,
  registerPushToken,
  showLocalNotice,
  subscribeToNotices,
  type Notice,
} from '@/services/notices';
import { notificationsSupported } from '@/services/notifications';

type NoticesContextValue = {
  notices: Notice[];
  unread: number;
  isUnread: (notice: Notice) => boolean;
  markAllRead: () => void;
  refresh: () => void;
};

const NoticesContext = createContext<NoticesContextValue | null>(null);

// Abre el lenguaje o el reto del aviso.
export function openNotice(data: { lenguaje?: string | null; reto?: number | null }) {
  if (data.reto) router.push(`/reto/${data.reto}`);
  else if (data.lenguaje) router.push(`/language/${data.lenguaje}`);
}

export function NoticesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notices, setNotices] = useState<Notice[]>([]);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [hasPush, setHasPush] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    getReadAt().then(setReadAt);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchNotices()
      .then((list) => active && setNotices(list))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, version]);

  // Con la cuenta iniciada, el celular se registra para recibir push aunque la app esté cerrada.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    registerPushToken().then((ok) => active && setHasPush(ok));
    return () => {
      active = false;
    };
  }, [userId]);

  // Con la app abierta los avisos llegan por Realtime. Si este celular no tiene push
  // (Expo Go, emulador), se muestra como notificación local para no perderlo.
  useEffect(() => {
    if (!userId) return;
    return subscribeToNotices((notice) => {
      setNotices((current) => (current.some((n) => n.id === notice.id) ? current : [notice, ...current]));
      if (!hasPush) showLocalNotice(notice).catch(() => {});
    });
  }, [userId, hasPush]);

  // Tocar una notificación (push o local) abre el lenguaje o el reto.
  useEffect(() => {
    if (!notificationsSupported) return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotice(response.notification.request.content.data as { lenguaje?: string; reto?: number });
    });
    return () => subscription.remove();
  }, []);

  const markAllRead = useCallback(() => {
    markNoticesRead().then(setReadAt);
  }, []);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo<NoticesContextValue>(() => {
    // Se comparan como fechas: Supabase y el dispositivo escriben la hora en formatos distintos.
    const isUnread = (notice: Notice) => !readAt || Date.parse(notice.created_at) > Date.parse(readAt);
    return {
      notices,
      unread: notices.filter(isUnread).length,
      isUnread,
      markAllRead,
      refresh,
    };
  }, [notices, readAt, markAllRead, refresh]);

  return <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>;
}

export function useNotices(): NoticesContextValue {
  const context = useContext(NoticesContext);
  if (!context) throw new Error('useNotices debe usarse dentro de <NoticesProvider>');
  return context;
}
