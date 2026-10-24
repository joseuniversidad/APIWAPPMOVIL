import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOutUp,
  interpolate,
  LinearTransition,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Floating, HoverCard, Marquee, readableColor, Reveal, RevealSection, ScrollProvider } from '@/components/landing/animations';
import { CodeTypewriter } from '@/components/landing/code-typewriter';
import { LoginForm } from '@/components/login-form';
import { Colors } from '@/constants/theme';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Página de bienvenida con el login: navbar fija, scroll por secciones y animaciones.
// Se adapta a computadora, tablet y celular.

const SECTIONS = [
  { key: 'lenguajes', label: 'Lenguajes' },
  { key: 'codigo', label: 'Código' },
  { key: 'frameworks', label: 'Frameworks' },
  { key: 'como', label: 'Cómo funciona' },
  { key: 'roles', label: 'Roles' },
  { key: 'faq', label: 'Preguntas' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];
type IconName = keyof typeof Ionicons.glyphMap;

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'person-add-outline', title: 'Crea tu cuenta', text: 'Solo nombre, correo y contraseña. Entras al instante, sin confirmar correos.' },
  { icon: 'compass-outline', title: 'Elige un lenguaje', text: 'Revisa su historia, para qué sirve y cómo se ve su código.' },
  { icon: 'code-slash-outline', title: 'Aprende y practica', text: 'Sigue los pasos, escribe código y pon a prueba lo que sabes con el quiz.' },
  { icon: 'stats-chart-outline', title: 'Mide tu progreso', text: 'Guarda favoritos, sube en el ranking y cumple los retos semanales.' },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'library-outline', title: 'Catálogo completo', text: 'Historia, características, curiosidades y ejemplos de cada lenguaje.' },
  { icon: 'help-circle-outline', title: 'Quiz con ranking', text: 'Preguntas por lenguaje y una tabla para competir con tus compañeros.' },
  { icon: 'trophy-outline', title: 'Retos semanales', text: 'Tus profesores publican retos para practicar lo que vas aprendiendo.' },
  { icon: 'sparkles-outline', title: 'Asistente con IA', text: 'Pregunta tus dudas de programación y recibe explicaciones al momento.' },
  { icon: 'terminal-outline', title: 'Practicar código', text: 'Escribe y ejecuta tus programas sin instalar nada.' },
  { icon: 'git-compare-outline', title: 'Comparar lenguajes', text: 'Pon dos lenguajes lado a lado y descubre sus diferencias.' },
];

const ROLES: { label: string; title: string; note: string; text: string; perks: string[]; featured?: boolean }[] = [
  {
    label: 'Para aprender',
    title: 'Estudiante',
    note: 'al registrarte',
    text: 'Todo lo que necesitas para conocer lenguajes y empezar a programar.',
    perks: ['Catálogo de lenguajes y frameworks', 'Quiz y ranking', 'Asistente con IA', 'Retos de tus clases'],
  },
  {
    label: 'Para enseñar',
    title: 'Profesor',
    note: 'lo nombra el superusuario',
    text: 'Todo lo del estudiante, más herramientas para guiar a tu grupo.',
    perks: ['Crea clases', 'Sube videos, enlaces y notas', 'Publica retos y preguntas', 'Ve el progreso de tus alumnos'],
    featured: true,
  },
  {
    label: 'Para administrar',
    title: 'Superusuario',
    note: 'una cuenta de confianza',
    text: 'Control total del contenido que ve toda la escuela.',
    perks: ['Agrega y edita lenguajes', 'Administra frameworks', 'Nombra profesores', 'Envía avisos a todos'],
  },
];

function useLandingColors() {
  const scheme = useColorScheme() ?? 'light';
  const dark = scheme === 'dark';
  const palette = Colors[scheme];
  return {
    dark,
    text: palette.text,
    page: dark ? palette.background : '#f3f6fa',
    muted: dark ? '#9BA1A6' : '#5b6670',
    surface: dark ? '#1d2022' : '#ffffff',
    border: dark ? '#2a2d2e' : '#e3e8ef',
    accent: dark ? '#4ea1ff' : '#0a7ea4',
    onAccent: dark ? '#0b1220' : '#ffffff',
  };
}

type LandingColors = ReturnType<typeof useLandingColors>;

