import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuthField, AuthScreen, FormButton, FormCard, FormMessage, useFormColors } from '@/components/auth-form';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { emailError } from '@/services/account';
import { isSupabaseConfigured } from '@/services/supabase';

// Login único de la app: la cuenta (correo y contraseña) decide si eres estudiante, profesor o superusuario.
// El login de la API del compañero sigue aparte, dentro de la pestaña API.
export default function LoginScreen() {
  const { palette } = useFormColors();
  const router = useRouter();
  const { signInAccount } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ready = isSupabaseConfigured();

  const handleSubmit = async () => {
    const emailProblem = email.trim() ? null : 'Escribe tu correo';
    if (emailProblem || !password) {
      setError(emailProblem ?? 'Escribe tu contraseña');
      return;
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSubmitting(true);
    setError(null);
    const result = await signInAccount(email, password);
    setSubmitting(false);
    if (!result) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setError(result.error);
  };

  const looksLikeEmail = email.trim().length > 0 && !emailError(email);

  return (
    <AuthScreen>
      <Animated.View entering={FadeInDown.duration(350)} style={styles.hero}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} contentFit="cover" />
        <ThemedText type="title" style={styles.center}>
          Catálogo de Lenguajes
        </ThemedText>
        <ThemedText style={[styles.muted, styles.center]}>Inicia sesión con tu cuenta</ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(350)}>
        <FormCard>
          {!ready && <FormMessage text="Falta configurar Supabase en el archivo .env." />}
          <AuthField
            label="Correo"
            icon="mail-outline"
            placeholder="tu@correo.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            valid={looksLikeEmail}
            editable={!submitting}
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AuthField
            ref={passwordRef}
            label="Contraseña"
            icon="lock-closed-outline"
            placeholder="••••••••"
            password
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            editable={!submitting}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
          />
          {error && <FormMessage text={error} />}
          <FormButton label="Entrar" onPress={handleSubmit} loading={submitting} disabled={!ready} />
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: palette.icon }]} />
            <ThemedText style={[styles.muted, { fontSize: 13 }]}>¿Eres nuevo?</ThemedText>
            <View style={[styles.divider, { backgroundColor: palette.icon }]} />
          </View>
          <FormButton label="Crear cuenta nueva" variant="secondary" icon="person-add-outline" onPress={() => router.push('/registro')} />
        </FormCard>
      </Animated.View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 22,
    marginBottom: 6,
  },
  center: {
    textAlign: 'center',
  },
  muted: {
    opacity: 0.7,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.4,
  },
});
