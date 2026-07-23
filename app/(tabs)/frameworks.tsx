import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/animated-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { FRAMEWORKS, type Framework } from '@/data/frameworks';
import { getLanguageById } from '@/data/languages';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

export default function FrameworksScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { numColumns } = useResponsive();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return FRAMEWORKS;
    return FRAMEWORKS.filter(
      (fw) =>
        fw.name.toLowerCase().includes(normalized) ||
        getLanguageById(fw.languageId)?.name.toLowerCase().includes(normalized)
    );
  }, [query]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.centerWrap}>
        <View style={styles.header}>
          <ThemedText type="title">Frameworks</ThemedText>
          <ThemedText style={{ opacity: 0.7 }}>Herramientas construidas sobre cada lenguaje</ThemedText>
        </View>

        <View style={[styles.searchBar, { borderColor: palette.icon }]}>
          <Ionicons name="search" size={18} color={palette.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar framework o lenguaje..."
            placeholderTextColor={palette.icon}
            style={[styles.searchInput, { color: palette.text }]}
          />
        </View>

        <ThemedText style={styles.resultsCount}>
          {results.length} {results.length === 1 ? 'framework' : 'frameworks'}
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
          <FrameworkCard framework={item} index={index} flex={numColumns > 1} />
        )}
        ListEmptyComponent={
          <ThemedText style={{ textAlign: 'center', marginTop: 32, opacity: 0.6 }}>
            No se encontró ningún framework. Intenta con otro nombre.
          </ThemedText>
        }
      />
    </SafeAreaView>
  );
}

function FrameworkCard({ framework, index, flex }: { framework: Framework; index: number; flex: boolean }) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const language = getLanguageById(framework.languageId);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    router.push(`/framework/${framework.id}`);
  };

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40).duration(300)} style={flex ? { flex: 1 } : undefined}>
      <AnimatedPressable onPress={handlePress} style={styles.card}>
        <ThemedView style={[styles.cardInner, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
          <View style={[styles.badge, { backgroundColor: framework.color }]}>
            <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
              {framework.name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.cardBody}>
            <ThemedText type="defaultSemiBold">{framework.name}</ThemedText>
            <ThemedText style={{ opacity: 0.7 }} numberOfLines={1}>
              {framework.tagline}
            </ThemedText>
            {language ? (
              <View style={[styles.languageChip, { backgroundColor: language.color }]}>
                <ThemedText style={styles.languageChipText} lightColor="#111" darkColor="#111">
                  {language.name}
                </ThemedText>
              </View>
            ) : null}
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
    gap: 2,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  languageChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  languageChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
