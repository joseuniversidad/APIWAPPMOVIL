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
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: (number | undefined)[] = [undefined, CURRENT_YEAR, CURRENT_YEAR - 1];

export function ReporteCard() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { authFetch } = useAuth();
  const [anio, setAnio] = useState<number | undefined>(undefined);
  const [state, setState] = useState<{ anio?: number; data?: ReporteMes[]; error?: string } | null>(null);

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
  const data = state?.data ?? [];
  const max = Math.max(1, ...data.flatMap((mes) => [mes.total_ingresos, mes.total_gastos]));

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
      {!loading && !state?.error && data.length === 0 && (
        <ThemedText style={styles.muted}>No hay movimientos para este período</ThemedText>
      )}

      {!loading &&
        data.map((mes) => (
          <View key={mes.periodo} style={[styles.month, { borderColor: `${palette.icon}33` }]}>
            <View style={styles.rowBetween}>
              <ThemedText type="defaultSemiBold">{formatPeriodo(mes.periodo)}</ThemedText>
              <ThemedText style={[styles.muted, { fontSize: 13 }]}>{mes.cantidad_movimientos} movimientos</ThemedText>
            </View>
            <Bar label="Ingresos" value={mes.total_ingresos} max={max} color={INCOME} />
            <Bar label="Gastos" value={mes.total_gastos} max={max} color={EXPENSE} />
            <View style={styles.rowBetween}>
              <ThemedText style={styles.muted}>Saldo neto</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: mes.saldo_neto >= 0 ? INCOME : EXPENSE }}>
                {formatQuetzales(mes.saldo_neto)}
              </ThemedText>
            </View>
          </View>
        ))}
    </ThemedView>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={styles.rowBetween}>
        <ThemedText style={{ fontSize: 14 }}>{label}</ThemedText>
        <ThemedText style={{ fontSize: 14, color }}>{formatQuetzales(value)}</ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: `${color}22` }]}>
        <View style={[styles.fill, { width: `${(value / max) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function formatPeriodo(periodo: string) {
  const [year, month] = periodo.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
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
  month: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
