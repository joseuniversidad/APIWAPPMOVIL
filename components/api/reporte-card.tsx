import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatQuetzales, getReporteMovimientos, type ReporteMes } from '@/services/companero-api';

const INCOME = '#2e9e5b';
const EXPENSE = '#d9534f';
const NET = '#1F4E79';
const CHART_HEIGHT = 160;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: (number | undefined)[] = [undefined, CURRENT_YEAR, CURRENT_YEAR - 1];

export function ReporteCard() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { authFetch } = useAuth();
  const [anio, setAnio] = useState<number | undefined>(undefined);
  const [state, setState] = useState<{ anio?: number; data?: ReporteMes[]; error?: string } | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    let active = true;
    getReporteMovimientos(authFetch, anio)
      .then((data) => active && setState({ anio, data }))
      .catch((e) => active && setState({ anio, error: e instanceof Error ? e.message : 'Error al cargar el reporte' }));
    return () => {
      active = false;
    };
  }, [authFetch, anio]);

  const loading = !state || state.anio !== anio;
  // La API devuelve del mes más reciente al más antiguo; la gráfica se lee de izquierda (antiguo) a derecha (reciente).
  const months = [...(state?.data ?? [])].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const totals = months.reduce(
    (acc, m) => ({
      ingresos: acc.ingresos + m.total_ingresos,
      gastos: acc.gastos + m.total_gastos,
      saldo: acc.saldo + m.saldo_neto,
      movimientos: acc.movimientos + m.cantidad_movimientos,
    }),
    { ingresos: 0, gastos: 0, saldo: 0, movimientos: 0 }
  );
  const bestMonth = months.reduce<ReporteMes | null>((a, m) => (!a || m.saldo_neto > a.saldo_neto ? m : a), null);
  const worstMonth = months.reduce<ReporteMes | null>((a, m) => (!a || m.saldo_neto < a.saldo_neto ? m : a), null);
  const max = Math.max(1, ...months.flatMap((m) => [m.total_ingresos, m.total_gastos]));
  const gridColor = `${palette.icon}33`;

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle">Movimiento de caja por mes</ThemedText>

      <View style={styles.chips}>
        {YEAR_OPTIONS.map((option) => {
          const selected = option === anio;
          return (
            <Pressable
              key={option ?? 'todos'}
              onPress={() => setAnio(option)}
              style={[
                styles.chip,
                { borderColor: selected ? palette.tint : `${palette.icon}55` },
                selected && { backgroundColor: `${palette.tint}1A` },
              ]}>
              <ThemedText style={selected ? { color: palette.tint, fontWeight: '600' } : undefined}>
                {option ?? 'Todos'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {loading && <ActivityIndicator color={palette.tint} />}
      {!loading && state?.error && <ThemedText style={{ color: EXPENSE }}>{state.error}</ThemedText>}
      {!loading && !state?.error && months.length === 0 && (
        <ThemedText style={styles.muted}>No hay movimientos para este período</ThemedText>
      )}

      {!loading && months.length > 0 && (
        <>
          {/* Tarjetas de resumen */}
          <View style={styles.summaryGrid}>
            <SummaryTile icon="arrow-down-circle" label="Ingresos" value={formatQuetzales(totals.ingresos)} color={INCOME} />
            <SummaryTile icon="arrow-up-circle" label="Gastos" value={formatQuetzales(totals.gastos)} color={EXPENSE} />
            <SummaryTile icon="wallet" label="Saldo neto" value={formatQuetzales(totals.saldo)} color={totals.saldo >= 0 ? NET : EXPENSE} />
            <SummaryTile icon="swap-vertical" label="Movimientos" value={String(totals.movimientos)} color={palette.icon} />
          </View>

          {/* Gráfica de barras agrupadas: ingresos vs gastos por mes */}
          <View style={styles.legend}>
            <LegendDot color={INCOME} label="Ingresos" />
            <LegendDot color={EXPENSE} label="Gastos" />
          </View>
          <View style={styles.chartRow}>
            <View style={[styles.axis, { height: CHART_HEIGHT }]}>
              {[1, 0.5, 0].map((f) => (
                <ThemedText key={f} style={styles.axisLabel}>
                  {compact(max * f)}
                </ThemedText>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <View style={[styles.chart, { height: CHART_HEIGHT, borderColor: gridColor }]}>
                <View style={[styles.gridLine, { top: CHART_HEIGHT / 2, backgroundColor: gridColor }]} />
                {months.map((m) => (
                  <View key={m.periodo} style={styles.group} accessibilityLabel={`${formatPeriodo(m.periodo)}: ingresos ${formatQuetzales(m.total_ingresos)}, gastos ${formatQuetzales(m.total_gastos)}`}>
                    <View style={[styles.bar, { height: (m.total_ingresos / max) * CHART_HEIGHT, backgroundColor: INCOME }]} />
                    <View style={[styles.bar, { height: (m.total_gastos / max) * CHART_HEIGHT, backgroundColor: EXPENSE }]} />
                  </View>
                ))}
              </View>
              <View style={styles.monthLabels}>
                {months.map((m) => (
                  <ThemedText key={m.periodo} style={styles.monthLabel} numberOfLines={1}>
                    {shortMonth(m.periodo)}
                  </ThemedText>
                ))}
              </View>
            </View>
          </View>

          {/* Mejor y peor mes */}
          {bestMonth && worstMonth && months.length > 1 && (
            <View style={styles.highlights}>
              <Highlight icon="trending-up" color={INCOME} title="Mejor mes" month={bestMonth} />
              <Highlight icon="trending-down" color={EXPENSE} title="Mes más bajo" month={worstMonth} />
            </View>
          )}

          <Pressable onPress={() => setShowDetail((v) => !v)} style={styles.detailToggle}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {showDetail ? 'Ocultar detalle por mes' : 'Ver detalle por mes'}
            </ThemedText>
            <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={16} color={palette.tint} />
          </Pressable>

          {showDetail &&
            [...months].reverse().map((mes) => (
              <View key={mes.periodo} style={[styles.month, { borderColor: gridColor }]}>
                <View style={styles.rowBetween}>
                  <ThemedText type="defaultSemiBold">{formatPeriodo(mes.periodo)}</ThemedText>
                  <ThemedText style={[styles.muted, { fontSize: 13 }]}>{mes.cantidad_movimientos} movimientos</ThemedText>
                </View>
                <View style={styles.rowBetween}>
                  <ThemedText style={{ fontSize: 14, color: INCOME }}>+ {formatQuetzales(mes.total_ingresos)}</ThemedText>
                  <ThemedText style={{ fontSize: 14, color: EXPENSE }}>− {formatQuetzales(mes.total_gastos)}</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ fontSize: 14, color: mes.saldo_neto >= 0 ? NET : EXPENSE }}>
                    = {formatQuetzales(mes.saldo_neto)}
                  </ThemedText>
                </View>
              </View>
            ))}
        </>
      )}
    </ThemedView>
  );
}

function SummaryTile({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={[styles.tile, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
      <View style={styles.tileHeader}>
        <Ionicons name={icon} size={16} color={color} />
        <ThemedText style={[styles.muted, { fontSize: 13 }]}>{label}</ThemedText>
      </View>
      <ThemedText type="defaultSemiBold" style={{ color, fontSize: 15 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
    </View>
  );
}

function Highlight({ icon, color, title, month }: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; month: ReporteMes }) {
  return (
    <View style={[styles.highlight, { borderColor: `${color}55` }]}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.muted, { fontSize: 13 }]}>{title}</ThemedText>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>
          {formatPeriodo(month.periodo)}
        </ThemedText>
        <ThemedText style={{ fontSize: 13, color }}>Saldo {formatQuetzales(month.saldo_neto)}</ThemedText>
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText style={{ fontSize: 13 }}>{label}</ThemedText>
    </View>
  );
}

function formatPeriodo(periodo: string) {
  const [year, month] = periodo.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortMonth(periodo: string) {
  const [year, month] = periodo.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function compact(value: number) {
  if (value >= 1000) return `Q${Math.round(value / 1000)}k`;
  return `Q${Math.round(value)}`;
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  muted: {
    opacity: 0.7,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chartRow: {
    flexDirection: 'row',
    gap: 6,
  },
  axis: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 44,
  },
  axisLabel: {
    fontSize: 11,
    lineHeight: 13,
    opacity: 0.6,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  bar: {
    width: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  monthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  monthLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlight: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  detailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  month: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});
