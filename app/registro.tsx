import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuthField, AuthScreen, FormButton, FormCard, FormMessage, SUCCESS, useFormColors } from '@/components/auth-form';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/auth-context';
import { emailError, passwordStrength } from '@/services/account';

const STRENGTH_COLORS = ['#d9534f', '#d9534f', '#e0a100', SUCCESS];

// Registro: nombre, correo y contraseña. Al crear la cuenta la sesión empieza de una vez
// y el layout lleva a la app.
export default function RegisterScreen() {
  const { palette, border } = useFormColors();
  const router = useRouter();
  const { signUp } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);

  const createAccount = async () => {
    const problem =
      name.trim().length < 3
        ? 'Escribe tu nombre completo'
        : emailError(email) ??
          (password.length < 8 ? 'La contraseña debe tener al menos 8 caracteres' : password !== confirm ? 'Las contraseñas no coinciden' : null);
    if (problem) {
      setError(problem);
      return;
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSubmitting(true);
    setError(null);
    const message = await signUp(name, email, password);
    setSubmitting(false);
    if (message) {
      setError(message);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <AuthScreen center={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        hitSlop={10}
        style={styles.back}
        accessibilityRole="button">
        <Ionicons name="arrow-back" size={18} color={palette.tint} />
        <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
          Ya tengo cuenta
        </ThemedText>
      </Pressable>

      <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 20 }}>
        <View style={{ gap: 6 }}>
          <ThemedText type="title" style={{ fontSize: 30, lineHeight: 36 }}>
            Crear cuenta
          </ThemedText>
          <ThemedText style={styles.muted}>Tu nombre aparece en tus clases y en el panel del superusuario.</ThemedText>
        </View>
        <FormCard>
          <AuthField
            label="Nombre completo"
            icon="person-outline"
            placeholder="Ej. Ana López"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            maxLength={80}
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => emailRef.current?.focus()}
          />
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
            valid={Boolean(email.trim()) && !emailError(email)}
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AuthField
            ref={passwordRef}
            label="Contraseña"
            icon="lock-closed-outline"
            placeholder="Mínimo 8 caracteres"
            password
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          {password.length > 0 && (
            <View style={{ gap: 4 }}>
              <View style={[styles.track, { backgroundColor: border }]}>
                <View style={[styles.fill, { width: `${Math.max(1, strength.score) * 33.4}%`, backgroundColor: STRENGTH_COLORS[strength.score] }]} />
              </View>
              <ThemedText style={{ fontSize: 13, color: STRENGTH_COLORS[strength.score] }}>{strength.label}</ThemedText>
            </View>
          )}
          <AuthField
            ref={confirmRef}
            label="Confirmar contraseña"
            icon="lock-closed-outline"
            placeholder="Repite la contraseña"
            password
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            valid={confirm.length >= 8 && confirm === password}
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={createAccount}
          />
          {error && <FormMessage text={error} />}
          <FormButton label="Crear cuenta" onPress={createAccount} loading={submitting} />
        </FormCard>
      </Animated.View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  muted: {
    opacity: 0.7,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
