import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAppConfig } from '@/contexts/app-config-context';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Mensaje de bienvenida que escribe el superusuario. Se muestra una sola vez a cada cuenta,
// la primera vez que entra a la app en ese celular.
export function WelcomeModal() {
  const palette = Colors[useColorScheme() ?? 'light'];
  const { user, isAdmin } = useAuth();
  const { config } = useAppConfig();
  const [visible, setVisible] = useState(false);
  const key = user ? `welcome_seen_${user.id}` : null;

  useEffect(() => {
    if (!key || isAdmin || !config?.bienvenida_activa || !config.bienvenida_titulo) return;
    let active = true;
    AsyncStorage.getItem(key)
      .then((seen) => active && !seen && setVisible(true))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [key, isAdmin, config]);

  const close = () => {
    setVisible(false);
    if (key) AsyncStorage.setItem(key, '1').catch(() => {});
  };

  if (!config) return null;
  const firstName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.split(' ')[0] : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: palette.background }]}>
          <View style={[styles.icon, { backgroundColor: `${palette.tint}1F` }]}>
            <Ionicons name="hand-left-outline" size={30} color={palette.tint} />
          </View>
          <ThemedText type="subtitle" style={styles.center}>
            {config.bienvenida_titulo}
          </ThemedText>
          {firstName && <ThemedText style={[styles.center, { opacity: 0.7 }]}>Hola, {firstName}</ThemedText>}
          {config.bienvenida_texto && <ThemedText style={[styles.center, styles.body]}>{config.bienvenida_texto}</ThemedText>}
          <Pressable onPress={close} style={({ pressed }) => [styles.button, { backgroundColor: palette.tint }, pressed && { opacity: 0.7 }]}>
            <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
              Empezar
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  body: {
    lineHeight: 23,
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    marginTop: 6,
  },
});
