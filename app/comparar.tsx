import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import type { ProgrammingLanguage } from '@/data/languages';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { readableOn } from '@/utils/color';

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
};

// Compara dos lenguajes lado a lado. Acepta ?a=python&b=java para abrirlo ya elegido.
export default function CompareScreen() {
  const params = useLocalSearchParams<{ a?: string; b?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const { contentMaxWidth } = useResponsive();
  const { languages, getLanguageById, getFrameworksByLanguage } = useCatalog();
  const { quizStats } = useUserData();

  const [leftId, setLeftId] = useState<string | undefined>(params.a ?? languages[0]?.id);
  const [rightId, setRightId] = useState<string | undefined>(
    params.b ?? languages.find((l) => l.id !== (params.a ?? languages[0]?.id))?.id
  );
  const [picking, setPicking] = useState<'left' | 'right' | null>(null);

  const left = getLanguageById(leftId);
  const right = getLanguageById(rightId);

  const swap = () => {
    haptic();
    setLeftId(rightId);
    setRightId(leftId);
  };

  const pick = (language: ProgrammingLanguage) => {
    haptic();
    if (picking === 'left') setLeftId(language.id);
    else setRightId(language.id);
    setPicking(null);
  };

  const yearsApart = left && right ? Math.abs(left.year - right.year) : 0;
  const olderName = left && right ? (left.year <= right.year ? left.name : right.name) : '';

  const rows: { label: string; icon: keyof typeof Ionicons.glyphMap; value: (l: ProgrammingLanguage) => string }[] = [
    { label: 'Año', icon: 'calendar-outline', value: (l) => String(l.year) },
    { label: 'Creado por', icon: 'person-outline', value: (l) => l.founders.join(', ') },
    { label: 'Paradigma', icon: 'layers-outline', value: (l) => l.paradigm },
    { label: 'Lema', icon: 'chatbox-ellipses-outline', value: (l) => l.tagline },
    {
      label: 'Frameworks',
      icon: 'hammer-outline',
      value: (l) => getFrameworksByLanguage(l.id).map((f) => f.name).join(', ') || 'Ninguno en el catálogo',
    },
    { label: 'Características', icon: 'checkmark-circle-outline', value: (l) => l.keyFeatures.slice(0, 3).join(' · ') },
    { label: 'Se usa para', icon: 'apps-outline', value: (l) => l.useCases.slice(0, 3).join(' · ') },
    { label: 'Pasos del tutorial', icon: 'school-outline', value: (l) => String(l.steps.length) },
    {
      label: 'Tu mejor quiz',
      icon: 'trophy-outline',
      value: (l) => {
        const best = quizStats.best[l.id];
        return best ? `${best.score}/${best.total}` : 'Sin intentos';
      },
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <BackButton fallbackHref="/" />
        <View style={styles.padded}>
          <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34 }}>
            Comparar
          </ThemedText>
          <ThemedText style={styles.muted}>Elige dos lenguajes para verlos lado a lado.</ThemedText>
        </View>

        <View style={[styles.pickers, styles.padded]}>
          <Selector language={left} onPress={() => setPicking('left')} />
          <Pressable onPress={swap} hitSlop={8} accessibilityRole="button" accessibilityLabel="Intercambiar" style={[styles.swap, { borderColor: border }]}>
            <Ionicons name="swap-horizontal" size={18} color={palette.tint} />
          </Pressable>
          <Selector language={right} onPress={() => setPicking('right')} />
        </View>

        {left && right && (
          <>
            {left.id !== right.id && (
              <ThemedText style={[styles.muted, styles.padded]}>
                {yearsApart === 0
                  ? `Ambos aparecieron en ${left.year}.`
                  : `${olderName} es ${yearsApart} ${yearsApart === 1 ? 'año' : 'años'} más antiguo.`}
              </ThemedText>
            )}
            <View style={[styles.table, { borderColor: border }]}>
              {rows.map((row, index) => (
                <View key={row.label} style={[styles.tableRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }]}>
                  <View style={styles.rowLabel}>
                    <Ionicons name={row.icon} size={14} color={palette.icon} />
                    <ThemedText style={styles.label}>{row.label}</ThemedText>
                  </View>
                  <View style={styles.cells}>
                    <ThemedText style={styles.cell}>{row.value(left)}</ThemedText>
                    <View style={[styles.divider, { backgroundColor: border }]} />
                    <ThemedText style={styles.cell}>{row.value(right)}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={picking !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">Elige un lenguaje</ThemedText>
            <Pressable onPress={() => setPicking(null)} hitSlop={10} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={palette.icon} />
            </Pressable>
          </View>
          <FlatList
            data={languages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const selected = item.id === (picking === 'left' ? leftId : rightId);
              return (
                <Pressable
                  onPress={() => pick(item)}
                  style={({ pressed }) => [styles.option, { borderColor: border }, pressed && { opacity: 0.6 }]}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <ThemedText style={{ flex: 1 }}>{item.name}</ThemedText>
                  <ThemedText style={styles.muted}>{item.year}</ThemedText>
                  {selected && <Ionicons name="checkmark" size={18} color={palette.tint} />}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Selector({ language, onPress }: { language?: ProgrammingLanguage; onPress: () => void }) {
  const color = language?.color ?? '#888888';
  const ink = readableOn(color);
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.selector, { backgroundColor: color }, pressed && { opacity: 0.8 }]}>
      <ThemedText type="defaultSemiBold" lightColor={ink} darkColor={ink} numberOfLines={1} style={{ flex: 1 }}>
        {language?.name ?? 'Elegir'}
      </ThemedText>
      <Ionicons name="chevron-down" size={16} color={ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
    gap: 14,
  },
  padded: {
    paddingHorizontal: 16,
  },
  muted: {
    opacity: 0.65,
    fontSize: 14,
  },
  pickers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  swap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: {
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableRow: {
    padding: 12,
    gap: 8,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  cells: {
    flexDirection: 'row',
    gap: 12,
  },
  cell: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
