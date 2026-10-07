import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useThemeMode, type ThemeMode } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

const LINKS = [
  { title: 'Documentación de Expo', icon: 'book-outline' as const, url: 'https://docs.expo.dev/' },
  { title: 'Documentación de React Native', icon: 'logo-react' as const, url: 'https://reactnative.dev/' },
];

const MODE_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Oscuro', icon: 'moon-outline' },
];

export default function AboutScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { mode, setMode } = useThemeMode();
  const { contentMaxWidth } = useResponsive();
  const { languages, frameworks } = useCatalog();

  const openLink = async (url: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.hero}>
          <Image source={require('@/assets/images/icon.png')} style={styles.icon} contentFit="cover" />
          <ThemedText type="title">Catálogo de Lenguajes</ThemedText>
          <ThemedText style={{ opacity: 0.7, textAlign: 'center' }}>
            Una app móvil multiplataforma para conocer la historia y los primeros pasos de{' '}
            {languages.length} lenguajes de programación, y explorar {frameworks.length} frameworks
            construidos sobre ellos.
          </ThemedText>
        </Animated.View>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Apariencia</ThemedText>
          <View style={styles.modeRow}>
            {MODE_OPTIONS.map((option) => {
              const selected = mode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setMode(option.mode);
                  }}
                  style={[
                    styles.modeOption,
                    { borderColor: selected ? palette.tint : (colorScheme === 'dark' ? '#2a2d2e' : '#ececec') },
                    selected && { backgroundColor: `${palette.tint}1A` },
                  ]}>
                  <Ionicons name={option.icon} size={18} color={selected ? palette.tint : palette.icon} />
                  <ThemedText
                    type={selected ? 'defaultSemiBold' : 'default'}
                    style={selected ? { color: palette.tint } : undefined}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Sobre este proyecto</ThemedText>
          <ThemedText style={styles.paragraph}>
            Esta aplicación fue desarrollada como proyecto individual usando React Native y Expo.
            Su objetivo es enseñar de forma sencilla el origen de distintos lenguajes de
            programación y guiar a quien la use a escribir su primer programa en cada uno.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Qué encontrarás</ThemedText>
          <FeatureRow icon="time-outline" text="La historia y el fundador de cada lenguaje" />
          <FeatureRow icon="school-outline" text="Un tutorial paso a paso para tu primer programa" />
          <FeatureRow icon="hammer-outline" text="Frameworks populares y el lenguaje detrás de cada uno" />
          <FeatureRow icon="play-outline" text="Cursos y documentación oficial para seguir aprendiendo" />
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Desarrollado por</ThemedText>
          <View style={styles.developerRow}>
            <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.avatarText} lightColor="#fff" darkColor="#000">
                AJ
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Albert Jacf II</ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>Proyecto individual · React Native + Expo</ThemedText>
            </View>
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Recursos</ThemedText>
          {LINKS.map((link) => (
            <Pressable
              key={link.url}
              onPress={() => openLink(link.url)}
              style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}>
              <Ionicons name={link.icon} size={20} color={palette.tint} />
              <ThemedText type="link" style={{ flex: 1 }}>
                {link.title}
              </ThemedText>
              <Ionicons name="open-outline" size={18} color={palette.icon} />
            </Pressable>
          ))}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={palette.tint} />
      <ThemedText style={{ flex: 1 }}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 4,
  },
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  paragraph: {
    opacity: 0.8,
    lineHeight: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  developerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 16,
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
});
