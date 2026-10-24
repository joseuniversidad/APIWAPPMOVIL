import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/animated-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useUserData } from '@/contexts/user-data-context';
import { type CodeExample } from '@/data/languages';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { canRunLanguage } from '@/services/code-runner';

type TabId = 'instalacion' | 'variables' | 'condicionales' | 'bucles';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'instalacion', label: 'Instalación', icon: 'download-outline' },
  { id: 'variables', label: 'Variables', icon: 'cube-outline' },
  { id: 'condicionales', label: 'Condicionales', icon: 'git-branch-outline' },
  { id: 'bucles', label: 'Bucles', icon: 'repeat-outline' },
];

export default function LearnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLanguageById } = useCatalog();
  const language = getLanguageById(id);
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { steps: progress, toggleStep: saveStep } = useUserData();
  const [tab, setTab] = useState<TabId>('instalacion');
  // Pasos completados guardados en el dispositivo (también cuentan para la racha de estudio).
  const completed = useMemo(() => new Set(progress[id ?? ''] ?? []), [progress, id]);

  // El layout ya muestra "no encontrado".
  if (!language) return null;

  const toggleStep = (index: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveStep(language.id, index);
  };

  const tryInEditor = (example: TabId) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    router.push(`/practicar?lenguaje=${language.id}&ejemplo=${example}`);
  };

  const selectTab = (next: TabId) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setTab(next);
  };

  const topicByTab: Partial<Record<TabId, CodeExample>> = {
    variables: language.variablesExample,
    condicionales: language.conditionalsExample,
    bucles: language.loopsExample,
  };

  return (
    <>
      <Stack.Screen options={{ title: `Aprende ${language.name}` }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <ThemedText style={[styles.intro, { paddingHorizontal: 16 }]}>
          Instálalo y luego aprende variables, condicionales y bucles. Tu avance se guarda.
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TABS.map((option) => {
            const selected = tab === option.id;
            return (
              <AnimatedPressable
                key={option.id}
                onPress={() => selectTab(option.id)}
                style={[
                  styles.tabPill,
                  { borderColor: selected ? language.color : (colorScheme === 'dark' ? '#2a2d2e' : '#ececec') },
                  selected && { backgroundColor: `${language.color}22` },
                ]}>
                <Ionicons name={option.icon} size={16} color={selected ? language.color : palette.icon} />
                <ThemedText
                  type={selected ? 'defaultSemiBold' : 'default'}
                  style={selected ? { color: language.color } : undefined}>
                  {option.label}
                </ThemedText>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        {tab === 'instalacion' ? (
          <Animated.View key="instalacion" entering={FadeIn.duration(220)}>
            <ThemedText style={[styles.sectionIntro, { paddingHorizontal: 16 }]}>
              Sigue estos pasos para instalar {language.name} y escribir tu primer programa. Toca
              cada paso para marcarlo como completado.
            </ThemedText>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: language.color,
                    width: `${(completed.size / language.steps.length) * 100}%`,
                  },
                ]}
              />
            </View>

            {language.steps.map((step, index) => {
              const isDone = completed.has(index);
              return (
                <AnimatedPressable key={step.title} onPress={() => toggleStep(index)}>
                  <ThemedView
                    style={[
                      styles.stepCard,
                      { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' },
                      isDone && { borderColor: language.color },
                    ]}>
                    <View style={styles.stepHeader}>
                      <View
                        style={[styles.stepNumber, { backgroundColor: isDone ? language.color : palette.icon }]}>
                        {isDone ? (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        ) : (
                          <ThemedText style={styles.stepNumberText} lightColor="#fff" darkColor="#fff">
                            {index + 1}
                          </ThemedText>
                        )}
                      </View>
                      <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                        {step.title}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
                    {step.code ? (
                      <View style={styles.codeBlock}>
                        <ThemedText style={styles.codeText} lightColor="#e6e6e6" darkColor="#e6e6e6">
                          {step.code}
                        </ThemedText>
                      </View>
                    ) : null}
                  </ThemedView>
                </AnimatedPressable>
              );
            })}

            <ThemedText style={{ opacity: 0.7, textAlign: 'center', marginTop: 8 }}>
              {completed.size} de {language.steps.length} pasos completados
            </ThemedText>
          </Animated.View>
        ) : (
          <Animated.View key={tab} entering={FadeIn.duration(220)}>
            <TopicCard
              title={TABS.find((t) => t.id === tab)?.label ?? ''}
              icon={TABS.find((t) => t.id === tab)?.icon ?? 'cube-outline'}
              example={topicByTab[tab]}
              color={language.color}
              borderColor={colorScheme === 'dark' ? '#2a2d2e' : '#ececec'}
              onTry={canRunLanguage(language.id) ? () => tryInEditor(tab) : undefined}
            />
          </Animated.View>
        )}

        <View style={styles.footer}>
          <AnimatedPressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              router.replace(`/language/${language.id}/cursos`);
            }}
            style={[styles.actionButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="play-outline" size={18} color={colorScheme === 'dark' ? '#000' : '#fff'} />
            <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#000">
              Sigue aprendiendo con cursos
            </ThemedText>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </>
  );
}

function TopicCard({
  title,
  icon,
  example,
  color,
  borderColor,
  onTry,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  example?: CodeExample;
  color: string;
  borderColor: string;
  onTry?: () => void;
}) {
  if (!example) return null;
  return (
    <ThemedView style={[styles.topicCard, { borderColor }]}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: color }]}>
          <Ionicons name={icon} size={14} color="#fff" />
        </View>
        <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
          {title}
        </ThemedText>
      </View>
      <ThemedText style={styles.stepDescription}>{example.description}</ThemedText>
      <View style={styles.codeBlock}>
        <ThemedText style={styles.codeText} lightColor="#e6e6e6" darkColor="#e6e6e6">
          {example.code}
        </ThemedText>
      </View>
      {onTry && (
        <AnimatedPressable onPress={onTry} style={[styles.tryButton, { borderColor: color }]}>
          <Ionicons name="play" size={16} color={color} />
          <ThemedText type="defaultSemiBold" style={{ color }}>
            Probar en el editor
          </ThemedText>
        </AnimatedPressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Espacio extra abajo para el botón flotante "Preguntar a la IA".
  content: {
    paddingTop: 4,
    paddingBottom: 96,
    gap: 12,
  },
  tryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  intro: {
    opacity: 0.75,
    lineHeight: 21,
    marginTop: 4,
  },
  sectionIntro: {
    opacity: 0.75,
    lineHeight: 21,
    marginBottom: 12,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.25)',
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  topicCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepDescription: {
    opacity: 0.8,
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 12,
  },
  codeText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    marginTop: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
