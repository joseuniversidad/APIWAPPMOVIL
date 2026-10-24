import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Slot, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import { LANGUAGES } from '@/data/languages';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { canRunLanguage } from '@/services/code-runner';
import { readableOn } from '@/utils/color';

// Genera una página estática por lenguaje al exportar la web (evita 404 al recargar en el hosting).
export function generateStaticParams() {
  return LANGUAGES.map((language) => ({ id: language.id }));
}

type Section = 'index' | 'aprende' | 'quiz' | 'cursos';

const SECTIONS: { id: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'index', label: 'Historia', icon: 'time-outline' },
  { id: 'aprende', label: 'Aprende', icon: 'school-outline' },
  { id: 'quiz', label: 'Quiz', icon: 'help-circle-outline' },
  { id: 'cursos', label: 'Cursos', icon: 'play-outline' },
];

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

// Detalle de un lenguaje con pestañas internas: la cabecera (banner, favorito, compartir)
// es común y cada sección es una ruta hija (index, aprende, quiz, cursos).
export default function LanguageLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { contentMaxWidth } = useResponsive();
  const { getLanguageById } = useCatalog();
  const { isFavorite, toggleFavorite, setLastLanguage } = useUserData();
  const language = getLanguageById(id);

  const tail = pathname.split('/')[3] as Section | undefined;
  const active: Section = tail && SECTIONS.some((s) => s.id === tail) ? tail : 'index';
  const compact = active !== 'index';

  useEffect(() => {
    if (language) setLastLanguage(language.id);
  }, [language, setLastLanguage]);

  if (!language) {
    return (
      <SafeAreaView style={[styles.notFound, { backgroundColor: palette.background }]}>
        <BackButton fallbackHref="/" />
        <ThemedText type="subtitle">Lenguaje no encontrado</ThemedText>
      </SafeAreaView>
    );
  }

  const favorite = isFavorite(language.id);
  const ink = readableOn(language.color);
  // Botones y chips translúcidos que contrastan con el color del banner.
  const glass = ink === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.45)';

  const goSection = (section: Section) => {
    if (section === active) return;
    haptic();
    router.replace(section === 'index' ? `/language/${language.id}` : `/language/${language.id}/${section}`);
  };

  const share = async () => {
    haptic();
    try {
      await Share.share({
        message: `${language.name}: ${language.tagline}. Creado en ${language.year} por ${language.founders.join(', ')}. Lo estoy aprendiendo en MiApp54.`,
      });
    } catch {
      // El navegador puede no soportar compartir; no es un error para el usuario.
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const wrap = contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const } : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: language.color }}>
        <View style={[styles.banner, compact && styles.bannerCompact, wrap]}>
          <View style={styles.topRow}>
            <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Volver" style={[styles.roundButton, { backgroundColor: glass }]}>
              <Ionicons name="arrow-back" size={20} color={ink} />
            </Pressable>
            {compact && (
              <ThemedText style={styles.compactTitle} lightColor={ink} darkColor={ink} numberOfLines={1}>
                {language.name}
              </ThemedText>
            )}
            <View style={{ flex: compact ? 0 : 1 }} />
            <Pressable
              onPress={() => {
                haptic();
                toggleFavorite(language.id);
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              style={[styles.roundButton, { backgroundColor: glass }]}>
              <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? (ink === '#ffffff' ? '#ff8fb1' : '#c2185b') : ink} />
            </Pressable>
            <Pressable onPress={share} hitSlop={10} accessibilityRole="button" accessibilityLabel="Compartir" style={[styles.roundButton, { backgroundColor: glass }]}>
              <Ionicons name="share-social-outline" size={20} color={ink} />
            </Pressable>
          </View>

          {!compact && (
            <>
              <ThemedText style={styles.title} lightColor={ink} darkColor={ink}>
                {language.name}
              </ThemedText>
              <ThemedText style={styles.tagline} lightColor={ink} darkColor={ink}>
                {language.tagline}
              </ThemedText>
              <View style={styles.pills}>
                <View style={[styles.pill, { backgroundColor: glass }]}>
                  <Ionicons name="calendar-outline" size={13} color={ink} />
                  <ThemedText style={styles.pillText} lightColor={ink} darkColor={ink}>
                    {language.year}
                  </ThemedText>
                </View>
                <View style={[styles.pill, { backgroundColor: glass, flexShrink: 1 }]}>
                  <Ionicons name="person-outline" size={13} color={ink} />
                  <ThemedText style={styles.pillText} lightColor={ink} darkColor={ink} numberOfLines={1}>
                    {language.founders.join(', ')}
                  </ThemedText>
                </View>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>

      <View style={[styles.segmentWrap, wrap]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segment}>
          {SECTIONS.map((section) => {
            const selected = section.id === active;
            return (
              <Pressable
                key={section.id}
                onPress={() => goSection(section.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[
                  styles.segmentItem,
                  { borderColor: selected ? language.color : colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea' },
                  selected && { backgroundColor: `${language.color}2A` },
                ]}>
                <Ionicons name={section.icon} size={15} color={selected ? palette.text : palette.icon} />
                <ThemedText type={selected ? 'defaultSemiBold' : 'default'} style={styles.segmentText}>
                  {section.label}
                </ThemedText>
              </Pressable>
            );
          })}
          {canRunLanguage(language.id) && (
            <Pressable
              onPress={() => {
                haptic();
                router.push(`/practicar?lenguaje=${language.id}`);
              }}
              accessibilityRole="button"
              style={[styles.segmentItem, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea' }]}>
              <Ionicons name="code-slash-outline" size={15} color={palette.icon} />
              <ThemedText style={styles.segmentText}>Practicar</ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      {active !== 'quiz' && (
        <Pressable
          onPress={() => {
            haptic();
            router.push(`/asistente?lenguaje=${language.id}`);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.fab, { backgroundColor: palette.tint }, pressed && { opacity: 0.8 }]}>
          <Ionicons name="sparkles" size={16} color={palette.background} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.background, fontSize: 14 }}>
            Preguntar a la IA
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  banner: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 18,
    gap: 4,
  },
  bannerCompact: {
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  tagline: {
    opacity: 0.85,
    fontSize: 15,
    lineHeight: 21,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  segmentWrap: {
    paddingVertical: 10,
  },
  segment: {
    gap: 8,
    paddingHorizontal: 16,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1.5,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 46,
    borderRadius: 23,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
