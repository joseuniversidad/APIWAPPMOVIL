import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PresupuestosCard } from '@/components/api/presupuestos-card';
import { ReporteCard } from '@/components/api/reporte-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { isApiConfigured } from '@/services/api';

const DANGER = '#d9534f';

export default function ApiScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { contentMaxWidth } = useResponsive();
  const { session, loading } = useAuth();

  let content: React.ReactNode;
  if (!isApiConfigured()) {
    content = (
      <ThemedView style={styles.card}>
        <Ionicons name="cloud-offline-outline" size={32} color={palette.icon} />
        <ThemedText type="subtitle">Falta configurar la conexión</ThemedText>
        <ThemedText style={styles.muted}>
          Abre el archivo .env, pega la URL de la API en EXPO_PUBLIC_API_URL y reinicia con npx expo start
          --clear.
        </ThemedText>
      </ThemedView>
    );
  } else if (loading) {
    content = <ActivityIndicator style={{ marginTop: 40 }} color={palette.tint} />;
  } else if (!session) {
    content = <LoginForm />;
  } else {
    content = <Dashboard />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
          ]}>
          <View style={{ gap: 4 }}>
            <ThemedText type="title">API</ThemedText>
            <ThemedText style={styles.muted}>Datos consumidos desde la API del compañero con token Bearer.</ThemedText>
          </View>
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LoginForm() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Ingresa correo y contraseña');
      return;
    }
    setSubmitting(true);
    setError(null);
    const message = await signIn(email, password);
    setSubmitting(false);
    if (message) setError(message);
  };

  const inputStyle = [
    styles.input,
    { color: palette.text, borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#dcdcdc' },
  ];

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle">Iniciar sesión</ThemedText>
      <TextInput
        style={inputStyle}
        placeholder="Correo"
        placeholderTextColor={palette.icon}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={inputStyle}
        placeholder="Contraseña"
        placeholderTextColor={palette.icon}
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSubmit}
      />
      {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        style={({ pressed }) => [styles.button, { backgroundColor: palette.tint }, pressed && { opacity: 0.7 }]}>
        {submitting ? (
          <ActivityIndicator color={palette.background} />
        ) : (
          <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
            Entrar
          </ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

function Dashboard() {
  const { session, signOut } = useAuth();
  const userName = typeof session?.user?.name === 'string' ? session.user.name : null;

  return (
    <>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Sesión</ThemedText>
        {userName && <ThemedText type="defaultSemiBold">{userName}</ThemedText>}
        <ThemedText>{session?.email}</ThemedText>
        <TokenExpiry expiresAt={session?.expiresAt ?? null} />
        <ThemedText style={[styles.muted, styles.mono]} numberOfLines={1}>
          Token: {session?.token.slice(0, 12)}…
        </ThemedText>
        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.smallButton, { borderColor: DANGER }, pressed && { opacity: 0.6 }]}>
          <Ionicons name="log-out-outline" size={16} color={DANGER} />
          <ThemedText style={{ color: DANGER }}>Cerrar sesión</ThemedText>
        </Pressable>
      </ThemedView>

      <ReporteCard />
      <PresupuestosCard />
    </>
  );
}

// Muestra cuándo expira el token con una cuenta regresiva en vivo.
function TokenExpiry({ expiresAt }: { expiresAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!expiresAt) {
    return <ThemedText style={styles.muted}>La API no informó la fecha de expiración del token</ThemedText>;
  }

  const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return (
    <ThemedText style={styles.muted}>
      Token expira: {new Date(expiresAt).toLocaleString('es-GT')} ({hours}h {minutes}m {seconds}s)
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  muted: {
    opacity: 0.7,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  error: {
    color: DANGER,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
