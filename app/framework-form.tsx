import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { deleteFramework, saveFramework } from '@/services/admin';
import { readableOn } from '@/utils/color';

const DANGER = '#d9534f';
const COLORS = ['#61dafb', '#42b883', '#dd0031', '#ff3e00', '#000000', '#092e20', '#ff2d20', '#6db33f', '#512bd4', '#02569b', '#cc0000', '#e535ab'];

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

// Agregar o editar (?editar=react) un framework. Solo superusuario.
// Aparece al instante en el catálogo de todos (Realtime).
export default function FrameworkFormScreen() {
  const { editar, lenguaje } = useLocalSearchParams<{ editar?: string; lenguaje?: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const surface = colorScheme === 'dark' ? '#1d2022' : '#f4f6f8';
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { languages, getFrameworkById, reload } = useCatalog();
  const [editing] = useState(() => getFrameworkById(editar));

  const [name, setName] = useState(editing?.name ?? '');
  const [languageId, setLanguageId] = useState(editing?.languageId ?? lenguaje ?? languages[0]?.id ?? '');
  const [tagline, setTagline] = useState(editing?.tagline ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [year, setYear] = useState(editing ? String(editing.year) : '');
  const [creator, setCreator] = useState(editing?.creator ?? '');
  const [color, setColor] = useState(editing?.color ?? COLORS[0]);
  const [keyFeatures, setKeyFeatures] = useState(editing?.keyFeatures.join('\n') ?? '');
  const [useCases, setUseCases] = useState(editing?.useCases.join('\n') ?? '');
  const [curiosity, setCuriosity] = useState(editing?.curiosity ?? '');
  const [docsUrl, setDocsUrl] = useState(editing?.docsUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = editing?.id ?? slugify(name);

  const save = async () => {
    const yearNumber = Number(year);
    const problem = !name.trim()
      ? 'Escribe el nombre'
      : !id
        ? 'El nombre debe tener letras o números'
        : !editing && getFrameworkById(id)
          ? `Ya existe un framework con el id "${id}"`
          : !tagline.trim()
            ? 'Escribe el lema'
            : !description.trim()
              ? 'Escribe la descripción'
              : !Number.isInteger(yearNumber) || yearNumber < 1970 || yearNumber > new Date().getFullYear()
                ? 'Escribe un año válido'
                : !creator.trim()
                  ? 'Escribe quién lo creó'
                  : !curiosity.trim()
                    ? 'Escribe un dato curioso'
                    : !/^https?:\/\//.test(docsUrl.trim())
                      ? 'El enlace a la documentación debe empezar con http:// o https://'
                      : null;
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    try {
      await saveFramework({
        id,
        name: name.trim(),
        languageId,
        tagline: tagline.trim(),
        description: description.trim(),
        year: yearNumber,
        creator: creator.trim(),
        color: color.toLowerCase(),
        keyFeatures: lines(keyFeatures),
        curiosity: curiosity.trim(),
        useCases: lines(useCases),
        docsUrl: docsUrl.trim(),
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reload();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await deleteFramework(editing.id);
      reload();
      router.replace('/admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar');
      setSaving(false);
    }
  };

  const input = [styles.input, { color: palette.text, borderColor: border, backgroundColor: surface }];
  const field = (label: string, value: string, onChange: (v: string) => void, extra: Partial<ComponentProps<typeof TextInput>> = {}) => (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput value={value} onChangeText={onChange} placeholderTextColor={palette.icon} style={[input, extra.multiline && { minHeight: 90 }]} textAlignVertical={extra.multiline ? 'top' : 'center'} {...extra} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}>
          <BackButton fallbackHref="/admin" />
          <View style={[styles.padded, styles.header]}>
            <View style={[styles.badge, { backgroundColor: color }]}>
              <ThemedText style={styles.badgeText} lightColor={readableOn(color)} darkColor={readableOn(color)}>
                {(name.trim() || '?').slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="title" style={{ fontSize: 26, lineHeight: 32 }}>
                {editing ? `Editar ${editing.name}` : 'Nuevo framework'}
              </ThemedText>
              <ThemedText style={styles.muted}>Aparece al instante en el catálogo de todos.</ThemedText>
            </View>
          </View>

          <View style={[styles.padded, { gap: 12 }]}>
            {field('Nombre *', name, setName, { placeholder: 'Ej. Svelte', maxLength: 60 })}
            {!editing && name.trim().length > 0 && <ThemedText style={styles.hint}>Identificador: {id}</ThemedText>}

            <View style={styles.field}>
              <ThemedText style={styles.label}>Lenguaje *</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {languages.map((language) => {
                  const selected = language.id === languageId;
                  return (
                    <Pressable
                      key={language.id}
                      onPress={() => setLanguageId(language.id)}
                      style={[styles.chip, { borderColor: selected ? language.color : border }, selected && { backgroundColor: `${language.color}33` }]}>
                      <ThemedText style={{ fontSize: 14 }}>{language.name}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {field('Lema *', tagline, setTagline, { placeholder: 'Ej. Interfaces rápidas sin DOM virtual', maxLength: 120 })}
            {field('Descripción *', description, setDescription, { multiline: true })}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>{field('Año *', year, (v) => setYear(v.replace(/\D/g, '')), { keyboardType: 'number-pad', maxLength: 4, placeholder: '2016' })}</View>
              <View style={{ flex: 2 }}>{field('Creador *', creator, setCreator, { placeholder: 'Rich Harris' })}</View>
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Color *</ThemedText>
              <View style={styles.swatches}>
                {COLORS.map((preset) => (
                  <Pressable
                    key={preset}
                    onPress={() => setColor(preset)}
                    accessibilityLabel={`Color ${preset}`}
                    style={[styles.swatch, { backgroundColor: preset, borderColor: color === preset ? palette.text : 'transparent' }]}
                  />
                ))}
              </View>
            </View>

            {field('Características (una por línea)', keyFeatures, setKeyFeatures, { multiline: true })}
            {field('¿Para qué se usa? (uno por línea)', useCases, setUseCases, { multiline: true })}
            {field('Dato curioso *', curiosity, setCuriosity, { multiline: true })}
            {field('Documentación oficial *', docsUrl, setDocsUrl, { placeholder: 'https://…', autoCapitalize: 'none', keyboardType: 'url' })}

            {error && <ThemedText style={{ color: DANGER }}>{error}</ThemedText>}
            <Pressable onPress={save} disabled={saving} style={({ pressed }) => [styles.primary, { backgroundColor: palette.tint }, (pressed || saving) && { opacity: 0.6 }]}>
              {saving ? (
                <ActivityIndicator color={palette.background} />
              ) : (
                <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
                  {editing ? 'Guardar cambios' : 'Agregar framework'}
                </ThemedText>
              )}
            </Pressable>

            {editing &&
              (confirmDelete ? (
                <View style={[styles.confirm, { borderColor: `${DANGER}66` }]}>
                  <ThemedText style={{ flex: 1 }}>¿Borrar {editing.name}? No se puede deshacer.</ThemedText>
                  <Pressable onPress={() => setConfirmDelete(false)} hitSlop={8}>
                    <ThemedText>No</ThemedText>
                  </Pressable>
                  <Pressable onPress={remove} hitSlop={8}>
                    <ThemedText type="defaultSemiBold" style={{ color: DANGER }}>
                      Sí, borrar
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmDelete(true)} style={{ alignSelf: 'center', padding: 8 }}>
                  <ThemedText style={{ color: DANGER }}>Borrar framework</ThemedText>
                </Pressable>
              ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    gap: 16,
  },
  padded: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 16,
  },
  muted: {
    opacity: 0.65,
  },
  hint: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: -6,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 17,
    paddingHorizontal: 12,
    minHeight: 34,
    justifyContent: 'center',
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
  },
  primary: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: 14,
    marginTop: 6,
  },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
