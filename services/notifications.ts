import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuración común de notificaciones (recordatorio diario y avisos).
// En web no hay notificaciones locales ni push, por eso todo se desactiva ahí.
export const notificationsSupported = Platform.OS !== 'web';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
