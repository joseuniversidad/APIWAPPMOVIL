import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/animated-pressable';
import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { getBestScore, saveQuizScore, type BestScore, type ScoreSource } from '@/services/quiz-scores';
import { buildQuiz, quizMessage } from '@/utils/quiz';

const CORRECT = '#2e9e5b';
const WRONG = '#d9534f';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLanguageById, languages, frameworks } = useCatalog();
  const language = getLanguageById(id);
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();

  const [questions, setQuestions] = useState(() => (language ? buildQuiz(language, languages, frameworks) : []));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [savedIn, setSavedIn] = useState<ScoreSource | 'saving' | null>(null);
  const [bestScore, setBestScore] = useState<BestScore>(null);
  const [bestVersion, setBestVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getBestScore(id).then((result) => active && setBestScore(result));
    return () => {
      active = false;
    };
  }, [id, bestVersion]);

  if (!language) {
    return (
      <SafeAreaView style={[styles.notFound, { backgroundColor: palette.background }]} edges={['top']}>
        <BackButton fallbackHref="/" />
        <ThemedText type="subtitle">Lenguaje no encontrado</ThemedText>
      </SafeAreaView>
    );
  }

  const question = questions[current];
  const total = questions.length;
  const accent = language.color;

  const choose = (option: string) => {
    if (selected) return;
    const isCorrect = option === question.answer;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    }
    setSelected(option);
    if (isCorrect) setScore((s) => s + 1);
  };

  const next = async () => {
    if (current + 1 < total) {
      setCurrent((c) => c + 1);
      setSelected(null);
      return;
    }
    setFinished(true);
    setSavedIn('saving');
    const source = await saveQuizScore(language.id, score, total);
    setSavedIn(source);
    setBestVersion((v) => v + 1);
  };

  const restart = () => {
    setQuestions(buildQuiz(language, languages, frameworks));
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setSavedIn(null);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen options={{ title: `Quiz de ${language.name}` }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <BackButton fallbackHref={`/language/${language.id}`} />

        <View style={{ paddingHorizontal: 16, gap: 4 }}>
          <ThemedText type="title">Quiz de {language.name}</ThemedText>
          <ThemedText style={styles.muted}>Pon a prueba lo que aprendiste sobre su historia y su ecosistema.</ThemedText>
          {bestScore && (
            <ThemedText style={[styles.muted, { fontSize: 14 }]}>
              Mejor puntaje: {bestScore.score}/{bestScore.total} · {bestScore.attempts}{' '}
              {bestScore.attempts === 1 ? 'intento' : 'intentos'} ({bestScore.source === 'supabase' ? 'guardado en Supabase' : 'guardado en el dispositivo'})
            </ThemedText>
          )}
        </View>

        {total === 0 ? (
          <ThemedView style={styles.card}>
            <ThemedText>No hay suficientes datos para generar el quiz de este lenguaje.</ThemedText>
          </ThemedView>
        ) : finished ? (
          <Animated.View entering={FadeIn.duration(250)}>
            <ThemedView style={[styles.card, { alignItems: 'center' }]}>
              <Ionicons name={score === total ? 'trophy' : 'ribbon-outline'} size={48} color={accent} />
              <ThemedText type="title" style={{ color: accent }}>
                {score}/{total}
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
                {quizMessage(score, total)}
              </ThemedText>
              <View style={styles.savedRow}>
                {savedIn === 'saving' ? (
                  <ActivityIndicator size="small" color={palette.icon} />
                ) : (
                  <Ionicons name={savedIn === 'supabase' ? 'cloud-done-outline' : 'phone-portrait-outline'} size={16} color={palette.icon} />
                )}
                <ThemedText style={[styles.muted, { fontSize: 14 }]}>
                  {savedIn === 'saving'
                    ? 'Guardando puntaje…'
                    : savedIn === 'supabase'
                      ? 'Puntaje guardado en Supabase'
                      : 'Puntaje guardado en el dispositivo'}
                </ThemedText>
              </View>
              <View style={styles.actions}>
                <AnimatedPressable onPress={restart} style={[styles.button, { backgroundColor: accent }]}>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">
                    Intentar de nuevo
                  </ThemedText>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => router.replace(`/language/${language.id}/aprende`)}
                  style={[styles.button, styles.outline, { borderColor: accent }]}>
                  <Ionicons name="school-outline" size={18} color={accent} />
                  <ThemedText type="defaultSemiBold" style={{ color: accent }}>
                    Repasar en Aprende
                  </ThemedText>
                </AnimatedPressable>
              </View>
            </ThemedView>
          </Animated.View>
        ) : (
          <Animated.View key={current} entering={FadeIn.duration(220)} style={{ gap: 12 }}>
            <View style={{ paddingHorizontal: 16, gap: 6 }}>
              <ThemedText style={styles.muted}>
                Pregunta {current + 1} de {total} · Aciertos: {score}
              </ThemedText>
              <View style={[styles.progressTrack, { backgroundColor: `${accent}22` }]}>
                <View style={[styles.progressFill, { width: `${((current + (selected ? 1 : 0)) / total) * 100}%`, backgroundColor: accent }]} />
              </View>
            </View>

            <ThemedView style={styles.card}>
              <ThemedText type="subtitle">{question.question}</ThemedText>
              {question.options.map((option) => {
                const isAnswer = option === question.answer;
                const isChosen = option === selected;
                const color = selected ? (isAnswer ? CORRECT : isChosen ? WRONG : undefined) : undefined;
                return (
                  <AnimatedPressable
                    key={option}
                    onPress={() => choose(option)}
                    disabled={Boolean(selected)}
                    style={[
                      styles.option,
                      { borderColor: color ?? (colorScheme === 'dark' ? '#2a2d2e' : '#dcdcdc') },
                      color && { backgroundColor: `${color}1A` },
                    ]}>
                    <ThemedText style={[{ flex: 1 }, color ? { color, fontWeight: '600' } : undefined]}>{option}</ThemedText>
                    {selected && (isAnswer || isChosen) && (
                      <Ionicons name={isAnswer ? 'checkmark-circle' : 'close-circle'} size={20} color={color} />
                    )}
                  </AnimatedPressable>
                );
              })}

              {selected && (
                <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10 }}>
                  <ThemedText style={{ color: selected === question.answer ? CORRECT : WRONG, fontWeight: '600' }}>
                    {selected === question.answer ? '¡Correcto!' : 'Incorrecto.'}{' '}
                    <ThemedText style={styles.muted}>{question.explanation}</ThemedText>
                  </ThemedText>
                  <AnimatedPressable onPress={next} style={[styles.button, { backgroundColor: accent }]}>
                    <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">
                      {current + 1 < total ? 'Siguiente pregunta' : 'Ver resultado'}
                    </ThemedText>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </AnimatedPressable>
                </Animated.View>
              )}
            </ThemedView>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  content: {
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 40,
  },
  muted: {
    opacity: 0.7,
  },
  card: {
    gap: 12,
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  outline: {
    borderWidth: 1.5,
  },
  actions: {
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 8,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
