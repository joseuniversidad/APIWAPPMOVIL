import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/animated-pressable';
import { AdminPreviewBar, CatalogHighlights } from '@/components/catalog-highlights';
import { DataSourceBadge } from '@/components/data-source-badge';
import { FrameworksList } from '@/components/frameworks-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useNotices } from '@/contexts/notices-context';
import { useUserData } from '@/contexts/user-data-context';
import { type ProgrammingLanguage } from '@/data/languages';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { readableOn } from '@/utils/color';

type Filter = 'todos' | 'favoritos' | 'progreso' | 'anio';
type Section = 'lenguajes' | 'frameworks';

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

export default function CatalogScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const surface = colorScheme === 'dark' ? '#1d2022' : '#f4f6f8';
  const { numColumns, contentMaxWidth } = useResponsive();
  const router = useRouter();
  const { languages, getLanguageById } = useCatalog();
  const { user, isAdmin } = useAuth();
  const { unread } = useNotices();
  const { favorites, steps, lastLanguageId, nickname } = useUserData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [section, setSection] = useState<Section>('lenguajes');

  const fullName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  const greeting = nickname ?? fullName?.split(' ')[0] ?? null;

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = normalized ? languages.filter((lang) => lang.name.toLowerCase().includes(normalized)) : languages;
    if (filter === 'favoritos') list = list.filter((lang) => favorites.includes(lang.id));
    if (filter === 'progreso') list = list.filter((lang) => (steps[lang.id]?.length ?? 0) > 0);
    if (filter === 'anio') list = [...list].sort((a, b) => a.year - b.year);
    return list;
  }, [query, languages, filter, favorites, steps]);

  const lastLanguage = getLanguageById(lastLanguageId ?? undefined);
  const lastDone = lastLanguage ? (steps[lastLanguage.id]?.length ?? 0) : 0;
  const showContinue = Boolean(lastLanguage) && !query && filter === 'todos';

  const chips: { id: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'todos', label: 'Todos', icon: 'apps-outline' },
    { id: 'favoritos', label: `Favoritos${favorites.length ? ` (${favorites.length})` : ''}`, icon: 'heart-outline' },
    { id: 'progreso', label: 'En progreso', icon: 'school-outline' },
    { id: 'anio', label: 'Por año', icon: 'calendar-outline' },
  ];

  const emptyMessage =
    filter === 'favoritos'
      ? 'Aún no tienes favoritos. Toca el corazón en el detalle de un lenguaje.'
      : filter === 'progreso'
        ? 'Todavía no completas pasos del tutorial de ningún lenguaje.'
        : 'No se encontró ningún lenguaje. Intenta con otro nombre.';

  const wrap = contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const } : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={wrap}>
        <AdminPreviewBar />
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.greeting} numberOfLines={1}>
              {greeting ? `Hola, ${greeting} 👋` : 'Hola 👋'}
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              Catálogo
            </ThemedText>
          </View>
          <View>
            <IconButton
              icon={unread > 0 ? 'notifications' : 'notifications-outline'}
              label={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
              border={border}
              onPress={() => {
                haptic();
                router.push('/avisos');
              }}
            />
            {unread > 0 && (
              <View style={styles.unreadBadge} pointerEvents="none">
                <ThemedText style={styles.unreadText}>{unread > 9 ? '9+' : unread}</ThemedText>
              </View>
            )}
          </View>
          <IconButton
            icon="git-compare-outline"
            label="Comparar lenguajes"
            border={border}
            onPress={() => {
              haptic();
              router.push('/comparar');
            }}
          />
          {isAdmin && (
            <IconButton
              icon="add"
              label="Agregar lenguaje"
              border={palette.tint}
              onPress={() => {
                haptic();
                router.push('/agregar-lenguaje');
              }}
            />
          )}
        </View>

        <View style={[styles.segment, { backgroundColor: surface }]}>
          {(['lenguajes', 'frameworks'] as const).map((option) => {
            const selected = section === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  haptic();
                  setSection(option);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.segmentItem, selected && { backgroundColor: palette.background }]}>
                <ThemedText
                  type={selected ? 'defaultSemiBold' : 'default'}
                  style={{ fontSize: 14, color: selected ? palette.tint : palette.icon }}>
                  {option === 'lenguajes' ? 'Lenguajes' : 'Frameworks'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.searchBar, { borderColor: border, backgroundColor: surface }]}>
          <Ionicons name="search" size={18} color={palette.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={section === 'lenguajes' ? 'Buscar lenguaje…' : 'Buscar framework o lenguaje…'}
            placeholderTextColor={palette.icon}
            returnKeyType="search"
            style={[styles.searchInput, { color: palette.text }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={18} color={palette.icon} />
            </Pressable>
          )}
        </View>

        {section === 'lenguajes' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {chips.map((chip) => {
              const selected = filter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => {
                    haptic();
                    setFilter(chip.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, { borderColor: selected ? palette.tint : border }, selected && { backgroundColor: palette.tint }]}>
                  <Ionicons name={chip.icon} size={14} color={selected ? palette.background : palette.icon} />
                  <ThemedText style={[styles.chipText, { color: selected ? palette.background : palette.text }]}>{chip.label}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {section === 'frameworks' ? (
        <View style={{ flex: 1, paddingTop: 12 }}>
          <FrameworksList query={query} />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={results}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, wrap]}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 4 }}>
              {!query && filter === 'todos' && <CatalogHighlights />}
              {showContinue && lastLanguage && (
                <AnimatedPressable
                  onPress={() => {
                    haptic();
                    router.push(`/language/${lastLanguage.id}/aprende`);
                  }}>
                  <View style={[styles.continueCard, { backgroundColor: `${palette.tint}14`, borderColor: `${palette.tint}40` }]}>
                    <LanguageBadge language={lastLanguage} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <ThemedText style={[styles.eyebrow, { color: palette.tint }]}>CONTINÚA DONDE TE QUEDASTE</ThemedText>
                      <ThemedText type="defaultSemiBold">{lastLanguage.name}</ThemedText>
                      {lastLanguage.steps.length > 0 && (
                        <>
                          <View style={[styles.track, { backgroundColor: border }]}>
                            <View
                              style={[
                                styles.fill,
                                { width: `${(lastDone / lastLanguage.steps.length) * 100}%`, backgroundColor: palette.tint },
                              ]}
                            />
                          </View>
                          <ThemedText style={styles.meta}>
                            {lastDone} de {lastLanguage.steps.length} pasos del tutorial
                          </ThemedText>
                        </>
                      )}
                    </View>
                    <Ionicons name="play-circle" size={30} color={palette.tint} />
                  </View>
                </AnimatedPressable>
              )}
              <View style={styles.countRow}>
                <ThemedText style={styles.meta}>
                  {results.length} {results.length === 1 ? 'lenguaje' : 'lenguajes'}
                </ThemedText>
                <DataSourceBadge />
              </View>
            </View>
          }
          renderItem={({ item, index }) => <LanguageRow language={item} index={index} flex={numColumns > 1} border={border} />}
          ListEmptyComponent={<ThemedText style={styles.empty}>{emptyMessage}</ThemedText>}
        />
      )}
    </SafeAreaView>
  );
}

