import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
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

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { canRunLanguage, HELLO_WORLD, runCode, type RunResult } from '@/services/code-runner';
import { readableOn } from '@/utils/color';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const EXAMPLES = {
  variables: { label: 'Variables', key: 'variablesExample' },
  condicionales: { label: 'Condicionales', key: 'conditionalsExample' },
  bucles: { label: 'Bucles', key: 'loopsExample' },
} as const;

type ExampleId = keyof typeof EXAMPLES;

// Editor sencillo para escribir y ejecutar código del lenguaje elegido.
// Se abre desde el detalle (?lenguaje=python) o desde un ejemplo de "Aprende" (&ejemplo=bucles).
export default function PracticeScreen() {
  const params = useLocalSearchParams<{ lenguaje?: string; ejemplo?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const { contentMaxWidth } = useResponsive();
  const { getLanguageById } = useCatalog();
  const { recordActivity } = useUserData();
  const language = getLanguageById(params.lenguaje);

  const initialExample = params.ejemplo && params.ejemplo in EXAMPLES ? (params.ejemplo as ExampleId) : null;
  const exampleCode = (id: ExampleId) => (language ? (language[EXAMPLES[id].key]?.code ?? '') : '');
  const [code, setCode] = useState(() =>
    initialExample && exampleCode(initialExample) ? exampleCode(initialExample) : (HELLO_WORLD[params.lenguaje ?? ''] ?? '')
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!language || !canRunLanguage(language.id)) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <BackButton fallbackHref="/" />
        <ThemedText type="subtitle">Este lenguaje no se puede ejecutar todavía</ThemedText>
      </SafeAreaView>
    );
  }

  const accent = language.color;
  const onAccent = readableOn(accent);

  const run = async () => {
    if (!code.trim() || running) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const output = await runCode(language.id, code);
      setResult(output);
      recordActivity();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(output.isError ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ejecutar el código');
    } finally {
      setRunning(false);
    }
  };

  const loadTemplate = (template: 'hola' | ExampleId) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setCode(template === 'hola' ? HELLO_WORLD[language.id] : exampleCode(template));
    setResult(null);
    setError(null);
  };

  const templates: { id: 'hola' | ExampleId; label: string }[] = [
    { id: 'hola', label: 'Hola, mundo' },
    ...(Object.keys(EXAMPLES) as ExampleId[])
      .filter((id) => exampleCode(id))
      .map((id) => ({ id, label: EXAMPLES[id].label })),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
          ]}>
          <BackButton fallbackHref={`/language/${language.id}`} />
          <View style={styles.padded}>
            <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
              Practicar {language.name}
            </ThemedText>
            <ThemedText style={styles.muted}>Escribe código y ejecútalo en un servidor. Máximo 5 segundos por ejecución.</ThemedText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.padded, { gap: 8 }]}>
            {templates.map((template) => (
              <Pressable
                key={template.id}
                onPress={() => loadTemplate(template.id)}
                style={({ pressed }) => [styles.chip, { borderColor: border }, pressed && { opacity: 0.6 }]}>
                <ThemedText style={{ fontSize: 14 }}>{template.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.editor, styles.marginH]}>
            <View style={styles.editorBar}>
              <View style={[styles.dot, { backgroundColor: '#ff5f57' }]} />
              <View style={[styles.dot, { backgroundColor: '#febc2e' }]} />
              <View style={[styles.dot, { backgroundColor: '#28c840' }]} />
              <ThemedText style={styles.editorTitle} lightColor="#9aa4ab" darkColor="#9aa4ab">
                {language.name}
              </ThemedText>
            </View>
            <TextInput
              value={code}
              onChangeText={setCode}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
              placeholder="Escribe tu código aquí…"
              placeholderTextColor="#6b747a"
              style={styles.code}
            />
          </View>

          <View style={[styles.marginH, styles.actions]}>
            <Pressable
              onPress={run}
              disabled={running || !code.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.runButton,
                { backgroundColor: accent },
                (pressed || running || !code.trim()) && { opacity: 0.7 },
              ]}>
              {running ? <ActivityIndicator color={onAccent} /> : <Ionicons name="play" size={18} color={onAccent} />}
              <ThemedText type="defaultSemiBold" lightColor={onAccent} darkColor={onAccent}>
                {running ? 'Ejecutando…' : 'Ejecutar'}
              </ThemedText>
            </Pressable>
          </View>

          {error && (
            <View style={[styles.marginH, styles.errorBox, { borderColor: '#d9534f66' }]}>
              <Ionicons name="alert-circle" size={18} color="#d9534f" />
              <ThemedText style={{ color: '#d9534f', flex: 1 }}>{error}</ThemedText>
            </View>
          )}

          {result && (
            <View style={[styles.marginH, styles.output]}>
              <View style={styles.outputHeader}>
                <ThemedText style={styles.outputLabel} lightColor="#9aa4ab" darkColor="#9aa4ab">
                  SALIDA
                </ThemedText>
                <ThemedText style={styles.outputLabel} lightColor={result.isError ? '#ff7b72' : '#7ee787'} darkColor={result.isError ? '#ff7b72' : '#7ee787'}>
                  {result.isError ? `ERROR · código ${result.exitCode}` : 'OK'}
                </ThemedText>
              </View>
              <ThemedText selectable style={styles.outputText} lightColor="#e6edf3" darkColor="#e6edf3">
                {result.output.trim() || '(el programa no imprimió nada)'}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  content: {
    paddingBottom: 32,
    gap: 14,
  },
  padded: {
    paddingHorizontal: 16,
  },
  marginH: {
    marginHorizontal: 16,
  },
  muted: {
    opacity: 0.65,
    fontSize: 14,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
  },
  editor: {
    backgroundColor: '#161b22',
    borderRadius: 14,
    overflow: 'hidden',
  },
  editorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0d1117',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  editorTitle: {
    marginLeft: 6,
    fontSize: 12,
  },
  code: {
    minHeight: 220,
    padding: 12,
    color: '#e6edf3',
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
  },
  runButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  output: {
    backgroundColor: '#0d1117',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  outputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  outputText: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 19,
  },
});
