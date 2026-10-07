import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/animated-pressable';
import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';

export default function CoursesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLanguageById } = useCatalog();
  const language = getLanguageById(id);
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { contentMaxWidth } = useResponsive();

  if (!language) {
    return (
      <SafeAreaView style={[styles.notFound, { backgroundColor: palette.background }]} edges={['top']}>
        <BackButton fallbackHref="/" />
        <ThemedText type="subtitle">Lenguaje no encontrado</ThemedText>
      </SafeAreaView>
    );
  }

  const openCourse = async (url: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen options={{ title: `Cursos de ${language.name}` }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <BackButton fallbackHref={`/language/${language.id}`} />

        <ThemedText type="title" style={{ paddingHorizontal: 16 }}>
          Sigue aprendiendo
        </ThemedText>
        <ThemedText style={[styles.intro, { paddingHorizontal: 16 }]}>
          Estos recursos te llevarán a documentación y cursos gratuitos para dominar {language.name}.
        </ThemedText>

        {language.courses.map((course) => (
          <AnimatedPressable key={course.url} onPress={() => openCourse(course.url)} style={styles.courseCard}>
            <ThemedView
              style={[styles.courseInner, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
              <View style={[styles.iconWrap, { backgroundColor: language.color }]}>
                <Ionicons name="play" size={18} color="#111" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText type="defaultSemiBold">{course.title}</ThemedText>
                <ThemedText style={{ opacity: 0.6, fontSize: 13 }}>{course.platform}</ThemedText>
              </View>
              <Ionicons name="open-outline" size={20} color={palette.icon} />
            </ThemedView>
          </AnimatedPressable>
        ))}

        <ThemedView style={[styles.tipCard, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
          <Ionicons name="bulb-outline" size={18} color={palette.tint} />
          <ThemedText style={{ flex: 1, opacity: 0.8 }}>
            Consejo: escribe el código de tus cursos a mano en lugar de copiarlo. Así aprenderás más
            rápido.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 12,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: {
    opacity: 0.75,
    lineHeight: 21,
    marginTop: 4,
  },
  courseCard: {
    marginHorizontal: 16,
  },
  courseInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
