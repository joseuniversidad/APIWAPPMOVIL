import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { addCustomQuestion, deleteCustomQuestion, getCustomQuestions, type CustomQuestion } from '@/services/quiz-questions';

const DANGER = '#d9534f';
const SUCCESS = '#2e9e5b';
const LETTERS = ['A', 'B', 'C', 'D'];

// Preguntas propias del quiz de un lenguaje (profesores y superusuario).
// Se mezclan con las preguntas que la app genera a partir del catálogo.
export default function QuestionsScreen() {
  const params = useLocalSearchParams<{ lenguaje?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const surface = colorScheme === 'dark' ? '#1d2022' : '#f4f6f8';
  const { contentMaxWidth } = useResponsive();
  const { user, isAdmin } = useAuth();
  const { languages, getLanguageById } = useCatalog();

  const [languageId, setLanguageId] = useState(params.lenguaje ?? languages[0]?.id ?? '');
  const [questions, setQuestions] = useState<CustomQuestion[] | null>(null);
  const [version, setVersion] = useState(0);
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState(['', '', '', '']);
  const [correcta, setCorrecta] = useState(0);
  const [explicacion, setExplicacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!languageId) return;
    let active = true;
    getCustomQuestions(languageId).then((list) => active && setQuestions(list));
    return () => {
      active = false;
    };
  }, [languageId, version]);

  const save = async () => {
    const filled = opciones.map((o) => o.trim());
    const problem =
      pregunta.trim().length < 5
        ? 'Escribe la pregunta'
        : filled.some((o) => !o)
          ? 'Llena las 4 opciones'
          : new Set(filled.map((o) => o.toLowerCase())).size < 4
            ? 'Las opciones no pueden repetirse'
            : null;
    if (problem) return setMessage({ text: problem, ok: false });
    setSaving(true);
    setMessage(null);
    try {
      await addCustomQuestion({ languageId, pregunta, opciones: filled, respuesta: filled[correcta], explicacion });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPregunta('');
      setOpciones(['', '', '', '']);
      setCorrecta(0);
      setExplicacion('');
      setMessage({ text: 'Pregunta agregada. Ya aparece en el quiz.', ok: true });
      setVersion((v) => v + 1);
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'No se pudo guardar', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteCustomQuestion(id);
      setVersion((v) => v + 1);
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'No se pudo borrar', ok: false });
    }
  };

  const input = [styles.input, { color: palette.text, borderColor: border, backgroundColor: surface }];
  const language = getLanguageById(languageId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
          <BackButton fallbackHref="/admin" />
          <View style={styles.padded}>
            <ThemedText type="title" style={{ fontSize: 26, lineHeight: 32 }}>
              Preguntas del quiz
            </ThemedText>
            <ThemedText style={styles.muted}>Tus preguntas se mezclan con las del catálogo en el quiz de cada lenguaje.</ThemedText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.padded, { gap: 6 }]}>
            {languages.map((l) => {
              const selected = l.id === languageId;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setLanguageId(l.id)}
                  style={[styles.chip, { borderColor: selected ? l.color : border }, selected && { backgroundColor: `${l.color}33` }]}>
                  <ThemedText style={{ fontSize: 14 }}>{l.name}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.padded, styles.card, { borderColor: border }]}>
            <ThemedText type="defaultSemiBold">Nueva pregunta de {language?.name ?? '…'}</ThemedText>
            <TextInput
              value={pregunta}
              onChangeText={setPregunta}
              placeholder="Ej. ¿Qué palabra se usa para declarar una constante?"
              placeholderTextColor={palette.icon}
              multiline
              maxLength={300}
              style={[input, { minHeight: 70 }]}
              textAlignVertical="top"
            />
            <ThemedText style={styles.hint}>Toca la letra de la respuesta correcta:</ThemedText>
            {opciones.map((value, index) => {
              const isRight = correcta === index;
              return (
                <View key={index} style={styles.optionRow}>
                  <Pressable
                    onPress={() => setCorrecta(index)}
                    accessibilityLabel={`Marcar opción ${LETTERS[index]} como correcta`}
                    style={[styles.letter, { backgroundColor: isRight ? SUCCESS : surface, borderColor: isRight ? SUCCESS : border }]}>
                    {isRight ? <Ionicons name="checkmark" size={16} color="#fff" /> : <ThemedText style={{ fontWeight: '700' }}>{LETTERS[index]}</ThemedText>}
                  </Pressable>
                  <TextInput
                    value={value}
                    onChangeText={(text) => setOpciones((current) => current.map((o, i) => (i === index ? text : o)))}
                    placeholder={`Opción ${LETTERS[index]}`}
                    placeholderTextColor={palette.icon}
                    maxLength={120}
                    style={[input, { flex: 1 }, isRight && { borderColor: SUCCESS }]}
                  />
                </View>
              );
            })}
            <TextInput
              value={explicacion}
              onChangeText={setExplicacion}
              placeholder="Explicación (se muestra al responder)"
              placeholderTextColor={palette.icon}
              multiline
              maxLength={300}
              style={[input, { minHeight: 60 }]}
              textAlignVertical="top"
            />
            {message && <ThemedText style={{ color: message.ok ? SUCCESS : DANGER, fontSize: 14 }}>{message.text}</ThemedText>}
            <Pressable onPress={save} disabled={saving} style={({ pressed }) => [styles.primary, { backgroundColor: palette.tint }, (pressed || saving) && { opacity: 0.6 }]}>
              {saving ? (
                <ActivityIndicator color={palette.background} />
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
                  Agregar pregunta
                </ThemedText>
              )}
            </Pressable>
          </View>

          <View style={styles.padded}>
            <ThemedText style={styles.eyebrow}>PREGUNTAS PROPIAS ({questions?.length ?? 0})</ThemedText>
            {!questions ? (
              <ActivityIndicator color={palette.tint} />
            ) : questions.length === 0 ? (
              <ThemedText style={styles.muted}>Todavía no hay preguntas propias para este lenguaje.</ThemedText>
            ) : (
              questions.map((q, index) => (
                <View key={q.id} style={[styles.listItem, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText type="defaultSemiBold">{q.pregunta}</ThemedText>
                    <ThemedText style={[styles.hint, { color: SUCCESS, opacity: 1 }]}>✓ {q.respuesta}</ThemedText>
                  </View>
                  {(q.autor_id === user?.id || isAdmin) && (
                    <Pressable onPress={() => remove(q.id)} hitSlop={8} accessibilityLabel="Borrar pregunta">
                      <Ionicons name="trash-outline" size={20} color={DANGER} />
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  hint: {
    fontSize: 13,
    opacity: 0.65,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
    opacity: 0.6,
    marginBottom: 6,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 17,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  letter: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
});