function IconButton({
  icon,
  label,
  border,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  border: string;
  onPress: () => void;
}) {
  const palette = Colors[useColorScheme() ?? 'light'];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, { borderColor: border }, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={18} color={palette.tint} />
    </Pressable>
  );
}

function LanguageBadge({ language, size = 44 }: { language: ProgrammingLanguage; size?: number }) {
  return (
    <View style={[styles.badge, { backgroundColor: language.color, width: size, height: size, borderRadius: size / 2 }]}>
      <ThemedText style={styles.badgeText} lightColor={readableOn(language.color)} darkColor={readableOn(language.color)}>
        {language.name.slice(0, 2).toUpperCase()}
      </ThemedText>
    </View>
  );
}

function LanguageRow({ language, index, flex, border }: { language: ProgrammingLanguage; index: number; flex: boolean; border: string }) {
  const palette = Colors[useColorScheme() ?? 'light'];
  const router = useRouter();
  const { isFavorite, quizStats } = useUserData();
  const best = quizStats.best[language.id];

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 30).duration(250)} style={flex ? { flex: 1 } : undefined}>
      <AnimatedPressable
        onPress={() => {
          haptic();
          router.push(`/language/${language.id}`);
        }}>
        <ThemedView style={[styles.card, { borderColor: border }]}>
          <LanguageBadge language={language} />
          <View style={styles.cardBody}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {language.name}
              </ThemedText>
              {isFavorite(language.id) && <Ionicons name="heart" size={14} color="#e5484d" />}
            </View>
            <ThemedText style={styles.meta} numberOfLines={1}>
              {language.year} · {language.founders[0]}
              {language.founders.length > 1 ? ' y otros' : ''}
            </ThemedText>
          </View>
          {best ? (
            <View style={[styles.score, { borderColor: border }]}>
              <Ionicons name="star" size={12} color="#e0a100" />
              <ThemedText style={styles.scoreText}>
                {best.score}/{best.total}
              </ThemedText>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={palette.icon} />
          )}
        </ThemedView>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 14,
    opacity: 0.65,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 3,
    borderRadius: 12,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderRadius: 9,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#e5484d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  row: {
    gap: 8,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: '700',
    lineHeight: 14,
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
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  cardBody: {
    flex: 1,
    gap: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    opacity: 0.6,
    paddingHorizontal: 24,
  },
});
