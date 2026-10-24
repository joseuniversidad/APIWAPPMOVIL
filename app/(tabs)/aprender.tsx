import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import { LEARNING_PATHS } from '@/data/rutas';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { daysLeft, getChallenges, type Challenge } from '@/services/challenges';
import { createClass, getMyClasses, joinClass, type ClassRoom } from '@/services/classes';
import { readableOn } from '@/utils/color';

const DANGER = '#d9534f';
const SUCCESS = '#2e9e5b';

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

// Pestaña Aprender: retos semanales, rutas de aprendizaje y clases (modo profesor).
export default function LearnTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const surface = colorScheme === 'dark' ? '#1d2022' : '#f4f6f8';
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { isTeacher } = useAuth();
  const { getLanguageById } = useCatalog();
  const { isLanguageDone, refreshCommunity } = useUserData();

  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [classes, setClasses] = useState<ClassRoom[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [className, setClassName] = useState('');
  const [savingClass, setSavingClass] = useState(false);

  const load = useCallback(() => {
    let active = true;
    Promise.all([getChallenges(), getMyClasses()])
      .then(([nextChallenges, nextClasses]) => {
        if (!active) return;
        setChallenges(nextChallenges);
        setClasses(nextClasses);
        setLoadError(null);
      })
      .catch((e) => active && setLoadError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => active && setRefreshing(false));
    return () => {
      active = false;
    };
  }, []);

  // Se recarga cada vez que se entra a la pestaña (un profesor pudo publicar algo nuevo).
  useFocusEffect(load);

  const reload = () => {
    setRefreshing(true);
    load();
  };

  const join = async () => {
    if (code.trim().length < 6) {
      setJoinError('El código tiene 6 caracteres');
      return;
    }
    haptic();
    setJoining(true);
    setJoinError(null);
    try {
      const joined = await joinClass(code);
      setCode('');
      refreshCommunity();
      router.push(`/clase/${joined.id}`);
      load();
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'No se pudo unir a la clase');
    } finally {
      setJoining(false);
    }
  };

  const saveClass = async () => {
    if (className.trim().length < 2) return;
    haptic();
    setSavingClass(true);
    try {
      const id = await createClass(className, '');
      setClassName('');
      setCreating(false);
      refreshCommunity();
      router.push(`/clase/${id}`);
      load();
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'No se pudo crear la clase');
    } finally {
      setSavingClass(false);
    }
  };

  const active = (challenges ?? []).filter((c) => daysLeft(c) >= 0);
  const past = (challenges ?? []).filter((c) => daysLeft(c) < 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={palette.tint} />}
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
          Aprender
        </ThemedText>
        {loadError && <ThemedText style={{ color: DANGER }}>{loadError}</ThemedText>}

        {/* RETOS */}
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.eyebrow}>RETOS DE LA SEMANA</ThemedText>
          {isTeacher && (
            <Pressable onPress={() => router.push('/nuevo-reto')} hitSlop={8}>
              <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 14 }}>
                + Publicar reto
              </ThemedText>
            </Pressable>
          )}
        </View>
        {!challenges ? (
          <ActivityIndicator color={palette.tint} />
        ) : active.length === 0 ? (
          <ThemedText style={styles.muted}>No hay retos abiertos esta semana.</ThemedText>
        ) : (
          active.map((challenge) => {
            const language = getLanguageById(challenge.language_id);
            const left = daysLeft(challenge);
            return (
              <Pressable
                key={challenge.id}
                onPress={() => {
                  haptic();
                  router.push(`/reto/${challenge.id}`);
                }}
                style={({ pressed }) => [
                  styles.challenge,
                  { backgroundColor: `${palette.tint}14`, borderColor: challenge.lo_resolvi ? SUCCESS : `${palette.tint}40` },
                  pressed && { opacity: 0.7 },
                ]}>
                <ThemedText style={[styles.eyebrow, { color: challenge.lo_resolvi ? SUCCESS : palette.tint }]}>
                  {challenge.lo_resolvi ? '✓ RESUELTO' : left === 0 ? 'CIERRA HOY' : `QUEDAN ${left} ${left === 1 ? 'DÍA' : 'DÍAS'}`}
                </ThemedText>
                <ThemedText type="defaultSemiBold">{challenge.titulo}</ThemedText>
                <View style={styles.rowBetween}>
                  {language && (
                    <View style={[styles.langChip, { backgroundColor: language.color }]}>
                      <ThemedText style={styles.langChipText} lightColor={readableOn(language.color)} darkColor={readableOn(language.color)}>
                        {language.name}
                      </ThemedText>
                    </View>
                  )}
                  <ThemedText style={[styles.muted, { fontSize: 13 }]}>
                    {challenge.resueltos} {challenge.resueltos === 1 ? 'lo resolvió' : 'lo resolvieron'}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })
        )}
        {past.length > 0 && (
          <ThemedText style={[styles.muted, { fontSize: 13 }]}>
            Retos anteriores: {past.map((c) => c.titulo).slice(0, 3).join(' · ')}
          </ThemedText>
        )}

        {/* RUTAS */}
        <ThemedText style={[styles.eyebrow, { marginTop: 8 }]}>RUTAS DE APRENDIZAJE</ThemedText>
        {LEARNING_PATHS.map((path) => {
          const languages = path.languages.map((id) => getLanguageById(id)).filter((l) => l !== undefined);
          if (languages.length === 0) return null;
          const done = languages.filter((l) => isLanguageDone(l.id)).length;
          const open = openPath === path.id;
          return (
            <ThemedView key={path.id} style={[styles.card, { borderColor: done === languages.length ? SUCCESS : border }]}>
              <Pressable
                onPress={() => {
                  haptic();
                  setOpenPath(open ? null : path.id);
                }}
                style={{ gap: 6 }}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}>
                <View style={styles.rowBetween}>
                  <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                    {path.emoji} {path.title}
                  </ThemedText>
                  <ThemedText style={[styles.muted, styles.num]}>
                    {done}/{languages.length}
                  </ThemedText>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={palette.icon} />
                </View>
                <ThemedText style={[styles.muted, { fontSize: 13 }]}>{languages.map((l) => l.name).join(' → ')}</ThemedText>
                <View style={[styles.track, { backgroundColor: border }]}>
                  <View style={[styles.fill, { width: `${Math.max(3, (done / languages.length) * 100)}%`, backgroundColor: done === languages.length ? SUCCESS : palette.tint }]} />
                </View>
              </Pressable>
              {open && (
                <View style={{ gap: 4 }}>
                  <ThemedText style={[styles.muted, { fontSize: 13 }]}>
                    {path.description} Cada lenguaje cuenta al terminar su tutorial o sacar 60% en su quiz.
                  </ThemedText>
                  {languages.map((language, index) => {
                    const finished = isLanguageDone(language.id);
                    return (
                      <Pressable
                        key={language.id}
                        onPress={() => router.push(`/language/${language.id}`)}
                        style={({ pressed }) => [styles.pathStep, pressed && { opacity: 0.6 }]}>
                        <View style={[styles.stepDot, { backgroundColor: finished ? SUCCESS : border }]}>
                          {finished ? (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          ) : (
                            <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>{index + 1}</ThemedText>
                          )}
                        </View>
                        <ThemedText style={{ flex: 1 }}>{language.name}</ThemedText>
                        <Ionicons name="chevron-forward" size={16} color={palette.icon} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </ThemedView>
          );
        })}

        {/* CLASES */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <ThemedText style={styles.eyebrow}>MIS CLASES</ThemedText>
          {isTeacher && !creating && (
            <Pressable onPress={() => setCreating(true)} hitSlop={8}>
              <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 14 }}>
                + Crear clase
              </ThemedText>
            </Pressable>
          )}
        </View>

        {creating && (
          <ThemedView style={[styles.card, { borderColor: palette.tint }]}>
            <ThemedText type="defaultSemiBold">Nueva clase</ThemedText>
            <TextInput
              value={className}
              onChangeText={setClassName}
              placeholder="Ej. Programación Web · 5to"
              placeholderTextColor={palette.icon}
              maxLength={60}
              autoFocus
              style={[styles.input, { color: palette.text, borderColor: border, backgroundColor: surface }]}
            />
            <View style={styles.inline}>
              <Pressable onPress={() => setCreating(false)} style={[styles.smallButton, { borderColor: border, borderWidth: 1 }]}>
                <ThemedText>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                onPress={saveClass}
                disabled={savingClass || className.trim().length < 2}
                style={[styles.smallButton, { backgroundColor: palette.tint, flex: 1 }, (savingClass || className.trim().length < 2) && { opacity: 0.5 }]}>
                {savingClass ? (
                  <ActivityIndicator color={palette.background} />
                ) : (
                  <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
                    Crear y ver código
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        )}

        <View style={styles.inline}>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            placeholder="Código de invitación"
            placeholderTextColor={palette.icon}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={join}
            style={[styles.input, styles.codeInput, { color: palette.text, borderColor: border, backgroundColor: surface }]}
          />
          <Pressable
            onPress={join}
            disabled={joining}
            style={({ pressed }) => [styles.smallButton, { backgroundColor: palette.tint }, (pressed || joining) && { opacity: 0.6 }]}>
            {joining ? (
              <ActivityIndicator color={palette.background} />
            ) : (
              <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
                Unirme
              </ThemedText>
            )}
          </Pressable>
        </View>
        {joinError && <ThemedText style={{ color: DANGER, fontSize: 14 }}>{joinError}</ThemedText>}

        {classes?.length === 0 && (
          <ThemedText style={styles.muted}>
            {isTeacher ? 'Crea tu primera clase y comparte el código con tus alumnos.' : 'Pide a tu profesor el código de la clase.'}
          </ThemedText>
        )}
        {classes?.map((classRoom) => (
          <Pressable
            key={classRoom.id}
            onPress={() => {
              haptic();
              router.push(`/clase/${classRoom.id}`);
            }}
            style={({ pressed }) => [styles.classRow, { borderColor: border }, pressed && { opacity: 0.6 }]}>
            <View style={[styles.classIcon, { backgroundColor: `${palette.tint}1F` }]}>
              <Ionicons name={classRoom.soy_profesor ? 'easel-outline' : 'people-outline'} size={20} color={palette.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" numberOfLines={1}>
                {classRoom.nombre}
              </ThemedText>
              <ThemedText style={[styles.muted, { fontSize: 13 }]} numberOfLines={1}>
                {classRoom.soy_profesor
                  ? `${classRoom.alumnos} alumnos · ${classRoom.materiales} materiales`
                  : `Prof. ${classRoom.profesor} · ${classRoom.materiales} materiales`}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.icon} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
    opacity: 0.6,
  },
  muted: {
    opacity: 0.65,
  },
  num: {
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  challenge: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
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
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
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
  pathStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 16,
  },
  codeInput: {
    flex: 1,
    letterSpacing: 2,
    fontWeight: '600',
  },
  smallButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
