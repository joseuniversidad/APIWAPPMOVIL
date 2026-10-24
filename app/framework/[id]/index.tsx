import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/animated-pressable';
import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { FRAMEWORK_GITHUB_REPOS } from '@/data/github-repos';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGithubRepo } from '@/hooks/use-github-repo';
import { useResponsive } from '@/hooks/use-responsive';
import { youtubeSearchUrl } from '@/utils/external-links';

const compactNumber = new Intl.NumberFormat('es', { notation: 'compact' });

export default function FrameworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFrameworkById, getLanguageById } = useCatalog();
  const framework = getFrameworkById(id);
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const githubState = useGithubRepo(framework ? FRAMEWORK_GITHUB_REPOS[framework.id] : undefined);

  if (!framework) {
    return (
      <ThemedView style={styles.notFound}>
        <BackButton fallbackHref="/" />
        <ThemedText type="subtitle">Framework no encontrado</ThemedText>
      </ThemedView>
    );
  }

  const language = getLanguageById(framework.languageId);

  const openRepo = async () => {
    if (githubState.status !== 'success') return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync(githubState.data.url);
  };

  const openDocs = async () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync(framework.docsUrl);
  };

  const goToLanguage = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    if (language) router.push(`/language/${language.id}`);
  };

  const openVideos = async () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync(youtubeSearchUrl(`${framework.name} tutorial para principiantes`));
  };

  return (
    <>
      <Stack.Screen options={{ title: framework.name }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <BackButton fallbackHref="/" />

        <Animated.View entering={FadeIn.duration(300)} style={[styles.banner, { backgroundColor: framework.color }]}>
          <ThemedText style={styles.bannerText} lightColor="#fff" darkColor="#fff">
            {framework.name}
          </ThemedText>
          <ThemedText style={styles.bannerTagline} lightColor="#f2f2f2" darkColor="#f2f2f2">
            {framework.tagline}
          </ThemedText>
        </Animated.View>

        {language ? (
          <AnimatedPressable onPress={goToLanguage} style={styles.languageRow}>
            <ThemedView
              style={[styles.languagePill, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
              <View style={[styles.languageDot, { backgroundColor: language.color }]} />
              <ThemedText style={{ flex: 1 }}>
                Basado en <ThemedText type="defaultSemiBold">{language.name}</ThemedText>
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={palette.icon} />
            </ThemedView>
          </AnimatedPressable>
        ) : null}

        <View style={styles.infoRow}>
          <InfoPill icon="calendar-outline" label="Año" value={String(framework.year)} />
          <InfoPill icon="person-outline" label="Creado por" value={framework.creator} />
        </View>

        <ThemedView style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="logo-github" size={18} color={palette.tint} />
            <ThemedText type="subtitle">En GitHub ahora mismo</ThemedText>
          </View>

          {githubState.status === 'loading' ? (
            <ActivityIndicator style={{ marginVertical: 6 }} color={palette.tint} />
          ) : githubState.status === 'error' ? (
            <ThemedText style={{ opacity: 0.6 }}>{githubState.message}</ThemedText>
          ) : (
            <AnimatedPressable onPress={openRepo} style={styles.githubStatsRow}>
              <GithubStat icon="star" value={compactNumber.format(githubState.data.stars)} label="Estrellas" />
              <GithubStat icon="git-network" value={compactNumber.format(githubState.data.forks)} label="Forks" />
              <GithubStat icon="alert-circle" value={compactNumber.format(githubState.data.openIssues)} label="Issues" />
            </AnimatedPressable>
          )}
        </ThemedView>

        <ThemedView style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="document-text-outline" size={18} color={palette.tint} />
            <ThemedText type="subtitle">¿Qué es?</ThemedText>
          </View>
          <ThemedText style={styles.paragraph}>{framework.description}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={palette.tint} />
            <ThemedText type="subtitle">Características principales</ThemedText>
          </View>
          {framework.keyFeatures.map((feature) => (
            <View key={feature} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: framework.color }]} />
              <ThemedText style={{ flex: 1 }}>{feature}</ThemedText>
            </View>
          ))}
        </ThemedView>

        <View style={[styles.curiosityCard, { backgroundColor: `${framework.color}22`, borderColor: framework.color }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="bulb-outline" size={18} color={framework.color} />
            <ThemedText type="subtitle">¿Sabías qué?</ThemedText>
          </View>
          <ThemedText style={styles.paragraph}>{framework.curiosity}</ThemedText>
        </View>

        <ThemedView style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="apps-outline" size={18} color={palette.tint} />
            <ThemedText type="subtitle">¿Para qué se usa?</ThemedText>
          </View>
          {framework.useCases.map((useCase) => (
            <View key={useCase} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: framework.color }]} />
              <ThemedText style={{ flex: 1 }}>{useCase}</ThemedText>
            </View>
          ))}
        </ThemedView>

        <View style={styles.actions}>
          <AnimatedPressable onPress={openDocs} style={[styles.actionButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="play-outline" size={18} color={colorScheme === 'dark' ? '#000' : '#fff'} />
            <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#000">
              Ver documentación oficial
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
    </>
  );
}

function GithubStat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  return (
    <View style={styles.githubStat}>
      <Ionicons name={icon} size={16} color={palette.icon} />
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
      <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>{label}</ThemedText>
    </View>
  );
}

function InfoPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  return (
    <ThemedView style={[styles.pill, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
      <Ionicons name={icon} size={16} color={palette.icon} />
      <View>
        <ThemedText style={{ fontSize: 11, opacity: 0.6 }}>{label}</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 13 }} numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    padding: 24,
    gap: 4,
    marginTop: 4,
  },
  bannerText: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
  },
  bannerTagline: {
    fontSize: 15,
  },
  languageRow: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  languageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  githubStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  githubStat: {
    alignItems: 'center',
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
