import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/animated-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { type ProgrammingLanguage } from '@/data/languages';
import { DataSourceBadge } from '@/components/data-source-badge';
import { useCatalog } from '@/contexts/catalog-context';

export default function CatalogScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { toggleColorScheme } = useThemeMode();
  const { numColumns } = useResponsive();
  const [query, setQuery] = useState('');
  const { languages } = useCatalog();

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return languages;
    return languages.filter((lang) => lang.name.toLowerCase().includes(normalized));
  }, [query, languages]);

  const handleToggleTheme = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    toggleColorScheme();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.centerWrap}>
        <View style={styles.header}>
          <Image source={require('@/assets/images/icon.png')} style={styles.headerLogo} contentFit="cover" />
          <View style={styles.headerText}>
            <ThemedText type="title">Catálogo de Lenguajes</ThemedText>
            <ThemedText style={{ opacity: 0.7 }}>Historia, fundadores y primeros pasos</ThemedText>
            <DataSourceBadge />
          </View>
          <Pressable
            onPress={handleToggleTheme}
            hitSlop={8}
            style={[styles.themeToggle, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
            <Ionicons name={colorScheme === 'dark' ? 'moon' : 'sunny'} size={18} color={palette.tint} />
          </Pressable>
        </View>

        <View style={[styles.searchBar, { borderColor: palette.icon }]}>
          <Ionicons name="search" size={18} color={palette.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar lenguaje..."
            placeholderTextColor={palette.icon}
            style={[styles.searchInput, { color: palette.text }]}
          />
        </View>

        <ThemedText style={styles.resultsCount}>
          {results.length} {results.length === 1 ? 'lenguaje' : 'lenguajes'}
        </ThemedText>
      </View>

      <FlatList
        key={numColumns}
        data={results}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        renderItem={({ item, index }) => (
          <LanguageCard language={item} index={index} flex={numColumns > 1} />
        )}
        ListEmptyComponent={
          <ThemedText style={{ textAlign: 'center', marginTop: 32, opacity: 0.6 }}>
            No se encontró ningún lenguaje. Intenta con otro nombre.
          </ThemedText>
        }
      />
    </SafeAreaView>
  );
}

function LanguageCard({ language, index, flex }: { language: ProgrammingLanguage; index: number; flex: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    router.push(`/language/${language.id}`);
  };

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40).duration(300)} style={flex ? { flex: 1 } : undefined}>
      <AnimatedPressable onPress={handlePress} style={styles.card}>
        <ThemedView style={[styles.cardInner, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
          <View style={[styles.badge, { backgroundColor: language.color }]}>
            <ThemedText style={styles.badgeText} lightColor="#111" darkColor="#111">
              {language.name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.cardBody}>
            <ThemedText type="defaultSemiBold">{language.name}</ThemedText>
            <ThemedText style={{ opacity: 0.7 }} numberOfLines={2}>
              {language.tagline}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.icon} />
        </ThemedView>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerWrap: {
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  themeToggle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  resultsCount: {
    paddingHorizontal: 16,
    marginBottom: 8,
    opacity: 0.5,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  row: {
    gap: 10,
  },
  card: {
    borderRadius: 14,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
});
