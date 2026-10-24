import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentSection, UsersSection } from '@/components/admin-sections';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchAdminReport, subscribeToQuizActivity, type AdminReport } from '@/services/admin';

const SERIES = {
  light: { quiz: '#0a7ea4', ia: '#d9822b' },
  dark: { quiz: '#5cc3e6', ia: '#f0a35e' },
};

const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

const formatNumber = (value: number) => value.toLocaleString('es-GT');

// Panel del superusuario: reportes de toda la app desde la función reporte_admin de Supabase.
// Se actualiza solo cuando alguien termina un quiz o cuando cambia el catálogo.
export default function AdminScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const series = SERIES[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const router = useRouter();
  const { contentMaxWidth } = useResponsive();
  const { isAdmin, user } = useAuth();
  const { languages, getLanguageById } = useCatalog();

  const [report, setReport] = useState<AdminReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);
  const [section, setSection] = useState<'resumen' | 'usuarios' | 'contenido'>('resumen');

  const load = useCallback(() => setVersion((v) => v + 1), []);
  const stopRefreshing = useCallback(() => setRefreshing(false), []);

  // languages.length: al agregarse un lenguaje (también desde otro dispositivo) se recalcula el reporte.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    fetchAdminReport()
      .then((data) => {
        if (!active) return;
        setReport(data);
        setError(null);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudo cargar el reporte'))
      .finally(() => active && setRefreshing(false));
    return () => {
      active = false;
    };
  }, [isAdmin, version, languages.length]);

  useEffect(() => {
    if (!isAdmin) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToQuizActivity(() => {
      clearTimeout(timeout);
      timeout = setTimeout(load, 800);
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [isAdmin, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const go = (path: '/agregar-lenguaje' | '/api') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    router.push(path);
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}>
        <Ionicons name="lock-closed-outline" size={36} color={palette.icon} />
        <ThemedText type="subtitle">Solo para administradores</ThemedText>
      </SafeAreaView>
    );
  }

  const maxActivity = Math.max(1, ...(report?.actividad ?? []).map((d) => Math.max(d.quiz, d.ia)));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />}
        contentContainerStyle={[
          styles.content,
          contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined,
        ]}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText style={styles.eyebrow}>SUPERUSUARIO</ThemedText>
            <ThemedText type="title" style={{ fontSize: 28, lineHeight: 32 }}>
              Panel
            </ThemedText>
            <ThemedText style={styles.muted} numberOfLines={1}>
              {user?.email}
            </ThemedText>
          </View>
          <View style={[styles.live, { borderColor: '#2e9e5b66', backgroundColor: '#2e9e5b1A' }]}>
            <View style={styles.liveDot} />
            <ThemedText style={{ color: '#2e9e5b', fontSize: 12, fontWeight: '600' }}>En vivo</ThemedText>
          </View>
        </View>

        <View style={[styles.segment, { backgroundColor: colorScheme === 'dark' ? '#1d2022' : '#f1f3f5' }]}>
          {(['resumen', 'usuarios', 'contenido'] as const).map((option) => {
            const selected = section === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setSection(option);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.segmentItem, selected && { backgroundColor: palette.background }]}>
                <ThemedText
                  type={selected ? 'defaultSemiBold' : 'default'}
                  style={{ fontSize: 14, color: selected ? palette.tint : palette.icon }}>
                  {option === 'resumen' ? 'Resumen' : option === 'usuarios' ? 'Usuarios' : 'Contenido'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {section === 'usuarios' ? (
          <UsersSection version={version} onLoaded={stopRefreshing} />
        ) : section === 'contenido' ? (
          <ContentSection version={version} onLoaded={stopRefreshing} />
        ) : (
          <>
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => go('/agregar-lenguaje')}
                style={({ pressed }) => [styles.primary, { backgroundColor: palette.tint }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add-circle-outline" size={20} color={palette.background} />
                <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
                  Agregar lenguaje
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => go('/api')}
                style={({ pressed }) => [styles.secondary, { borderColor: border }, pressed && { opacity: 0.6 }]}>
                <Ionicons name="bar-chart-outline" size={18} color={palette.tint} />
                <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 14 }}>
                  Reportes API
                </ThemedText>
              </Pressable>
            </View>

            {error && (
              <ThemedView style={[styles.card, { borderColor: '#d9534f66' }]}>
                <ThemedText style={{ color: '#d9534f' }}>{error}</ThemedText>
                <Pressable onPress={load}>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                    Reintentar
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}

            {!report && !error ? (
              <ActivityIndicator style={{ marginTop: 32 }} color={palette.tint} />
            ) : report ? (
              <>
                <View style={styles.kpis}>
                  <Kpi
                    icon="people-outline"
                    label="Usuarios registrados"
                    value={formatNumber(report.usuarios)}
                    hint={`${formatNumber(report.profesores ?? 0)} profesores · ${formatNumber(report.sin_confirmar ?? 0)} sin confirmar`}
                    border={border}
                  />
                  <Kpi
                    icon="pulse-outline"
                    label="Activos 7 días"
                    value={formatNumber(report.activos_7_dias)}
                    hint={`${formatNumber(report.clases ?? 0)} clases`}
                    border={border}
                  />
                  <Kpi
                    icon="help-circle-outline"
                    label="Quizzes hechos"
                    value={formatNumber(report.intentos_quiz)}
                    hint={`${report.promedio_quiz}% de aciertos`}
                    border={border}
                  />
                  <Kpi icon="trophy-outline" label="Retos resueltos" value={formatNumber(report.retos_resueltos ?? 0)} border={border} />
                  <Kpi
                    icon="sparkles-outline"
                    label="Mensajes a la IA"
                    value={formatNumber(report.mensajes_ia)}
                    hint={`${formatNumber(report.mensajes_ia_hoy)} hoy · ${formatNumber(report.tokens_ia)} tokens`}
                    border={border}
                  />
                  <Kpi
                    icon="code-slash-outline"
                    label="Lenguajes"
                    value={formatNumber(report.lenguajes)}
                    hint={`${formatNumber(report.frameworks)} frameworks · ${formatNumber(report.favoritos)} favoritos`}
                    border={border}
                  />
                </View>

                <ThemedView style={[styles.card, { borderColor: border }]}>
                  <ThemedText type="defaultSemiBold">Actividad de los últimos 7 días</ThemedText>
                  <View style={styles.legend}>
                    <LegendItem color={series.quiz} label="Quizzes" />
                    <LegendItem color={series.ia} label="Mensajes IA" />
                  </View>
                  <View style={styles.chart}>
                    {report.actividad.map((day) => (
                      <View key={day.dia} style={styles.chartDay}>
                        <View style={styles.chartBars}>
                          <View style={[styles.bar, { height: `${(day.quiz / maxActivity) * 100}%`, backgroundColor: series.quiz }]} />
                          <View style={[styles.bar, { height: `${(day.ia / maxActivity) * 100}%`, backgroundColor: series.ia }]} />
                        </View>
                        <ThemedText style={styles.chartLabel}>{WEEKDAYS[new Date(`${day.dia}T12:00:00`).getDay()]}</ThemedText>
                      </View>
                    ))}
                  </View>
                </ThemedView>

                <ThemedView style={[styles.card, { borderColor: border }]}>
                  <ThemedText type="defaultSemiBold">Quizzes por lenguaje</ThemedText>
                  {report.por_lenguaje.length === 0 ? (
                    <ThemedText style={styles.muted}>Todavía nadie ha hecho un quiz.</ThemedText>
                  ) : (
                    report.por_lenguaje.map((row) => (
                      <View key={row.id} style={styles.langRow}>
                        <View style={[styles.dot, { backgroundColor: row.color }]} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <View style={styles.rowBetween}>
                            <ThemedText style={{ fontSize: 14 }} numberOfLines={1}>
                              {row.nombre}
                            </ThemedText>
                            <ThemedText style={[styles.muted, styles.num]}>
                              {row.intentos} · {row.promedio}%
                            </ThemedText>
                          </View>
                          <View style={[styles.track, { backgroundColor: border }]}>
                            <View style={[styles.fill, { width: `${row.promedio}%`, backgroundColor: row.color }]} />
                          </View>
                        </View>
                      </View>
                    ))
                  )}
                </ThemedView>

                <ThemedView style={[styles.card, { borderColor: border }]}>
                  <ThemedText type="defaultSemiBold">Últimos quizzes</ThemedText>
                  {report.ultimos_intentos.length === 0 ? (
                    <ThemedText style={styles.muted}>Sin actividad todavía.</ThemedText>
                  ) : (
                    report.ultimos_intentos.map((item, index) => {
                      const ratio = item.puntaje / item.total;
                      return (
                        <View
                          key={`${item.fecha}-${index}`}
                          style={[styles.attemptRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }]}>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontSize: 14 }} numberOfLines={1}>
                              {item.usuario}
                            </ThemedText>
                            <ThemedText style={[styles.muted, { fontSize: 12 }]}>
                              {getLanguageById(item.lenguaje)?.name ?? item.lenguaje} · {timeAgo(item.fecha)}
                            </ThemedText>
                          </View>
                          <ThemedText
                            type="defaultSemiBold"
                            style={[styles.num, { color: ratio >= 0.6 ? '#2e9e5b' : ratio >= 0.4 ? '#e0a100' : '#d9534f' }]}>
                            {item.puntaje}/{item.total}
                          </ThemedText>
                        </View>
                      );
                    })
                  )}
                </ThemedView>
                <ThemedText style={[styles.muted, { fontSize: 12, textAlign: 'center' }]}>Desliza hacia abajo para actualizar</ThemedText>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  border,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  border: string;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  return (
    <ThemedView style={[styles.kpi, { borderColor: border }]}>
      <View style={styles.kpiLabel}>
        <Ionicons name={icon} size={14} color={Colors[colorScheme].icon} />
        <ThemedText style={[styles.muted, { fontSize: 12 }]} numberOfLines={1}>
          {label}
        </ThemedText>
      </View>
      <ThemedText type="subtitle" style={styles.num}>
        {value}
      </ThemedText>
      {hint && (
        <ThemedText style={[styles.muted, { fontSize: 12 }]} numberOfLines={1}>
          {hint}
        </ThemedText>
      )}
    </ThemedView>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <ThemedText style={{ fontSize: 12, opacity: 0.8 }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
    opacity: 0.6,
  },
  muted: {
    opacity: 0.65,
  },
  num: {
    fontVariant: ['tabular-nums'],
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2e9e5b',
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 9,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpis: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpi: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  kpiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  chart: {
    flexDirection: 'row',
    height: 120,
    gap: 6,
  },
  chartDay: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 9,
    minHeight: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chartLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
});
