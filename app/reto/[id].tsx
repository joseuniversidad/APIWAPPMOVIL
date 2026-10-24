import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import { daysLeft, deleteChallenge, getChallenges, verifyChallenge, type Challenge } from '@/services/challenges';
import { canRunLanguage, HELLO_WORLD, runCode, type RunResult } from '@/services/code-runner';
import { readableOn } from '@/utils/color';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const SUCCESS = '#2e9e5b';
const DANGER = '#d9534f';

type Verdict = { ok: true; position: number } | { ok: false } | null;

// Reto semanal: se escribe el código, se ejecuta en Piston y Supabase compara la salida
// con la esperada (que nunca llega al celular).
export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { getLanguageById } = useCatalog();
  const { recordActivity, refreshCommunity } = useUserData();

  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined);
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    getChallenges()
      .then((list) => {
        if (!active) return;
        const found = list.find((c) => String(c.id) === id) ?? null;
        setChallenge(found);
        if (found) setCode(found.codigo_inicial ?? HELLO_WORLD[found.language_id] ?? '');
      })
      .catch((e) => {
        if (!active) return;
        setChallenge(null);
        setError(e instanceof Error ? e.message : 'No se pudo cargar el reto');
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (challenge === undefined) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.tint} />
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <BackButton fallbackHref="/aprender" />
        <ThemedText type="subtitle">{error ?? 'Este reto ya no está disponible'}</ThemedText>
      </SafeAreaView>
    );
  }

  const language = getLanguageById(challenge.language_id);
  const accent = language?.color ?? palette.tint;
  const onAccent = readableOn(accent);
  const left = daysLeft(challenge);
  const runnable = canRunLanguage(challenge.language_id);

  const runAndVerify = async () => {
    if (!code.trim() || running) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRunning(true);
    setError(null);
    setVerdict(null);
    setResult(null);
    try {
      const output = await runCode(challenge.language_id, code);
      setResult(output);
      recordActivity();
      if (output.isError) {
        setVerdict({ ok: false });
        return;
      }
      const position = await verifyChallenge(challenge.id, output.output, code);
      setVerdict(position ? { ok: true, position } : { ok: false });
      if (position) {
        setChallenge({ ...challenge, lo_resolvi: true });
        refreshCommunity();
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(position ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ejecutar el código');
    } finally {
      setRunning(false);
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: `Resolví el reto "${challenge.titulo}" en MiApp54. ¿Te animas?` });
    } catch {
      // Compartir no disponible.
    }
  };

  const remove = async () => {
    try {
      await deleteChallenge(challenge.id);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar el reto');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
          <BackButton fallbackHref="/aprender" label="Aprender" />
          <View style={[styles.padded, { gap: 8 }]}>
            <View style={styles.rowBetween}>
              <View style={[styles.langChip, { backgroundColor: accent }]}>
                <ThemedText style={styles.langChipText} lightColor={onAccent} darkColor={onAccent}>
                  {language?.name ?? challenge.language_id}
                </ThemedText>
              </View>
              <ThemedText style={[styles.muted, { fontSize: 13 }]}>
                {left < 0 ? 'Reto cerrado' : left === 0 ? 'Cierra hoy' : `Quedan ${left} ${left === 1 ? 'día' : 'días'}`} · {challenge.resueltos}{' '}
                {challenge.resueltos === 1 ? 'lo resolvió' : 'lo resolvieron'}
              </ThemedText>
            </View>
            <ThemedText type="title" style={{ fontSize: 24, lineHeight: 30 }}>
              {challenge.titulo}
            </ThemedText>
            <ThemedText style={styles.paragraph}>{challenge.enunciado}</ThemedText>
            {challenge.lo_resolvi && !verdict && (
              <ThemedText style={{ color: SUCCESS, fontWeight: '600' }}>✓ Ya resolviste este reto. Puedes practicar de nuevo.</ThemedText>
            )}
          </View>

          <View style={[styles.editor, styles.marginH]}>
            <TextInput
              value={code}
              onChangeText={setCode}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textAlignVertical="top"
              placeholder="Escribe tu solución…"
              placeholderTextColor="#6b747a"
              style={styles.code}
            />
          </View>

          {runnable ? (
            <Pressable
              onPress={runAndVerify}
              disabled={running || !code.trim()}
              style={({ pressed }) => [styles.runButton, styles.marginH, { backgroundColor: accent }, (pressed || running) && { opacity: 0.7 }]}>
              {running ? <ActivityIndicator color={onAccent} /> : <Ionicons name="play" size={18} color={onAccent} />}
              <ThemedText type="defaultSemiBold" lightColor={onAccent} darkColor={onAccent}>
                {running ? 'Ejecutando y verificando…' : 'Ejecutar y verificar'}
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText style={[styles.padded, styles.muted]}>Este lenguaje todavía no se puede ejecutar desde la app.</ThemedText>
          )}

          {error && <ThemedText style={[styles.padded, { color: DANGER }]}>{error}</ThemedText>}

          {result && (
            <View style={[styles.output, styles.marginH]}>
              <ThemedText style={styles.outputLabel} lightColor="#9aa4ab" darkColor="#9aa4ab">
                SALIDA DE TU PROGRAMA
              </ThemedText>
              <ThemedText selectable style={styles.outputText} lightColor="#e6edf3" darkColor="#e6edf3">
                {result.output.trim() || '(el programa no imprimió nada)'}
              </ThemedText>
            </View>
          )}

          {verdict && (
            <View style={[styles.verdict, styles.marginH, { borderColor: verdict.ok ? SUCCESS : DANGER }]}>
              <Ionicons name={verdict.ok ? 'trophy' : 'close-circle'} size={22} color={verdict.ok ? SUCCESS : DANGER} />
              <ThemedText type="defaultSemiBold" style={{ flex: 1, color: verdict.ok ? SUCCESS : DANGER }}>
                {verdict.ok
                  ? `¡Reto superado! Eres el #${verdict.position} en resolverlo.`
                  : result?.isError
                    ? 'Tu programa tiene un error. Revisa la salida.'
                    : 'La salida no coincide todavía. Revisa el enunciado y vuelve a intentarlo.'}
              </ThemedText>
              {verdict.ok && (
                <Pressable onPress={share} hitSlop={8}>
                  <Ionicons name="share-social-outline" size={20} color={SUCCESS} />
                </Pressable>
              )}
            </View>
          )}

          {challenge.puedo_borrar && (
            <View style={[styles.padded, { marginTop: 8 }]}>
              {confirmDelete ? (
                <View style={styles.confirm}>
                  <ThemedText style={{ flex: 1 }}>¿Borrar este reto y sus resultados?</ThemedText>
                  <Pressable onPress={() => setConfirmDelete(false)} hitSlop={8}>
                    <ThemedText>No</ThemedText>
                  </Pressable>
                  <Pressable onPress={remove} hitSlop={8}>
                    <ThemedText type="defaultSemiBold" style={{ color: DANGER }}>
                      Sí, borrar
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmDelete(true)} style={styles.deleteLink}>
                  <Ionicons name="trash-outline" size={16} color={DANGER} />
                  <ThemedText style={{ color: DANGER }}>Borrar reto</ThemedText>
                </Pressable>
              )}
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
    paddingBottom: 40,
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
  },
  paragraph: {
    lineHeight: 23,
    opacity: 0.9,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  langChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  editor: {
    backgroundColor: '#161b22',
    borderRadius: 14,
    overflow: 'hidden',
  },
  code: {
    minHeight: 200,
    padding: 12,
    color: '#e6edf3',
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 20,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
  },
  output: {
    backgroundColor: '#0d1117',
    borderRadius: 14,
    padding: 12,
    gap: 8,
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
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    padding: 8,
  },
});
