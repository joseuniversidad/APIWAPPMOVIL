import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState, type RefObject } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { AuthField, FormButton, FormCard, FormMessage, useFormColors } from '@/components/auth-form';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { emailError } from '@/services/account';
import { isSupabaseConfigured } from '@/services/supabase';

// Formulario de inicio de sesión. Lo usan la pantalla de celular y la página de escritorio.
export function LoginForm({ emailRef }: { emailRef?: RefObject<TextInput | null> }) {
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
    <FormCard>
      {!ready && <FormMessage text="Falta configurar Supabase en el archivo .env." />}
      <AuthField
        ref={emailRef}
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
        <ThemedText style={styles.dividerText}>¿Eres nuevo?</ThemedText>
        <View style={[styles.divider, { backgroundColor: palette.icon }]} />
      </View>
      <FormButton label="Crear cuenta nueva" variant="secondary" icon="person-add-outline" onPress={() => router.push('/registro')} />
    </FormCard>
  );
}

const styles = StyleSheet.create({
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
  dividerText: {
    opacity: 0.7,
    fontSize: 13,
  },
});
