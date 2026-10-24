import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedPressable } from '@/components/animated-pressable';
import { MaterialForm, MaterialList } from '@/components/materials';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { getLanguageMaterials, type Material } from '@/services/classes';

export default function CoursesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLanguageById } = useCatalog();
  const language = getLanguageById(id);
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { contentMaxWidth } = useResponsive();
  const { isTeacher } = useAuth();
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [version, setVersion] = useState(0);

  // Videos, enlaces y notas que los profesores publicaron "para todos" en este lenguaje.
  useEffect(() => {
    if (!id) return;
    let active = true;
    getLanguageMaterials(id)
      .then((list) => active && setMaterials(list))
      .catch(() => active && setMaterials([]));
    return () => {
      active = false;
    };
  }, [id, version]);

  // El layout ya muestra "no encontrado".
  if (!language) return null;

  const openCourse = async (url: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <>
      <Stack.Screen options={{ title: `Cursos de ${language.name}` }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        {(isTeacher || (materials && materials.length > 0)) && (
          <ThemedView style={[styles.teacherCard, { borderColor: colorScheme === 'dark' ? '#2a2d2e' : '#ececec' }]}>
            <View style={styles.teacherHeader}>
              <ThemedText type="subtitle" style={{ flex: 1 }}>
                Material de profesores
              </ThemedText>
              {isTeacher && (
                <Pressable onPress={() => setShowForm(true)} hitSlop={8}>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                    + Agregar
                  </ThemedText>
                </Pressable>
              )}
            </View>
            {!materials ? (
              <ActivityIndicator color={palette.tint} />
            ) : (
              <MaterialList
                materials={materials}
                onChanged={() => setVersion((v) => v + 1)}
                emptyText={`Publica un video o enlace para todos los que estudian ${language.name}.`}
              />
            )}
          </ThemedView>
        )}

        <ThemedText type="subtitle" style={{ paddingHorizontal: 16 }}>
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
      {isTeacher && (
        <MaterialForm visible={showForm} onClose={() => setShowForm(false)} onSaved={() => setVersion((v) => v + 1)} defaultLanguageId={language.id} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 4,
    paddingBottom: 96,
    gap: 12,
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
  teacherCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
