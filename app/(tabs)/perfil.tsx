import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TokenExpiry } from '@/components/token-expiry';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useThemeMode, type ThemeMode } from '@/contexts/theme-context';
import { useUserData } from '@/contexts/user-data-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { LEARNING_PATHS } from '@/data/rutas';
import { computeBadges } from '@/utils/badges';
import { applyReminder, getReminderPrefs, remindersSupported, type ReminderPrefs } from '@/services/reminders';

const DANGER = '#d9534f';

const LINKS = [
  { title: 'Documentación de Expo', icon: 'book-outline' as const, url: 'https://docs.expo.dev/' },
  { title: 'Documentación de React Native', icon: 'logo-react' as const, url: 'https://reactnative.dev/' },
];

const MODE_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

const REMINDER_HOURS = [8, 13, 19, 21];

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const { mode, setMode } = useThemeMode();
  const { contentMaxWidth } = useResponsive();
  const { languages, frameworks, getLanguageById } = useCatalog();
  const { session, user, role, signOut } = useAuth();
  const {
    quizStats, streak, bestStreak, activeDays, favorites, nickname, updateNickname, lastLanguageId,
    steps, solvedChallenges, classesCount, isLanguageDone,
  } = useUserData();
  const [showAllBadges, setShowAllBadges] = useState(false);

  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  const displayName = fullName ?? nickname ?? user?.email?.split('@')[0] ?? 'Mi cuenta';
  const email = user?.email ?? null;
  const roleLabel = role === 'admin' ? 'Superusuario' : role === 'profesor' ? 'Profesor' : 'Estudiante';

  // Insignias calculadas con lo que la app ya guarda.
  const badges = computeBadges({
    quizAttempts: quizStats.attempts,
    bestByLanguage: quizStats.best,
    longestStreak: bestStreak,
    completedTutorials: languages.filter((l) => l.steps.length > 0 && (steps[l.id]?.length ?? 0) >= l.steps.length).length,
    solvedChallenges,
    classes: classesCount,
    completedPaths: LEARNING_PATHS.filter((path) => {
      const ids = path.languages.filter((id) => getLanguageById(id));
      return ids.length > 0 && ids.every(isLanguageDone);
    }).length,
    favorites: favorites.length,
  });
  const earned = badges.filter((b) => b.earned).length;
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  // null = sin editar: el campo muestra el apodo guardado.
  const [editedNick, setEditedNick] = useState<string | null>(null);
  const draft = editedNick ?? nickname ?? '';
  const [savingNick, setSavingNick] = useState(false);
  const [nickMessage, setNickMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [reminder, setReminder] = useState<ReminderPrefs | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (remindersSupported) getReminderPrefs().then(setReminder);
  }, []);

  const saveNick = async () => {
    haptic();
    setSavingNick(true);
    setNickMessage(null);
    try {
      await updateNickname(draft);
      setEditedNick(null);
      setNickMessage({ text: 'Apodo guardado. Así aparecerás en el ranking.', error: false });
    } catch (e) {
      setNickMessage({ text: e instanceof Error ? e.message : 'No se pudo guardar', error: true });
    } finally {
      setSavingNick(false);
    }
  };

  const changeReminder = async (next: ReminderPrefs) => {
    haptic();
    setReminder(next);
    setReminderError(null);
    const languageName = getLanguageById(lastLanguageId ?? undefined)?.name;
    const ok = await applyReminder(next, { languageName, streak }).catch(() => false);
    if (!ok && next.enabled) {
      setReminder({ ...next, enabled: false });
      setReminderError('Activa los permisos de notificaciones en los ajustes del teléfono.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
            <ThemedText style={styles.avatarText} lightColor="#fff" darkColor="#000">
              {initials || '?'}
            </ThemedText>
          </View>
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            {displayName}
          </ThemedText>
          {email && <ThemedText style={styles.muted}>{email}</ThemedText>}
          <View style={[styles.badge, { backgroundColor: `${palette.tint}1F` }]}>
            <Ionicons name={role === 'admin' ? 'shield-checkmark' : role === 'profesor' ? 'easel-outline' : 'school-outline'} size={13} color={palette.tint} />
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: palette.tint }}>{roleLabel}</ThemedText>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat value={String(quizStats.attempts)} label="quizzes" border={border} />
          <Stat value={quizStats.averagePercent === null ? '—' : `${quizStats.averagePercent}%`} label="aciertos" border={border} />
          <Stat value={`${streak}🔥`} label={streak === 1 ? 'día seguido' : 'días seguidos'} border={border} />
        </View>
        <ThemedText style={[styles.muted, { textAlign: 'center', fontSize: 13 }]}>
          {activeDays} {activeDays === 1 ? 'día' : 'días'} de estudio · {favorites.length}{' '}
          {favorites.length === 1 ? 'favorito' : 'favoritos'}
        </ThemedText>

        <ThemedView style={[styles.card, { borderColor: border }]}>
          <View style={styles.inline}>
            <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
              Insignias · {earned} de {badges.length}
            </ThemedText>
            <Pressable onPress={() => setShowAllBadges((v) => !v)} hitSlop={8}>
              <ThemedText style={{ color: palette.tint, fontSize: 14 }}>{showAllBadges ? 'Ver menos' : 'Ver todas'}</ThemedText>
            </Pressable>
          </View>
          <View style={styles.badges}>
            {[...badges]
              .sort((a, b) => Number(b.earned) - Number(a.earned))
              .slice(0, showAllBadges ? badges.length : 8)
              .map((badge) => (
                <View
                  key={badge.id}
                  accessibilityLabel={`${badge.title}${badge.earned ? ', ganada' : `, pendiente: ${badge.hint}`}`}
                  style={[styles.badgeTile, { borderColor: badge.earned ? palette.tint : border }, !badge.earned && styles.badgeLocked]}>
                  <ThemedText style={styles.badgeEmoji}>{badge.emoji}</ThemedText>
                  <ThemedText style={styles.badgeTitle} numberOfLines={2}>
                    {badge.title}
                  </ThemedText>
                  {showAllBadges && !badge.earned && (
                    <ThemedText style={styles.badgeHint} numberOfLines={3}>
                      {badge.hint}
                    </ThemedText>
                  )}
                </View>
              ))}
          </View>
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: border }]}>
          <ThemedText type="defaultSemiBold">Apodo para el ranking</ThemedText>
          <View style={styles.inline}>
            <TextInput
              value={draft}
              onChangeText={setEditedNick}
              placeholder="Ej. CodeNinja"
              placeholderTextColor={palette.icon}
              maxLength={24}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={saveNick}
              style={[styles.input, { color: palette.text, borderColor: border }]}
            />
            <Pressable
              onPress={saveNick}
              disabled={savingNick || draft.trim().length < 2 || draft.trim() === nickname}
              style={({ pressed }) => [
                styles.smallButton,
                { backgroundColor: palette.tint },
                (pressed || savingNick || draft.trim().length < 2 || draft.trim() === nickname) && { opacity: 0.5 },
              ]}>
              {savingNick ? (
                <ActivityIndicator color={palette.background} size="small" />
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: palette.background, fontSize: 14 }}>
                  Guardar
                </ThemedText>
              )}
            </Pressable>
          </View>
          {nickMessage && (
            <ThemedText style={{ fontSize: 13, color: nickMessage.error ? DANGER : '#2e9e5b' }}>{nickMessage.text}</ThemedText>
          )}
        </ThemedView>

        <ThemedView style={[styles.card, { borderColor: border }]}>
          <ThemedText type="defaultSemiBold">Apariencia</ThemedText>
          <View style={styles.modeRow}>
            {MODE_OPTIONS.map((option) => {
              const selected = mode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  onPress={() => {
                    haptic();
                    setMode(option.mode);
                  }}
                  style={[
                    styles.modeOption,
                    { borderColor: selected ? palette.tint : border },
                    selected && { backgroundColor: `${palette.tint}1A` },
                  ]}>
                  <Ionicons name={option.icon} size={18} color={selected ? palette.tint : palette.icon} />
                  <ThemedText type={selected ? 'defaultSemiBold' : 'default'} style={[{ fontSize: 14 }, selected && { color: palette.tint }]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        {remindersSupported && reminder && (
          <ThemedView style={[styles.card, { borderColor: border }]}>
            <View style={styles.inline}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Recordatorio diario</ThemedText>
                <ThemedText style={[styles.muted, { fontSize: 13 }]}>Te avisa para no perder tu racha.</ThemedText>
              </View>
              <Switch
                value={reminder.enabled}
                onValueChange={(enabled) => changeReminder({ ...reminder, enabled })}
                trackColor={{ true: palette.tint }}
              />
            </View>
            {reminder.enabled && (
              <View style={styles.modeRow}>
                {REMINDER_HOURS.map((hour) => {
                  const selected = reminder.hour === hour;
                  return (
                    <Pressable
                      key={hour}
                      onPress={() => changeReminder({ ...reminder, hour })}
                      style={[
                        styles.hourOption,
                        { borderColor: selected ? palette.tint : border },
                        selected && { backgroundColor: `${palette.tint}1A` },
                      ]}>
                      <ThemedText style={[{ fontSize: 14 }, selected && { color: palette.tint, fontWeight: '600' }]}>
                        {String(hour).padStart(2, '0')}:00
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {reminderError && <ThemedText style={{ fontSize: 13, color: DANGER }}>{reminderError}</ThemedText>}
          </ThemedView>
        )}

        {session && (
          <ThemedView style={[styles.card, { borderColor: border }]}>
            <ThemedText type="defaultSemiBold">Sesión de la API</ThemedText>
            <ThemedText style={styles.muted}>{session.email}</ThemedText>
            <TokenExpiry expiresAt={session.expiresAt} />
          </ThemedView>
        )}

        <ThemedView style={[styles.card, { borderColor: border }]}>
          <Pressable
            onPress={() => {
              haptic();
              setShowAbout((v) => !v);
            }}
            style={styles.inline}>
            <Image source={require('@/assets/images/icon.png')} style={styles.icon} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Acerca de la app</ThemedText>
              <ThemedText style={[styles.muted, { fontSize: 13 }]}>
                {languages.length} lenguajes · {frameworks.length} frameworks
              </ThemedText>
            </View>
            <Ionicons name={showAbout ? 'chevron-up' : 'chevron-down'} size={18} color={palette.icon} />
          </Pressable>
          {showAbout && (
            <View style={{ gap: 10 }}>
              <ThemedText style={styles.paragraph}>
                App móvil hecha con React Native y Expo para conocer la historia de los lenguajes de programación, escribir tu
                primer programa en cada uno y practicar con quizzes.
              </ThemedText>
              <ThemedText style={[styles.muted, { fontSize: 14 }]}>Desarrollado por Albert Jacf II</ThemedText>
              {LINKS.map((link) => (
                <Pressable
                  key={link.url}
                  onPress={() => WebBrowser.openBrowserAsync(link.url)}
                  style={({ pressed }) => [styles.inline, { paddingVertical: 6 }, pressed && { opacity: 0.6 }]}>
                  <Ionicons name={link.icon} size={18} color={palette.tint} />
                  <ThemedText style={{ flex: 1, color: palette.tint }}>{link.title}</ThemedText>
                  <Ionicons name="open-outline" size={16} color={palette.icon} />
                </Pressable>
              ))}
            </View>
          )}
        </ThemedView>

        {/* signOut cierra la cuenta y la sesión de la API del compañero, y regresa al login. */}
        <Pressable
          onPress={() => {
            haptic();
            signOut();
          }}
          style={({ pressed }) => [styles.signOut, { borderColor: `${DANGER}66` }, pressed && { opacity: 0.6 }]}>
          <Ionicons name="log-out-outline" size={20} color={DANGER} />
          <ThemedText type="defaultSemiBold" style={{ color: DANGER }}>
            Cerrar sesión
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, border }: { value: string; label: string; border: string }) {
  return (
    <ThemedView style={[styles.stat, { borderColor: border }]}>
      <ThemedText type="subtitle" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.muted, { fontSize: 12, textAlign: 'center' }]}>{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 4,
  },
  muted: {
    opacity: 0.65,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 16,
  },
  smallButton: {
    minHeight: 46,
    minWidth: 86,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeOption: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  hourOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeTile: {
    width: '22.5%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  badgeLocked: {
    opacity: 0.4,
    borderStyle: 'dashed',
  },
  badgeEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  badgeTitle: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  badgeHint: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    opacity: 0.8,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  paragraph: {
    opacity: 0.8,
    lineHeight: 22,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