export function LandingPage() {
  const c = useLandingColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { languages, frameworks } = useCatalog();
  const phone = width < 700;
  const desktop = width >= 1000;
  const gutter = phone ? 16 : 32;

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const emailRef = useRef<TextInput>(null);
  const scrollY = useSharedValue(0);
  const viewport = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const sectionTops = useRef<Partial<Record<SectionKey, number>>>({});
  const topsShared = useSharedValue<number[]>([]);
  const loginTop = useRef({ row: 0, card: 0 });

  const [active, setActive] = useState(-1);
  const [showTop, setShowTop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [allLanguages, setAllLanguages] = useState(false);
  const [allFrameworks, setAllFrameworks] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // La navbar marca la sección que se está leyendo.
  useAnimatedReaction(
    () => {
      const y = scrollY.value + 160;
      let index = -1;
      topsShared.value.forEach((top, i) => {
        if (top > 0 && y >= top) index = i;
      });
      return index;
    },
    (index, previous) => {
      if (index !== previous) scheduleOnRN(setActive, index);
    }
  );

  useAnimatedReaction(
    () => scrollY.value > 700,
    (visible, previous) => {
      if (visible !== previous) scheduleOnRN(setShowTop, visible);
    }
  );

  const registerTop = (key: SectionKey, y: number) => {
    sectionTops.current[key] = y;
    topsShared.set(SECTIONS.map((section) => sectionTops.current[section.key] ?? 0));
  };

  const navOffset = insets.top + (phone ? 72 : 96);
  const scrollTo = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
  const goTo = (key: SectionKey) => {
    setMenuOpen(false);
    scrollTo((sectionTops.current[key] ?? 0) - navOffset + 16);
  };
  const focusLogin = () => {
    setMenuOpen(false);
    scrollTo(phone ? loginTop.current.row + loginTop.current.card - navOffset : 0);
    setTimeout(() => emailRef.current?.focus(), 450);
  };

  const navBackground = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [phone ? 0.85 : 0, 1], Extrapolation.CLAMP),
  }));
  const progressStyle = useAnimatedStyle(() => {
    const max = Math.max(1, contentHeight.value - viewport.value);
    return { width: `${Math.min(100, (scrollY.value / max) * 100)}%` };
  });

  const languageName = useMemo(() => new Map(languages.map((language) => [language.id, language.name])), [languages]);
  const languageCols = desktop ? 4 : phone ? 2 : 3;
  const frameworkCols = desktop ? 4 : phone ? 1 : 2;
  const shownLanguages = allLanguages ? languages : languages.slice(0, languageCols * 2);
  const shownFrameworks = allFrameworks ? frameworks : frameworks.slice(0, desktop ? 8 : 4);
  const container: ViewStyle = { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: gutter };
  const sectionSpace = phone ? 64 : 104;

  return (
    <View style={{ flex: 1, backgroundColor: c.page }}>
      <ScrollProvider value={{ scrollY, viewport }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            onLayout={(event) => (viewport.value = event.nativeEvent.layout.height)}
            onContentSizeChange={(_, height) => (contentHeight.value = height)}>
            {/* ---------- Portada con el login ---------- */}
            <RevealSection style={[container, { paddingTop: insets.top + (phone ? 96 : 150), paddingBottom: phone ? 48 : 88 }]}>
              <HeroGlow colors={languages.slice(0, 4).map((language) => readableColor(language.color, c.dark))} phone={phone} />
              <View
                style={[styles.heroRow, !desktop && styles.heroColumn]}
                onLayout={(event) => (loginTop.current.row = event.nativeEvent.layout.y)}>
                <View style={[styles.heroText, !desktop && { alignItems: phone ? 'flex-start' : 'center' }]}>
                  <Reveal index={0}>
                    <View style={[styles.pill, { borderColor: c.border, backgroundColor: c.surface }]}>
                      <View style={[styles.liveDot, { backgroundColor: '#2e9e5b' }]} />
                      <Text style={[styles.pillText, { color: c.text }]}>
                        {languages.length} lenguajes · {frameworks.length} frameworks
                      </Text>
                    </View>
                  </Reveal>
                  <Reveal index={1}>
                    <Text
                      style={[
                        styles.heroTitle,
                        { color: c.text, fontSize: phone ? 38 : desktop ? 62 : 52, lineHeight: phone ? 44 : desktop ? 68 : 58 },
                        !desktop && !phone && { textAlign: 'center' },
                      ]}>
                      Aprende a programar en
                    </Text>
                    <RotatingWord
                      words={languages.slice(0, 10).map((language) => ({ text: language.name, color: readableColor(language.color, c.dark) }))}
                      size={phone ? 38 : desktop ? 62 : 52}
                      lineHeight={phone ? 46 : desktop ? 72 : 60}
                      center={!desktop && !phone}
                    />
                  </Reveal>
                  <Reveal index={2}>
                    <Text style={[styles.heroSubtitle, { color: c.muted, fontSize: phone ? 16 : 19 }, !desktop && !phone && { textAlign: 'center' }]}>
                      Conoce la historia, la sintaxis y los frameworks de cada lenguaje. Practica con quizzes, retos y un asistente con
                      inteligencia artificial.
                    </Text>
                  </Reveal>
                  <Reveal index={3} style={[styles.ctaRow, !desktop && !phone && { justifyContent: 'center' }]}>
                    <ActionButton label="Crear cuenta gratis" icon="person-add-outline" onPress={() => router.push('/registro')} c={c} grow={phone} />
                    <ActionButton label="Explorar lenguajes" icon="arrow-down" variant="outline" onPress={() => goTo('lenguajes')} c={c} grow={phone} />
                  </Reveal>
                  <Reveal index={4} style={[styles.statsRow, !desktop && !phone && { justifyContent: 'center' }]}>
                    <Stat value={languages.length} label="Lenguajes" c={c} />
                    <Stat value={frameworks.length} label="Frameworks" c={c} />
                    <Stat value={3} label="Roles" c={c} />
                  </Reveal>
                </View>

                <View
                  style={[styles.loginColumn, !desktop && { width: '100%', maxWidth: 480, alignSelf: 'center' }]}
                  onLayout={(event) => (loginTop.current.card = event.nativeEvent.layout.y)}>
                  <Reveal index={2} from={desktop ? 'right' : 'up'}>
                    {desktop && (
                      <>
                        <Floating style={[styles.floatChip, { top: -26, left: -42 }]} delay={200}>
                          <CodeChip name="JavaScript" color={readableColor('#F0DB4F', c.dark)} c={c} />
                        </Floating>
                        <Floating style={[styles.floatChip, { bottom: -22, right: -36 }]} delay={900} distance={12}>
                          <CodeChip name="Python" color={readableColor('#3776AB', c.dark)} c={c} />
                        </Floating>
                      </>
                    )}
                    <View style={[phone && [styles.phoneCard, { backgroundColor: c.surface, borderColor: c.border }]]}>
                      <View style={styles.loginHeader}>
                        <Image source={require('@/assets/images/icon.png')} style={styles.loginLogo} contentFit="cover" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.loginTitle, { color: c.text }]}>Inicia sesión</Text>
                          <Text style={{ color: c.muted, fontSize: 14 }}>Tu cuenta decide si eres estudiante, profesor o superusuario</Text>
                        </View>
                      </View>
                      <LoginForm emailRef={emailRef} />
                    </View>
                  </Reveal>
                </View>
              </View>
            </RevealSection>

            {/* ---------- Carrusel de lenguajes y frameworks ---------- */}
            <RevealSection style={[styles.marqueeBand, { borderColor: c.border }]}>
              <Reveal>
                <Text style={[styles.marqueeTitle, { color: c.muted }]}>LOS LENGUAJES Y FRAMEWORKS QUE VAS A DOMINAR</Text>
                <Marquee speed={phone ? 30 : 45}>
                  {languages.map((language) => (
                    <MarqueeChip
                      key={language.id}
                      name={language.name}
                      detail={language.year ? String(language.year) : ''}
                      color={readableColor(language.color, c.dark)}
                      c={c}
                    />
                  ))}
                </Marquee>
                <View style={{ height: 12 }} />
                <Marquee speed={phone ? 24 : 35} reverse>
                  {frameworks.map((framework) => (
                    <MarqueeChip
                      key={framework.id}
                      name={framework.name ?? framework.id}
                      detail={languageName.get(framework.languageId) ?? ''}
                      color={readableColor(framework.color, c.dark)}
                      icon="layers-outline"
                      c={c}
                    />
                  ))}
                </Marquee>
              </Reveal>
            </RevealSection>

            {/* ---------- Lenguajes ---------- */}
            <RevealSection style={[container, { paddingTop: sectionSpace }]} onTop={(y) => registerTop('lenguajes', y)}>
              <SectionHeader label="Lenguajes" title="Explora el catálogo" subtitle="Cada lenguaje con su historia, sus creadores y para qué se usa hoy." c={c} phone={phone} />
              <Grid cols={languageCols} gap={phone ? 12 : 20}>
                {shownLanguages.map((language, i) => {
                  const color = readableColor(language.color, c.dark);
                  return (
                    <Reveal key={language.id} index={i % (languageCols * 2)} from="zoom" style={{ flex: 1 }}>
                      <HoverCard
                        onPress={focusLogin}
                        hoverBorderColor={color}
                        style={[styles.card, phone && styles.cardPhone, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={[styles.cardStripe, { backgroundColor: color }]} />
                        <View style={[styles.langBadge, phone && styles.langBadgePhone, { backgroundColor: `${color}22` }]}>
                          <Text style={[styles.langBadgeText, phone && { fontSize: 15 }, { color }]}>{initials(language.name)}</Text>
                        </View>
                        <Text style={[styles.cardTitle, phone && { fontSize: 17 }, { color: c.text }]} numberOfLines={1}>
                          {language.name}
                        </Text>
                        {language.year ? <Text style={[styles.cardMeta, { color }]}>Desde {language.year}</Text> : null}
                        <Text style={[styles.cardText, { color: c.muted }]} numberOfLines={phone ? 2 : 3}>
                          {language.tagline}
                        </Text>
                        {!phone && language.founders?.length ? (
                          <View style={styles.cardFooter}>
                            <Ionicons name="person-outline" size={14} color={c.muted} />
                            <Text style={[styles.cardFooterText, { color: c.muted }]} numberOfLines={1}>
                              {language.founders.join(', ')}
                            </Text>
                          </View>
                        ) : null}
                      </HoverCard>
                    </Reveal>
                  );
                })}
              </Grid>
              {languages.length > languageCols * 2 && (
                <ShowMore open={allLanguages} total={languages.length} noun="lenguajes" onPress={() => setAllLanguages((v) => !v)} c={c} />
              )}
            </RevealSection>

            {/* ---------- Código en vivo ---------- */}
            <RevealSection style={[container, { paddingTop: sectionSpace }]} onTop={(y) => registerTop('codigo', y)}>
              <View style={[styles.codeRow, !desktop && styles.heroColumn]}>
                <Reveal from={desktop ? 'left' : 'up'} style={desktop ? { flex: 0.9 } : undefined}>
                  <Text style={[styles.sectionLabel, { color: c.accent }]}>CÓDIGO EN VIVO</Text>
                  <Text style={[styles.sectionTitle, { color: c.text, fontSize: phone ? 30 : 44, lineHeight: phone ? 36 : 50 }]}>
                    Mira cómo se escribe cada lenguaje
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: c.muted, textAlign: 'left' }]}>
                    El mismo problema se resuelve distinto en cada lenguaje. Toca una pestaña para cambiar de ejemplo.
                  </Text>
                  <View style={{ gap: 14, marginTop: 8 }}>
                    {[
                      { icon: 'git-branch-outline' as IconName, text: 'Variables, condicionales y ciclos en cada lenguaje' },
                      { icon: 'play-circle-outline' as IconName, text: 'Practica escribiendo y ejecutando tu propio código' },
                      { icon: 'git-compare-outline' as IconName, text: 'Compara dos lenguajes lado a lado' },
                    ].map((item) => (
                      <View key={item.text} style={styles.bulletRow}>
                        <View style={[styles.bulletIcon, { backgroundColor: `${c.accent}1f` }]}>
                          <Ionicons name={item.icon} size={18} color={c.accent} />
                        </View>
                        <Text style={{ color: c.text, fontSize: 15, flex: 1 }}>{item.text}</Text>
                      </View>
                    ))}
                  </View>
                </Reveal>
                <Reveal index={1} from={desktop ? 'right' : 'up'} style={desktop ? { flex: 1.1 } : { width: '100%' }}>
                  <CodeTypewriter languages={languages} dark={c.dark} compact={phone} />
                </Reveal>
              </View>
            </RevealSection>

            {/* ---------- Frameworks ---------- */}
            <RevealSection style={[container, { paddingTop: sectionSpace }]} onTop={(y) => registerTop('frameworks', y)}>
              <SectionHeader label="Frameworks" title="Herramientas para construir más rápido" subtitle="Los frameworks más usados, agrupados por el lenguaje en el que se escriben." c={c} phone={phone} />
              <Grid cols={frameworkCols} gap={phone ? 12 : 20}>
                {shownFrameworks.map((framework, i) => {
                  const color = readableColor(framework.color, c.dark);
                  const name = framework.name ?? framework.id;
                  return (
                    <Reveal key={framework.id} index={i % 8} style={{ flex: 1 }}>
                      <HoverCard onPress={focusLogin} hoverBorderColor={color} style={[styles.card, phone && styles.cardPhone, { backgroundColor: c.surface, borderColor: c.border }]}>
                        <View style={styles.frameworkHead}>
                          <View style={[styles.langBadge, styles.langBadgePhone, { backgroundColor: `${color}22`, marginBottom: 0 }]}>
                            <Ionicons name="layers" size={20} color={color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: c.text, fontSize: 18 }]} numberOfLines={1}>
                              {name}
                            </Text>
                            {languageName.get(framework.languageId) ? (
                              <Text style={[styles.cardMeta, { color, marginBottom: 0 }]}>{languageName.get(framework.languageId)}</Text>
                            ) : null}
                          </View>
                        </View>
                        <Text style={[styles.cardText, { color: c.muted }]} numberOfLines={2}>
                          {framework.tagline || framework.description || 'Framework del catálogo.'}
                        </Text>
                        {(framework.year || framework.creator) && (
                          <View style={styles.cardFooter}>
                            <Ionicons name="calendar-outline" size={14} color={c.muted} />
                            <Text style={[styles.cardFooterText, { color: c.muted }]} numberOfLines={1}>
                              {[framework.year, framework.creator].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        )}
                      </HoverCard>
                    </Reveal>
                  );
                })}
              </Grid>
              {frameworks.length > shownFrameworks.length || allFrameworks ? (
                <ShowMore open={allFrameworks} total={frameworks.length} noun="frameworks" onPress={() => setAllFrameworks((v) => !v)} c={c} />
              ) : null}
            </RevealSection>

            {/* ---------- Cómo funciona ---------- */}
            <RevealSection style={[container, { paddingTop: sectionSpace }]} onTop={(y) => registerTop('como', y)}>
              <SectionHeader label="Cómo funciona" title="De cero a tu primer programa" subtitle="Cuatro pasos y ya estás aprendiendo." c={c} phone={phone} />
              <Grid cols={desktop ? 4 : phone ? 1 : 2} gap={phone ? 12 : 20}>
                {STEPS.map((step, i) => (
                  <Reveal key={step.title} index={i} style={{ flex: 1 }}>
                    <View style={[styles.card, phone && styles.stepPhone, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <View style={[styles.stepNumber, { backgroundColor: c.accent }]}>
                        <Text style={[styles.stepNumberText, { color: c.onAccent }]}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={styles.stepTitleRow}>
                          <Ionicons name={step.icon} size={18} color={c.accent} />
                          <Text style={[styles.cardTitle, { color: c.text, fontSize: 18, marginBottom: 0 }]}>{step.title}</Text>
                        </View>
                        <Text style={[styles.cardText, { color: c.muted }]}>{step.text}</Text>
                      </View>
                    </View>
                  </Reveal>
                ))}
              </Grid>

              <Reveal style={{ marginTop: phone ? 40 : 64 }}>
                <Text style={[styles.subheading, { color: c.text, fontSize: phone ? 22 : 28 }]}>Todo en un solo lugar</Text>
              </Reveal>
              <Grid cols={desktop ? 3 : phone ? 1 : 2} gap={phone ? 12 : 20}>
                {FEATURES.map((feature, i) => (
                  <Reveal key={feature.title} index={i} from="zoom" style={{ flex: 1 }}>
                    <HoverCard hoverBorderColor={c.accent} style={[styles.card, styles.featureCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                      <View style={[styles.featureIcon, { backgroundColor: `${c.accent}1f` }]}>
                        <Ionicons name={feature.icon} size={22} color={c.accent} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.cardTitle, { color: c.text, fontSize: 17, marginBottom: 0 }]}>{feature.title}</Text>
                        <Text style={[styles.cardText, { color: c.muted }]}>{feature.text}</Text>
                      </View>
                    </HoverCard>
                  </Reveal>
                ))}
              </Grid>
            </RevealSection>

            {/* ---------- Roles ---------- */}
            <RevealSection style={[container, { paddingTop: sectionSpace }]} onTop={(y) => registerTop('roles', y)}>
              <SectionHeader label="Roles" title="Una cuenta para cada quien" subtitle="Tu correo decide qué puedes hacer dentro de la app." c={c} phone={phone} />
              <Grid cols={desktop ? 3 : 1} gap={phone ? 20 : 24}>
                {ROLES.map((role, i) => {
                  const featured = role.featured;
                  const ink = featured ? '#ffffff' : c.text;
                  const soft = featured ? '#c9d6e8' : c.muted;
                  return (
                    <Reveal key={role.title} index={i} style={{ flex: 1 }}>
                      <HoverCard
                        hoverBorderColor={c.accent}
                        style={[
                          styles.card,
                          styles.roleCard,
                          { backgroundColor: featured ? '#0d1a2e' : c.surface, borderColor: featured ? c.accent : c.border },
                          featured && { boxShadow: `0 24px 60px -24px ${c.accent}` },
                        ]}>
                        {featured && (
                          <View style={[styles.roleBadge, { backgroundColor: c.accent }]}>
                            <Text style={[styles.roleBadgeText, { color: c.onAccent }]}>PARA DOCENTES</Text>
                          </View>
                        )}
                        <Text style={[styles.sectionLabel, { color: featured ? '#7cc0ff' : c.accent, marginBottom: 6 }]}>{role.label.toUpperCase()}</Text>
                        <Text style={[styles.roleTitle, { color: ink, fontSize: phone ? 30 : 36 }]}>
                          {role.title}
                          {!phone && <Text style={{ fontSize: 15, fontWeight: '600', color: soft, letterSpacing: 0 }}> / {role.note}</Text>}
                        </Text>
                        {phone && <Text style={{ fontSize: 14, fontWeight: '600', color: soft }}>{role.note}</Text>}
                        <Text style={[styles.cardText, { color: soft, marginTop: 8, minHeight: desktop ? 44 : undefined }]}>{role.text}</Text>
                        <View style={[styles.dashed, { borderColor: featured ? '#2b3d57' : c.border }]} />
                        <View style={{ gap: 12 }}>
                          {role.perks.map((perk) => (
                            <View key={perk} style={styles.bulletRow}>
                              <Ionicons name="checkmark" size={18} color={featured ? '#7cc0ff' : c.accent} />
                              <Text style={{ color: ink, fontSize: 15, flex: 1 }}>{perk}</Text>
                            </View>
                          ))}
                        </View>
                      </HoverCard>
                    </Reveal>
                  );
                })}
              </Grid>
              <Reveal style={{ alignItems: 'center', gap: 10, marginTop: 16 }}>
                <ActionButton label="Crear mi cuenta gratis" icon="person-add-outline" onPress={() => router.push('/registro')} c={c} large />
                <Text style={{ color: c.muted, fontSize: 14, textAlign: 'center' }}>Te registras como estudiante; el superusuario puede nombrarte profesor.</Text>
              </Reveal>
            </RevealSection>

            {/* ---------- Preguntas frecuentes ---------- */}
            <RevealSection style={[container, { paddingTop: sectionSpace }]} onTop={(y) => registerTop('faq', y)}>
              <SectionHeader label="Dudas" title="Preguntas frecuentes" c={c} phone={phone} />
              <Reveal style={[styles.faqBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                {faqs(languages.length).map((faq, i) => (
                  <FaqItem
                    key={faq.q}
                    question={faq.q}
                    answer={faq.a}
                    open={openFaq === i}
                    first={i === 0}
                    onPress={() => setOpenFaq((current) => (current === i ? null : i))}
                    c={c}
                  />
                ))}
              </Reveal>
            </RevealSection>

            {/* ---------- Llamado final y pie ---------- */}
            <RevealSection style={[container, { paddingTop: sectionSpace, paddingBottom: 32 }]}>
              <Reveal from="zoom" style={[styles.finalCta, phone && { padding: 28 }, { backgroundColor: c.dark ? '#10243d' : '#0b1726' }]}>
                <Floating style={styles.finalIcon} distance={8}>
                  <Ionicons name="code-slash" size={phone ? 34 : 44} color="#7cc0ff" />
                </Floating>
                <Text style={[styles.finalTitle, { fontSize: phone ? 26 : 38, lineHeight: phone ? 32 : 46 }]}>¿Listo para escribir tu primera línea de código?</Text>
                <Text style={styles.finalText}>Crea tu cuenta en segundos y empieza con el lenguaje que más te guste.</Text>
                <View style={[styles.ctaRow, { justifyContent: 'center' }]}>
                  <ActionButton label="Crear cuenta" icon="person-add-outline" onPress={() => router.push('/registro')} c={{ ...c, accent: '#4ea1ff', onAccent: '#0b1220' }} grow={phone} />
                  <ActionButton label="Ya tengo cuenta" icon="log-in-outline" variant="outline" onPress={focusLogin} c={{ ...c, text: '#ffffff', border: '#ffffff44' }} grow={phone} />
                </View>
              </Reveal>

              <View style={[styles.footer, phone && { flexDirection: 'column', alignItems: 'flex-start' }, { borderColor: c.border }]}>
                <View style={styles.brand}>
                  <Image source={require('@/assets/images/icon.png')} style={styles.brandLogo} contentFit="cover" />
                  <Text style={[styles.brandText, { color: c.text }]}>Catálogo de Lenguajes</Text>
                </View>
                <View style={styles.footerLinks}>
                  {SECTIONS.map((section) => (
                    <Pressable key={section.key} onPress={() => goTo(section.key)} hitSlop={6}>
                      <Text style={{ color: c.muted, fontSize: 14 }}>{section.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: c.muted, fontSize: 13 }}>© {new Date().getFullYear()} · Hecho para aprender</Text>
              </View>
            </RevealSection>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </ScrollProvider>

      {/* ---------- Navbar fija ---------- */}
      <View pointerEvents="box-none" style={[styles.navWrap, { top: insets.top + (phone ? 8 : 14), paddingHorizontal: phone ? 10 : gutter }]}>
        <View style={[styles.nav, phone && styles.navPhone, { borderColor: c.border }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.navBg, { backgroundColor: c.surface }, navBackground]} />
          <Pressable style={styles.brand} onPress={() => scrollTo(0)}>
            <Image source={require('@/assets/images/icon.png')} style={styles.brandLogo} contentFit="cover" />
            <Text style={[styles.brandText, { color: c.text }]} numberOfLines={1}>
              {width < 440 ? 'Catálogo' : 'Catálogo de Lenguajes'}
            </Text>
          </Pressable>
          {desktop && (
            <View style={styles.navLinks}>
              {SECTIONS.map((section, i) => (
                <NavLink key={section.key} label={section.label} active={active === i} onPress={() => goTo(section.key)} c={c} />
              ))}
            </View>
          )}
          <View style={styles.navActions}>
            {!phone && <ActionButton label="Registrarse" icon="person-add-outline" variant="outline" small onPress={() => router.push('/registro')} c={c} />}
            <ActionButton label="Entrar" icon="log-in-outline" small onPress={focusLogin} c={c} />
            {!desktop && (
              <Pressable
                onPress={() => setMenuOpen((v) => !v)}
                hitSlop={8}
                accessibilityLabel={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                style={[styles.menuButton, { borderColor: c.border }]}>
                <Ionicons name={menuOpen ? 'close' : 'menu'} size={22} color={c.text} />
              </Pressable>
            )}
          </View>
          <Animated.View style={[styles.progress, { backgroundColor: c.accent }, progressStyle]} />
        </View>

        {menuOpen && !desktop && (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(160)} style={[styles.menu, { backgroundColor: c.surface, borderColor: c.border }]}>
            {SECTIONS.map((section, i) => (
              <Pressable key={section.key} onPress={() => goTo(section.key)} style={[styles.menuItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}>
                <Text style={{ color: active === i ? c.accent : c.text, fontSize: 16, fontWeight: '600' }}>{section.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={c.muted} />
              </Pressable>
            ))}
            {phone && (
              <View style={{ padding: 12 }}>
                <ActionButton label="Crear cuenta" icon="person-add-outline" variant="outline" onPress={() => router.push('/registro')} c={c} grow />
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {showTop && (
        <Animated.View entering={ZoomIn} exiting={ZoomOut} style={[styles.toTop, { bottom: insets.bottom + 20, right: phone ? 16 : 28 }]}>
          <Pressable onPress={() => scrollTo(0)} accessibilityLabel="Volver arriba" style={[styles.toTopButton, { backgroundColor: c.accent }]}>
            <Ionicons name="arrow-up" size={22} color={c.onAccent} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function faqs(languageCount: number) {
  return [
    { q: '¿Cómo me registro?', a: 'Toca "Crear cuenta", escribe tu nombre, correo y una contraseña de al menos 8 caracteres. Entras al instante.' },
    { q: '¿Tiene algún costo?', a: 'No. La app es gratuita para estudiantes y profesores.' },
    { q: '¿Qué lenguajes puedo aprender?', a: `Hoy hay ${languageCount} lenguajes en el catálogo, desde JavaScript y Python hasta Rust y Elixir. El superusuario puede agregar más en cualquier momento.` },
    { q: '¿Cómo me convierto en profesor?', a: 'Te registras como estudiante y el superusuario te nombra profesor desde Admin → Usuarios.' },
    { q: '¿Puedo usarla desde el celular?', a: 'Sí. Funciona en la web y en el celular con la misma cuenta, y tu progreso se guarda en la nube.' },
    { q: '¿Qué hace el asistente con IA?', a: 'Responde tus dudas de programación, explica código y te ayuda cuando te atoras en un reto.' },
  ];
}

function initials(name: string | undefined) {
  if (!name) return '?';
  const clean = name.replace(/[^A-Za-z0-9#+]/g, '');
  return clean.length <= 2 ? clean : clean.slice(0, 2);
}

// ---------- Piezas pequeñas ----------

function Grid({ cols, gap, children }: { cols: number; gap: number; children: ReactNode[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {children.map((child, i) => (
        <View key={i} style={{ width: `${100 / cols}%`, paddingHorizontal: gap / 2, marginBottom: gap }}>
          {child}
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ label, title, subtitle, c, phone }: { label: string; title: string; subtitle?: string; c: LandingColors; phone: boolean }) {
  return (
    <Reveal style={{ alignItems: 'center', marginBottom: phone ? 28 : 44 }}>
      <Text style={[styles.sectionLabel, { color: c.accent }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.sectionTitle, { color: c.text, textAlign: 'center', fontSize: phone ? 30 : 44, lineHeight: phone ? 36 : 50 }]}>{title}</Text>
      {subtitle && <Text style={[styles.sectionSubtitle, { color: c.muted }]}>{subtitle}</Text>}
    </Reveal>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  c,
  variant = 'solid',
  small,
  large,
  grow,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  c: LandingColors;
  variant?: 'solid' | 'outline';
  small?: boolean;
  large?: boolean;
  grow?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const solid = variant === 'solid';
  const color = solid ? c.onAccent : c.text;
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        large && styles.buttonLarge,
        grow && { flexGrow: 1 },
        solid ? { backgroundColor: c.accent } : { borderWidth: 1, borderColor: c.border },
        solid && !small && { boxShadow: `0 12px 30px -12px ${c.accent}` },
        hovered && { transform: [{ translateY: -2 }], opacity: 0.92 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
      ]}>
      <Ionicons name={icon} size={small ? 16 : 18} color={color} />
      <Text style={[styles.buttonText, small && { fontSize: 14 }, large && { fontSize: 18 }, { color }]}>{label}</Text>
    </Pressable>
  );
}

function NavLink({ label, active, onPress, c }: { label: string; active: boolean; onPress: () => void; c: LandingColors }) {
  const [hovered, setHovered] = useState(false);
  const line = useSharedValue(0);
  useEffect(() => {
    line.value = withTiming(active || hovered ? 1 : 0, { duration: 200 });
  }, [active, hovered, line]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: line.value }], opacity: line.value }));
  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={styles.navLink}>
      <Text style={{ color: active ? c.accent : c.text, fontSize: 15, fontWeight: active ? '700' : '500', opacity: active || hovered ? 1 : 0.8 }}>{label}</Text>
      <Animated.View style={[styles.navUnderline, { backgroundColor: c.accent }, lineStyle]} />
    </Pressable>
  );
}

// Palabra que cambia cada par de segundos, con el color de cada lenguaje.
function RotatingWord({ words, size, lineHeight, center }: { words: { text: string; color: string }[]; size: number; lineHeight: number; center: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), 2200);
    return () => clearInterval(timer);
  }, [words.length]);
  const word = words[index % Math.max(1, words.length)];
  if (!word) return null;
  return (
    <View style={{ height: lineHeight, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.Text
        key={word.text}
        entering={FadeInDown.duration(380)}
        style={[styles.heroTitle, { position: 'absolute', left: 0, right: 0, fontSize: size, lineHeight, color: word.color }, center && { textAlign: 'center' }]}>
        {word.text}
        <Text style={{ color: word.color, opacity: 0.6 }}>_</Text>
      </Animated.Text>
    </View>
  );
}

// Número que cuenta desde cero la primera vez que se ve.
function Stat({ value, label, c }: { value: number; label: string; c: LandingColors }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 1200);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: c.text }]}>{shown}+</Text>
      <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

function CodeChip({ name, color, c }: { name: string; color: string; c: LandingColors }) {
  return (
    <View style={[styles.codeChip, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Ionicons name="code-slash" size={16} color={color} />
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{name}</Text>
    </View>
  );
}

function MarqueeChip({ name, detail, color, icon, c }: { name: string; detail: string; color: string; icon?: IconName; c: LandingColors }) {
  return (
    <View style={[styles.marqueeChip, { backgroundColor: c.surface, borderColor: c.border }]}>
      {icon ? <Ionicons name={icon} size={16} color={color} /> : <View style={[styles.marqueeDot, { backgroundColor: color }]} />}
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{name}</Text>
      {detail ? <Text style={{ color: c.muted, fontSize: 13 }}>{detail}</Text> : null}
    </View>
  );
}

function ShowMore({ open, total, noun, onPress, c }: { open: boolean; total: number; noun: string; onPress: () => void; c: LandingColors }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 8 }}>
      <ActionButton label={open ? 'Ver menos' : `Ver los ${total} ${noun}`} icon={open ? 'chevron-up' : 'chevron-down'} variant="outline" onPress={onPress} c={c} />
    </View>
  );
}

function FaqItem({ question, answer, open, first, onPress, c }: { question: string; answer: string; open: boolean; first: boolean; onPress: () => void; c: LandingColors }) {
  const rotation = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    rotation.value = withTiming(open ? 1 : 0, { duration: 250 });
  }, [open, rotation]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value * 180}deg` }] }));
  return (
    <Animated.View layout={LinearTransition.duration(250)} style={[!first && { borderTopWidth: 1, borderColor: c.border }]}>
      <Pressable onPress={onPress} style={styles.faqQuestion} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={[styles.faqQuestionText, { color: open ? c.accent : c.text }]}>{question}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={22} color={open ? c.accent : c.muted} />
        </Animated.View>
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.faqAnswer}>
          <Text style={{ color: c.muted, fontSize: 15, lineHeight: 23 }}>{answer}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// Manchas de color difuminadas detrás de la portada.
function HeroGlow({ colors, phone }: { colors: string[]; phone: boolean }) {
  const spots = [
    { top: 40, left: '-6%', size: phone ? 220 : 380 },
    { top: 260, left: '40%', size: phone ? 180 : 300 },
    { top: 0, left: '70%', size: phone ? 200 : 360 },
  ] as const;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {spots.map((spot, i) => (
        <Floating key={i} distance={24} duration={4200 + i * 900} delay={i * 600} style={{ position: 'absolute', top: spot.top, left: spot.left }}>
          <View
            style={{
              width: spot.size,
              height: spot.size,
              borderRadius: spot.size / 2,
              backgroundColor: colors[i % Math.max(1, colors.length)] ?? '#4ea1ff',
              opacity: Platform.OS === 'web' ? 0.16 : 0.08,
              filter: Platform.OS === 'web' ? 'blur(70px)' : undefined,
            }}
          />
        </Floating>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 56,
  },
  heroColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 40,
  },
  heroText: {
    flex: 1,
    gap: 22,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  heroSubtitle: {
    lineHeight: 28,
    maxWidth: 560,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 6,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  loginColumn: {
    width: 440,
  },
  phoneCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  loginHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  loginLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  floatChip: {
    position: 'absolute',
    zIndex: 2,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    boxShadow: '0 12px 30px -12px rgba(0, 0, 0, 0.45)',
  },
  marqueeBand: {
    paddingVertical: 28,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  marqueeTitle: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  marqueeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 12,
  },
  marqueeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  sectionSubtitle: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 620,
  },
  subheading: {
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  cardPhone: {
    padding: 16,
    borderRadius: 16,
  },
  cardStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  langBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  langBadgePhone: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginBottom: 12,
  },
  langBadgeText: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 14,
  },
  cardFooterText: {
    fontSize: 13,
    flex: 1,
  },
  frameworkHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 56,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPhone: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stepNumberText: {
    fontSize: 17,
    fontWeight: '800',
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCard: {
    padding: 28,
    overflow: 'visible',
  },
  roleBadge: {
    position: 'absolute',
    top: -13,
    right: 24,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  roleTitle: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  dashed: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 20,
  },
  faqBox: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  faqAnswer: {
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  finalCta: {
    borderRadius: 28,
    padding: 56,
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  finalIcon: {
    marginBottom: 4,
  },
  finalTitle: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    maxWidth: 720,
  },
  finalText: {
    color: '#c9d6e8',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 18,
    marginTop: 48,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 9,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  navWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  nav: {
    width: '100%',
    maxWidth: 1240,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  navPhone: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  navBg: {
    boxShadow: '0 10px 40px -12px rgba(0, 0, 0, 0.35)',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  navUnderline: {
    position: 'absolute',
    bottom: 2,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 1,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
  },
  menu: {
    width: '100%',
    maxWidth: 1240,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 20px 50px -20px rgba(0, 0, 0, 0.5)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 22,
    minHeight: 52,
  },
  buttonSmall: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  buttonLarge: {
    minHeight: 60,
    paddingHorizontal: 30,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  toTop: {
    position: 'absolute',
  },
  toTopButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 30px -10px rgba(0, 0, 0, 0.5)',
  },
});
