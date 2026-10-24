import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/animated-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { generateAiQuiz } from '@/services/ai-chat';
import { getBestScore, getRanking, saveQuizScore, type BestScore, type RankingRow, type ScoreSource } from '@/services/quiz-scores';
import { getCustomQuestions, toQuizQuestion, type CustomQuestion } from '@/services/quiz-questions';
import { isSupabaseConfigured } from '@/services/supabase';
import { readableOn } from '@/utils/color';
import { buildQuiz, quizMessage, type QuizQuestion } from '@/utils/quiz';

const CORRECT = '#2e9e5b';
const WRONG = '#d9534f';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
// Máximo de preguntas por quiz al mezclar las del catálogo con las de los profesores.
const MAX_QUESTIONS = 8;

function mixQuestions(generated: QuizQuestion[], custom: CustomQuestion[]): QuizQuestion[] {
  const all = [...generated, ...custom.map(toQuizQuestion)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, MAX_QUESTIONS);
}

type QuizMode = 'catalogo' | 'ia';

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLanguageById, languages, frameworks } = useCatalog();
  const { recordActivity, refreshQuizStats } = useUserData();
  const language = getLanguageById(id);
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#dcdfe2';
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();

  const [mode, setMode] = useState<QuizMode>('catalogo');
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => (language ? buildQuiz(language, languages, frameworks) : []));
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [savedIn, setSavedIn] = useState<ScoreSource | 'saving' | null>(null);
  const [bestScore, setBestScore] = useState<BestScore>(null);
  const [bestVersion, setBestVersion] = useState(0);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  // Si el quiz ya empezó, las preguntas propias que lleguen tarde no lo cambian.
  const startedRef = useRef(false);

  // Preguntas que escribieron los profesores y el superusuario para este lenguaje.
  useEffect(() => {
    if (!id || !language) return;
    let active = true;
    getCustomQuestions(id).then((list) => {
      if (!active || list.length === 0) return;
      setCustomQuestions(list);
      setQuestions((current) => (startedRef.current ? current : mixQuestions(buildQuiz(language, languages, frameworks), list)));
    });
    return () => {
      active = false;
    };
    // Solo al abrir el quiz de este lenguaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const [ranking, setRanking] = useState<RankingRow[] | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getBestScore(id).then((result) => active && setBestScore(result));
    return () => {
      active = false;
    };
  }, [id, bestVersion]);

  // El layout ya muestra "no encontrado".
  if (!language) return null;

  const question = questions[current];
  const total = questions.length;
  const accent = language.color;
  const onAccent = readableOn(accent);

  const resetProgress = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setSavedIn(null);
    setRanking(null);
    setRankingError(null);
  };

  const loadQuestions = async (nextMode: QuizMode) => {
    resetProgress();
    setAiError(null);
    if (nextMode === 'catalogo') {
      setQuestions(mixQuestions(buildQuiz(language, languages, frameworks), customQuestions));
      return;
    }
    setGenerating(true);
    setQuestions([]);
    try {
      setQuestions(await generateAiQuiz(language.name));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'No se pudo generar el quiz con IA');
    } finally {
      setGenerating(false);
    }
  };

  const changeMode = (nextMode: QuizMode) => {
    if (nextMode === mode || generating) return;
    haptic();
    setMode(nextMode);
    loadQuestions(nextMode);
  };

  const choose = (option: string) => {
    if (selected) return;
    const isCorrect = option === question.answer;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    }
    startedRef.current = true;
    setSelected(option);
    if (isCorrect) setScore((s) => s + 1);
  };

  const next = async () => {
    haptic();
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
    recordActivity();
    refreshQuizStats();
    if (isSupabaseConfigured()) {
      getRanking(language.id)
        .then(setRanking)
        .catch((e) => setRankingError(e instanceof Error ? e.message : 'No se pudo cargar el ranking'));
    }
  };

  const shareResult = async () => {
    haptic();
    try {
      await Share.share({
        message: `Saqué ${score}/${total} en el quiz de ${language.name} de MiApp54. ¿Puedes superarme?`,
      });
    } catch {
      // Compartir no está disponible en este navegador.
    }
  };

  const wrap = contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const } : undefined;
  const answeredCorrectly = selected === question?.answer;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: `Quiz de ${language.name}` }} />
      <ScrollView contentContainerStyle={[styles.content, wrap]}>
        <View style={[styles.modeRow, { backgroundColor: colorScheme === 'dark' ? '#1d2022' : '#f1f3f5' }]}>
          {(['catalogo', 'ia'] as const).map((option) => {
            const active = mode === option;
            return (
              <Pressable
                key={option}
                onPress={() => changeMode(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.modeItem, active && { backgroundColor: palette.background }]}>
                <Ionicons name={option === 'ia' ? 'sparkles' : 'book-outline'} size={15} color={active ? accent : palette.icon} />
                <ThemedText type={active ? 'defaultSemiBold' : 'default'} style={{ fontSize: 14 }}>
                  {option === 'ia' ? 'Generado con IA' : 'Del catálogo'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {bestScore && !finished && (
          <View style={styles.bestRow}>
            <Ionicons name="trophy-outline" size={14} color={palette.icon} />
            <ThemedText style={styles.muted}>
              Tu mejor puntaje: {bestScore.score}/{bestScore.total} · {bestScore.attempts}{' '}
              {bestScore.attempts === 1 ? 'intento' : 'intentos'}
            </ThemedText>
          </View>
        )}

        {generating ? (
          <View style={styles.generating}>
            <ActivityIndicator color={accent} />
            <ThemedText style={styles.muted}>La IA está escribiendo preguntas nuevas sobre {language.name}…</ThemedText>
          </View>
        ) : aiError ? (
          <ThemedView style={[styles.card, { borderColor: `${WRONG}66` }]}>
            <ThemedText style={{ color: WRONG }}>{aiError}</ThemedText>
            <AnimatedPressable onPress={() => loadQuestions('ia')} style={[styles.button, { backgroundColor: accent }]}>
              <Ionicons name="refresh" size={18} color={onAccent} />
              <ThemedText type="defaultSemiBold" lightColor={onAccent} darkColor={onAccent}>
                Reintentar
              </ThemedText>
            </AnimatedPressable>
          </ThemedView>
        ) : total === 0 ? (
          <ThemedView style={[styles.card, { borderColor: border }]}>
            <ThemedText>No hay suficientes datos para generar el quiz de este lenguaje.</ThemedText>
          </ThemedView>
        ) : finished ? (
          <Animated.View entering={FadeIn.duration(250)} style={{ gap: 14 }}>
            <ThemedView style={[styles.card, { borderColor: border, alignItems: 'center' }]}>
              <Ionicons name={score === total ? 'trophy' : 'ribbon-outline'} size={48} color={accent} />
              <ThemedText type="title" style={styles.num}>
                {score}/{total}
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
                {quizMessage(score, total)}
              </ThemedText>
              <View style={styles.bestRow}>
                {savedIn === 'saving' ? (
                  <ActivityIndicator size="small" color={palette.icon} />
                ) : (
                  <Ionicons name={savedIn === 'supabase' ? 'cloud-done-outline' : 'phone-portrait-outline'} size={14} color={palette.icon} />
                )}
                <ThemedText style={styles.muted}>
                  {savedIn === 'saving' ? 'Guardando puntaje…' : savedIn === 'supabase' ? 'Puntaje guardado en la nube' : 'Puntaje guardado en el dispositivo'}
                </ThemedText>
              </View>
              <View style={styles.resultActions}>
                <AnimatedPressable onPress={() => loadQuestions(mode)} style={[styles.button, { backgroundColor: accent }]}>
                  <Ionicons name="refresh" size={18} color={onAccent} />
                  <ThemedText type="defaultSemiBold" lightColor={onAccent} darkColor={onAccent}>
                    {mode === 'ia' ? 'Preguntas nuevas' : 'Intentar de nuevo'}
                  </ThemedText>
                </AnimatedPressable>
                <View style={styles.rowButtons}>
                  <AnimatedPressable onPress={shareResult} style={[styles.button, styles.outline, styles.half, { borderColor: border }]}>
                    <Ionicons name="share-social-outline" size={18} color={palette.text} />
                    <ThemedText type="defaultSemiBold">Compartir</ThemedText>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => router.replace(`/language/${language.id}/aprende`)}
                    style={[styles.button, styles.outline, styles.half, { borderColor: border }]}>
                    <Ionicons name="school-outline" size={18} color={palette.text} />
                    <ThemedText type="defaultSemiBold">Repasar</ThemedText>
                  </AnimatedPressable>
                </View>
              </View>
            </ThemedView>

            {isSupabaseConfigured() && (
              <ThemedView style={[styles.card, { borderColor: border }]}>
                <View style={styles.bestRow}>
                  <Ionicons name="podium-outline" size={18} color={accent} />
                  <ThemedText type="defaultSemiBold">Ranking de {language.name}</ThemedText>
                </View>
                {rankingError ? (
                  <ThemedText style={styles.muted}>{rankingError}</ThemedText>
                ) : !ranking ? (
                  <ActivityIndicator color={palette.icon} />
                ) : ranking.length === 0 ? (
                  <ThemedText style={styles.muted}>Aún no hay puntajes. ¡Sé el primero!</ThemedText>
                ) : (
                  ranking.map((row) => (
                    <View
                      key={row.posicion}
                      style={[styles.rankRow, row.soy_yo && { backgroundColor: `${accent}26`, borderRadius: 10 }]}>
                      <ThemedText type="defaultSemiBold" style={[styles.rankPos, styles.num]}>
                        {row.posicion <= 3 ? ['🥇', '🥈', '🥉'][row.posicion - 1] : row.posicion}
                      </ThemedText>
                      <ThemedText style={{ flex: 1 }} numberOfLines={1}>
                        {row.apodo}
                        {row.soy_yo ? ' (tú)' : ''}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold" style={styles.num}>
                        {row.puntaje}/{row.total}
                      </ThemedText>
                    </View>
                  ))
                )}
                <ThemedText style={[styles.muted, { fontSize: 13 }]}>Cambia tu apodo en la pestaña Perfil.</ThemedText>
              </ThemedView>
            )}
          </Animated.View>
        ) : (
          <Animated.View key={`${mode}-${current}`} entering={FadeInDown.duration(220)} style={{ gap: 12 }}>
            <View style={styles.progressHeader}>
              <View style={[styles.progressTrack, { backgroundColor: `${accent}33` }]}>
                <View
                  style={[styles.progressFill, { width: `${((current + (selected ? 1 : 0)) / total) * 100}%`, backgroundColor: accent }]}
                />
              </View>
              <ThemedText style={[styles.muted, styles.num]}>
                {current + 1}/{total}
              </ThemedText>
            </View>

            <ThemedText type="subtitle" style={styles.question}>
              {question.question}
            </ThemedText>

            {question.options.map((option, index) => {
              const isAnswer = option === question.answer;
              const isChosen = option === selected;
              const color = selected ? (isAnswer ? CORRECT : isChosen ? WRONG : undefined) : undefined;
              return (
                <AnimatedPressable
                  key={option}
                  onPress={() => choose(option)}
                  disabled={Boolean(selected)}
                  accessibilityRole="button"
                  style={[
                    styles.option,
                    { borderColor: color ?? border },
                    color && { backgroundColor: `${color}1A` },
                    selected && !color && { opacity: 0.55 },
                  ]}>
                  <View style={[styles.letter, { backgroundColor: color ?? `${palette.icon}26` }]}>
                    {color ? (
                      <Ionicons name={isAnswer ? 'checkmark' : 'close'} size={16} color="#fff" />
                    ) : (
                      <ThemedText style={styles.letterText}>{LETTERS[index]}</ThemedText>
                    )}
                  </View>
                  <ThemedText style={[{ flex: 1 }, color ? { color, fontWeight: '600' } : undefined]}>{option}</ThemedText>
                </AnimatedPressable>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>

      {/* Explicación y "Siguiente" fijos abajo, al alcance del pulgar. */}
      {selected && !finished && question && (
        <Animated.View entering={FadeInDown.duration(200)}>
          <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: palette.background, borderColor: border }]}>
            <View style={[{ gap: 10 }, wrap]}>
              <ThemedText type="defaultSemiBold" style={{ color: answeredCorrectly ? CORRECT : WRONG }}>
                {answeredCorrectly ? '¡Correcto!' : `Casi. Era: ${question.answer}`}
              </ThemedText>
              <ThemedText style={styles.muted}>{question.explanation}</ThemedText>
              <AnimatedPressable onPress={next} style={[styles.button, { backgroundColor: accent }]}>
                <ThemedText type="defaultSemiBold" lightColor={onAccent} darkColor={onAccent}>
                  {current + 1 < total ? 'Siguiente' : 'Ver resultado'}
                </ThemedText>
                <Ionicons name="arrow-forward" size={18} color={onAccent} />
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 14,
  },
  muted: {
    opacity: 0.7,
    fontSize: 14,
  },
  num: {
    fontVariant: ['tabular-nums'],
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 9,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generating: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  question: {
    lineHeight: 28,
    marginVertical: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  letter: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontWeight: '700',
    fontSize: 14,
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  outline: {
    borderWidth: 1.5,
  },
  resultActions: {
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 6,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  rankPos: {
    width: 28,
    textAlign: 'center',
  },
});
