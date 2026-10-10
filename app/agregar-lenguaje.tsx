import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import type { CodeExample, CourseLink, LearnStep } from '@/data/languages';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { addLanguage, type NewLanguage } from '@/services/catalog-api';
import { sessionStorage } from '@/services/session-storage';

const DANGER = '#d9534f';
const SUCCESS = '#2e9e5b';
const ADMIN_KEY_STORAGE = 'admin_key';
const COLOR_PRESETS = ['#f7df1e', '#3776ab', '#e76f00', '#00599c', '#68217a', '#777bb4', '#7f52ff', '#f05138', '#00add8', '#cc342d', '#3178c6', '#dea584', '#0175c2', '#a8b9cc', '#39457e', '#dc322f'];

type ExampleDraft = { description: string; code: string };
type StepDraft = { title: string; description: string; code: string };
type CourseDraft = { title: string; platform: string; url: string };

// "C++" → "cpp", "C#" → "csharp", "Visual Basic" → "visual-basic".
function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, 'p')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const splitList = (text: string, separator: RegExp) =>
  text
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

const toExample = (draft: ExampleDraft): CodeExample | null =>
  draft.code.trim() ? { description: draft.description.trim(), code: draft.code.trimEnd() } : null;

export default function AddLanguageScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { getLanguageById, reload } = useCatalog();

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idEdited, setIdEdited] = useState(false);
  const [tagline, setTagline] = useState('');
  const [year, setYear] = useState('');
  const [paradigm, setParadigm] = useState('');
  const [founders, setFounders] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [history, setHistory] = useState('');
  const [curiosity, setCuriosity] = useState('');
  const [keyFeatures, setKeyFeatures] = useState('');
  const [useCases, setUseCases] = useState('');
  const [variables, setVariables] = useState<ExampleDraft>({ description: '', code: '' });
  const [conditionals, setConditionals] = useState<ExampleDraft>({ description: '', code: '' });
  const [loops, setLoops] = useState<ExampleDraft>({ description: '', code: '' });
  const [steps, setSteps] = useState<StepDraft[]>([{ title: '', description: '', code: '' }]);
  const [courses, setCourses] = useState<CourseDraft[]>([{ title: '', platform: '', url: '' }]);
  const [adminKey, setAdminKey] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Recuerda la clave en este dispositivo para no escribirla cada vez.
  useEffect(() => {
    sessionStorage
      .getItem(ADMIN_KEY_STORAGE)
      .then((saved) => saved && setAdminKey(saved))
      .catch(() => {});
  }, []);

  // Abre el detalle en cuanto el lenguaje nuevo llega al catálogo.
  const created = createdId ? getLanguageById(createdId) : undefined;
  useEffect(() => {
    if (created) router.replace(`/language/${created.id}`);
  }, [created, router]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!idEdited) setId(slugify(value));
  };

  const validate = (): NewLanguage | string => {
    const yearNumber = Number(year);
    if (!name.trim()) return 'Escribe el nombre del lenguaje.';
    if (!/^[a-z0-9_-]+$/.test(id)) return 'El id solo puede tener minúsculas, números, guiones y guion bajo.';
    if (getLanguageById(id)) return `Ya existe un lenguaje con el id "${id}".`;
    if (!tagline.trim()) return 'Escribe el lema (frase corta).';
    if (!Number.isInteger(yearNumber) || yearNumber < 1940 || yearNumber > new Date().getFullYear())
      return 'Escribe un año de creación válido.';
    if (!paradigm.trim()) return 'Escribe el paradigma.';
    if (splitList(founders, /,/).length === 0) return 'Escribe al menos un creador.';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return 'El color debe tener el formato #RRGGBB.';
    if (!history.trim()) return 'Escribe la historia.';
    if (!curiosity.trim()) return 'Escribe un dato curioso.';

    const filledSteps = steps.filter((step) => step.title.trim() || step.description.trim() || step.code.trim());
    if (filledSteps.some((step) => !step.title.trim() || !step.description.trim()))
      return 'Cada paso necesita título y descripción.';
    const filledCourses = courses.filter((course) => course.title.trim() || course.platform.trim() || course.url.trim());
    if (filledCourses.some((course) => !course.title.trim() || !course.platform.trim() || !/^https?:\/\//.test(course.url.trim())))
      return 'Cada curso necesita título, plataforma y un enlace que empiece con http:// o https://.';
    if (!adminKey) return 'Escribe la clave de administrador.';

    return {
      id,
      name: name.trim(),
      tagline: tagline.trim(),
      color: color.toLowerCase(),
      year: yearNumber,
      founders: splitList(founders, /,/),
      paradigm: paradigm.trim(),
      history: history.trim(),
      keyFeatures: splitList(keyFeatures, /\n/),
      curiosity: curiosity.trim(),
      useCases: splitList(useCases, /\n/),
      variablesExample: toExample(variables),
      conditionalsExample: toExample(conditionals),
      loopsExample: toExample(loops),
      steps: filledSteps.map(
        (step): LearnStep => ({
          title: step.title.trim(),
          description: step.description.trim(),
          ...(step.code.trim() ? { code: step.code.trimEnd() } : {}),
        })
      ),
      courses: filledCourses.map(
        (course): CourseLink => ({ title: course.title.trim(), platform: course.platform.trim(), url: course.url.trim() })
      ),
    };
  };

  const submit = async () => {
    const result = validate();
    if (typeof result === 'string') {
      setError(result);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const newId = await addLanguage(result, adminKey);
      await sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey).catch(() => {});
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreatedId(newId);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el lenguaje');
      setSubmitting(false);
    }
  };

  const inputStyle = [styles.input, { color: palette.text, borderColor: `${palette.icon}55` }];
  const codeStyle = [...inputStyle, styles.code];
  const borderColor = colorScheme === 'dark' ? '#2a2d2e' : '#ececec';

  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { placeholder?: string; multiline?: boolean; code?: boolean; hint?: string; numeric?: boolean } = {}
  ) => (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={options.placeholder}
        placeholderTextColor={`${palette.icon}aa`}
        multiline={options.multiline || options.code}
        keyboardType={options.numeric ? 'number-pad' : 'default'}
        autoCapitalize={options.code ? 'none' : 'sentences'}
        autoCorrect={!options.code}
        style={[options.code ? codeStyle : inputStyle, (options.multiline || options.code) && styles.multiline]}
      />
      {options.hint ? <ThemedText style={styles.hint}>{options.hint}</ThemedText> : null}
    </View>
  );

  const exampleFields = (title: string, value: ExampleDraft, onChange: (value: ExampleDraft) => void) => (
    <View style={[styles.subCard, { borderColor }]}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      {field('Explicación', value.description, (description) => onChange({ ...value, description }), {
        placeholder: 'Qué muestra este ejemplo',
      })}
      {field('Código', value.code, (code) => onChange({ ...value, code }), { code: true })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <BackButton fallbackHref="/" />

        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#999' }]}>
            <ThemedText style={styles.badgeText} lightColor="#111" darkColor="#111">
              {(name.trim() || '?').slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Agregar lenguaje</ThemedText>
            <ThemedText style={{ opacity: 0.7 }}>Aparecerá en el catálogo de todos los usuarios al instante.</ThemedText>
          </View>
        </View>

        <Section title="Datos básicos" borderColor={borderColor}>
          {field('Nombre *', name, handleNameChange, { placeholder: 'Ej. Haskell' })}
          {field(
            'Identificador *',
            id,
            (value) => {
              setIdEdited(true);
              setId(value.toLowerCase());
            },
            { placeholder: 'haskell', hint: 'Se usa en la dirección de la página. Se llena solo a partir del nombre.' }
          )}
          {field('Lema *', tagline, setTagline, { placeholder: 'Ej. Programación funcional pura' })}
          {field('Año de creación *', year, (value) => setYear(value.replace(/[^0-9]/g, '')), {
            placeholder: 'Ej. 1990',
            numeric: true,
          })}
          {field('Paradigma *', paradigm, setParadigm, { placeholder: 'Ej. Funcional' })}
          {field('Creadores *', founders, setFounders, {
            placeholder: 'Ej. Simon Peyton Jones, Paul Hudak',
            hint: 'Separados por coma.',
          })}

          <View style={styles.field}>
            <ThemedText style={styles.label}>Color *</ThemedText>
            <View style={styles.swatches}>
              {COLOR_PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setColor(preset)}
                  accessibilityLabel={`Color ${preset}`}
                  style={[
                    styles.swatch,
                    { backgroundColor: preset },
                    color.toLowerCase() === preset && { borderColor: palette.text, borderWidth: 3 },
                  ]}
                />
              ))}
            </View>
            <TextInput
              value={color}
              onChangeText={setColor}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="#RRGGBB"
              placeholderTextColor={`${palette.icon}aa`}
              style={[inputStyle, { maxWidth: 160 }]}
            />
          </View>
        </Section>

        <Section title="Descripción" borderColor={borderColor}>
          {field('Historia *', history, setHistory, { multiline: true, placeholder: 'Cómo y por qué nació el lenguaje' })}
          {field('Dato curioso *', curiosity, setCuriosity, { multiline: true })}
          {field('Características clave', keyFeatures, setKeyFeatures, { multiline: true, hint: 'Una por línea.' })}
          {field('Usos', useCases, setUseCases, { multiline: true, hint: 'Uno por línea. Ej. Desarrollo web' })}
        </Section>

        <Section title="Ejemplos de código" subtitle="Opcionales. Se muestran en la sección Aprende." borderColor={borderColor}>
          {exampleFields('Variables', variables, setVariables)}
          {exampleFields('Condicionales', conditionals, setConditionals)}
          {exampleFields('Bucles', loops, setLoops)}
        </Section>

        <Section title="Pasos para aprender" subtitle="Opcionales. El código de cada paso también." borderColor={borderColor}>
          {steps.map((step, index) => (
            <View key={index} style={[styles.subCard, { borderColor }]}>
              <ListItemHeader
                label={`Paso ${index + 1}`}
                onRemove={steps.length > 1 ? () => setSteps(steps.filter((_, i) => i !== index)) : undefined}
              />
              {field('Título', step.title, (title) => setSteps(steps.map((s, i) => (i === index ? { ...s, title } : s))))}
              {field(
                'Descripción',
                step.description,
                (description) => setSteps(steps.map((s, i) => (i === index ? { ...s, description } : s))),
                { multiline: true }
              )}
              {field('Código', step.code, (code) => setSteps(steps.map((s, i) => (i === index ? { ...s, code } : s))), {
                code: true,
              })}
            </View>
          ))}
          <AddButton label="Agregar paso" onPress={() => setSteps([...steps, { title: '', description: '', code: '' }])} />
        </Section>

        <Section title="Cursos" subtitle="Opcionales. Enlaces a cursos o documentación." borderColor={borderColor}>
          {courses.map((course, index) => (
            <View key={index} style={[styles.subCard, { borderColor }]}>
              <ListItemHeader
                label={`Curso ${index + 1}`}
                onRemove={courses.length > 1 ? () => setCourses(courses.filter((_, i) => i !== index)) : undefined}
              />
              {field('Título', course.title, (title) => setCourses(courses.map((c, i) => (i === index ? { ...c, title } : c))))}
              {field(
                'Plataforma',
                course.platform,
                (platform) => setCourses(courses.map((c, i) => (i === index ? { ...c, platform } : c))),
                { placeholder: 'Ej. YouTube, Udemy, Documentación oficial' }
              )}
              {field('Enlace', course.url, (url) => setCourses(courses.map((c, i) => (i === index ? { ...c, url } : c))), {
                placeholder: 'https://...',
              })}
            </View>
          ))}
          <AddButton label="Agregar curso" onPress={() => setCourses([...courses, { title: '', platform: '', url: '' }])} />
        </Section>

        <Section title="Clave de administrador *" subtitle="La definiste en supabase/agregar-lenguaje.sql." borderColor={borderColor}>
          <TextInput
            value={adminKey}
            onChangeText={setAdminKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Clave"
            placeholderTextColor={`${palette.icon}aa`}
            style={inputStyle}
          />
        </Section>

        {error && (
          <View style={[styles.message, { borderColor: `${DANGER}66`, backgroundColor: `${DANGER}1A` }]}>
            <Ionicons name="alert-circle" size={18} color={DANGER} />
            <ThemedText style={{ color: DANGER, flex: 1 }}>{error}</ThemedText>
          </View>
        )}
        {createdId && (
          <View style={[styles.message, { borderColor: `${SUCCESS}66`, backgroundColor: `${SUCCESS}1A` }]}>
            <ActivityIndicator size="small" color={SUCCESS} />
            <ThemedText style={{ color: SUCCESS, flex: 1 }}>Lenguaje guardado. Abriendo su página…</ThemedText>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => [styles.submit, { backgroundColor: palette.tint }, (pressed || submitting) && { opacity: 0.7 }]}>
          {submitting ? (
            <ActivityIndicator color={palette.background} />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color={palette.background} />
          )}
          <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
            Guardar lenguaje
          </ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  borderColor,
  children,
}: {
  title: string;
  subtitle?: string;
  borderColor: string;
  children: ReactNode;
}) {
  return (
    <ThemedView style={[styles.section, { borderColor }]}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.hint}>{subtitle}</ThemedText> : null}
      {children}
    </ThemedView>
  );
}

function ListItemHeader({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <View style={styles.rowBetween}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Quitar ${label}`}>
          <Ionicons name="trash-outline" size={18} color={DANGER} />
        </Pressable>
      )}
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.addButton, { borderColor: palette.tint }, pressed && { opacity: 0.6 }]}>
      <Ionicons name="add" size={16} color={palette.tint} />
      <ThemedText style={{ color: palette.tint }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 18,
  },
  section: {
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  subCard: {
    padding: 12,
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    opacity: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  code: {
    fontFamily: Fonts?.mono,
    fontSize: 14,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0002',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
