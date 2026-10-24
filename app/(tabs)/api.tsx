import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
            <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
              Mis datos
            </ThemedText>
            <ThemedText style={styles.muted}>Reportes y presupuestos desde la API del compañero.</ThemedText>
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

// Solo cambia la presentación: ReporteCard y PresupuestosCard consumen la API igual que antes.
function Dashboard() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { session, signOutApi } = useAuth();
  const userName = typeof session?.user?.name === 'string' ? session.user.name : null;

  return (
    <>
      <ThemedView style={[styles.sessionRow, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea' }]}>
        <Ionicons name="person-circle-outline" size={28} color={palette.tint} />
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {userName ?? session?.email}
          </ThemedText>
          <ThemedText style={[styles.muted, { fontSize: 13 }]}>Detalles del token en Perfil</ThemedText>
        </View>
        <Pressable
          onPress={signOutApi}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [styles.smallButton, { borderColor: DANGER }, pressed && { opacity: 0.6 }]}>
          <Ionicons name="log-out-outline" size={16} color={DANGER} />
          <ThemedText style={{ color: DANGER, fontSize: 14 }}>Salir</ThemedText>
        </Pressable>
      </ThemedView>

      <ReporteCard />
      <PresupuestosCard />
    </>
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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
