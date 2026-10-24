import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/animated-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { youtubeSearchUrl } from '@/utils/external-links';

export default function LanguageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLanguageById, getFrameworksByLanguage } = useCatalog();
  const language = getLanguageById(id);
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();

  // El layout ya muestra "no encontrado" y la cabecera (banner, favorito, compartir, pestañas).
  if (!language) return null;

  const relatedFrameworks = getFrameworksByLanguage(language.id);

  const goTo = (path: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    router.push(path as never);
  };

  const openVideos = async () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync(youtubeSearchUrl(`${language.name} tutorial para principiantes`));
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
      ]}>
      <Stack.Screen options={{ title: language.name }} />
      <Animated.View entering={FadeIn.duration(250)}>
        <ThemedView style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={18} color={palette.tint} />
            <ThemedText type="subtitle">Historia</ThemedText>
          </View>
          <ThemedText style={styles.paragraph}>{language.history}</ThemedText>
        </ThemedView>
      </Animated.View>

      <ThemedView style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="layers-outline" size={18} color={palette.tint} />
          <ThemedText type="subtitle">Paradigma</ThemedText>
        </View>
        <ThemedText style={styles.paragraph}>{language.paradigm}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={palette.tint} />
          <ThemedText type="subtitle">Características principales</ThemedText>
        </View>
        {language.keyFeatures.map((feature) => (
          <View key={feature} style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: language.color }]} />
            <ThemedText style={{ flex: 1 }}>{feature}</ThemedText>
          </View>
        ))}
      </ThemedView>

      <View style={[styles.curiosityCard, { backgroundColor: `${language.color}22`, borderColor: language.color }]}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="bulb-outline" size={18} color={language.color} />
          <ThemedText type="subtitle">¿Sabías qué?</ThemedText>
        </View>
        <ThemedText style={styles.paragraph}>{language.curiosity}</ThemedText>
      </View>

      <ThemedView style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="apps-outline" size={18} color={palette.tint} />
          <ThemedText type="subtitle">¿Para qué se usa?</ThemedText>
        </View>
        {language.useCases.map((useCase) => (
          <View key={useCase} style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: language.color }]} />
            <ThemedText style={{ flex: 1 }}>{useCase}</ThemedText>
          </View>
        ))}
      </ThemedView>

      {relatedFrameworks.length > 0 ? (
        <ThemedView style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="hammer-outline" size={18} color={palette.tint} />
            <ThemedText type="subtitle">Frameworks relacionados</ThemedText>
          </View>
          {relatedFrameworks.map((framework) => (
            <AnimatedPressable
              key={framework.id}
              onPress={() => goTo(`/framework/${framework.id}`)}
              style={styles.frameworkRow}>
              <View style={[styles.frameworkDot, { backgroundColor: framework.color }]} />
              <ThemedText style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{framework.name}</ThemedText> · {framework.tagline}
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={palette.icon} />
            </AnimatedPressable>
          ))}
        </ThemedView>
      ) : null}

      <View style={styles.actions}>
        <AnimatedPressable
          onPress={() => goTo(`/comparar?a=${language.id}`)}
          style={[styles.actionButton, styles.secondaryButton, { borderColor: palette.tint }]}>
          <Ionicons name="git-compare-outline" size={18} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
            Comparar con otro lenguaje
          </ThemedText>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={openVideos}
          style={[styles.actionButton, styles.secondaryButton, { borderColor: palette.tint }]}>
          <Ionicons name="logo-youtube" size={18} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
            Ver videos en YouTube
          </ThemedText>
        </AnimatedPressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Espacio extra abajo para que el botón flotante "Preguntar a la IA" no tape el contenido.
  content: {
    paddingTop: 2,
    paddingBottom: 96,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  curiosityCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paragraph: {
    lineHeight: 22,
    opacity: 0.85,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  frameworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  frameworkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
});
