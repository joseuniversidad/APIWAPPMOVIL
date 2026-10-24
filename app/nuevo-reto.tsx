import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { createChallenge } from '@/services/challenges';
import { canRunLanguage, runCode } from '@/services/code-runner';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const DURATIONS = [3, 7, 14];

// Publicar un reto semanal (profesores y superusuario). Al publicarlo sale un aviso para todos.
// La salida esperada se puede generar ejecutando una solución de ejemplo.
export default function NewChallengeScreen() {
  const params = useLocalSearchParams<{ lenguaje?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const surface = colorScheme === 'dark' ? '#1d2022' : '#f4f6f8';
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { languages } = useCatalog();
  const runnable = languages.filter((l) => canRunLanguage(l.id));

  const [titulo, setTitulo] = useState('');
  const [enunciado, setEnunciado] = useState('');
  const [languageId, setLanguageId] = useState(params.lenguaje ?? runnable[0]?.id ?? '');
  const [codigoInicial, setCodigoInicial] = useState('');
  const [solucion, setSolucion] = useState('');
  const [salida, setSalida] = useState('');
  const [dias, setDias] = useState(7);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateOutput = async () => {
    if (!solucion.trim()) return setError('Escribe una solución para generar la salida');
    setRunning(true);
    setError(null);
    try {
      const result = await runCode(languageId, solucion);
      if (result.isError) setError(`Tu solución tiene un error:\n${result.output}`);
      else setSalida(result.output.trimEnd());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ejecutar');
    } finally {
      setRunning(false);
    }
  };

  const publish = async () => {
    if (titulo.trim().length < 4) return setError('Escribe un título de al menos 4 caracteres');
    if (!enunciado.trim()) return setError('Escribe el enunciado');
    if (!salida.trim()) return setError('Falta la salida esperada');
    setSaving(true);
    setError(null);
    try {
      await createChallenge({ titulo, enunciado, languageId, codigoInicial, salidaEsperada: salida, dias });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar');
      setSaving(false);
    }
  };

  const input = [styles.input, { color: palette.text, borderColor: border, backgroundColor: surface }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
          <BackButton fallbackHref="/aprender" />
          <View style={styles.padded}>
            <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
              Nuevo reto
            </ThemedText>
            <ThemedText style={styles.muted}>Al publicarlo, todos reciben un aviso.</ThemedText>
          </View>

          <View style={[styles.padded, styles.form]}>
            <Label text="Título" />
            <TextInput value={titulo} onChangeText={setTitulo} placeholder="Imprime los números pares del 1 al 20" placeholderTextColor={palette.icon} maxLength={120} style={input} />

            <Label text="Enunciado" />
            <TextInput
              value={enunciado}
              onChangeText={setEnunciado}
              placeholder="Explica qué debe imprimir el programa y en qué formato (por ejemplo, uno por línea)."
              placeholderTextColor={palette.icon}
              multiline
              textAlignVertical="top"
              style={[input, { minHeight: 100 }]}
            />

            <Label text="Lenguaje" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {runnable.map((language) => {
                const selected = language.id === languageId;
                return (
                  <Pressable
                    key={language.id}
                    onPress={() => setLanguageId(language.id)}
                    style={[styles.chip, { borderColor: selected ? language.color : border }, selected && { backgroundColor: `${language.color}33` }]}>
                    <ThemedText style={{ fontSize: 14 }}>{language.name}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Label text="Dura" />
            <View style={styles.inline}>
              {DURATIONS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setDias(value)}
                  style={[styles.chip, { borderColor: dias === value ? palette.tint : border }, dias === value && { backgroundColor: `${palette.tint}1F` }]}>
                  <ThemedText style={{ fontSize: 14 }}>{value} días</ThemedText>
                </Pressable>
              ))}
            </View>

            <Label text="Código inicial para el alumno (opcional)" />
            <TextInput value={codigoInicial} onChangeText={setCodigoInicial} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} textAlignVertical="top" style={[styles.code, { minHeight: 100 }]} />

            <Label text="Tu solución (no se publica)" />
            <TextInput value={solucion} onChangeText={setSolucion} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} textAlignVertical="top" style={[styles.code, { minHeight: 120 }]} />
            <Pressable
              onPress={generateOutput}
              disabled={running}
              style={({ pressed }) => [styles.secondary, { borderColor: palette.tint }, (pressed || running) && { opacity: 0.6 }]}>
              {running ? <ActivityIndicator color={palette.tint} /> : null}
              <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                Ejecutar solución y usar su salida
              </ThemedText>
            </Pressable>

            <Label text="Salida esperada (el alumno no la ve)" />
            <TextInput value={salida} onChangeText={setSalida} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} textAlignVertical="top" style={[styles.code, { minHeight: 100 }]} />

            {error && <ThemedText style={{ color: '#d9534f' }}>{error}</ThemedText>}
            <Pressable
              onPress={publish}
              disabled={saving}
              style={({ pressed }) => [styles.primary, { backgroundColor: palette.tint }, (pressed || saving) && { opacity: 0.6 }]}>
              {saving ? (
                <ActivityIndicator color={palette.background} />
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
                  Publicar reto
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <ThemedText style={styles.label}>{text}</ThemedText>;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    gap: 14,
  },
  padded: {
    paddingHorizontal: 16,
  },
  muted: {
    opacity: 0.65,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
    fontSize: 16,
  },
  code: {
    backgroundColor: '#161b22',
    color: '#e6edf3',
    borderRadius: 12,
    padding: 12,
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 20,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 17,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
  },
  inline: {
    flexDirection: 'row',
    gap: 8,
  },
  secondary: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  primary: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    marginTop: 10,
  },
});
