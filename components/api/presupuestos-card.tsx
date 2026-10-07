import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ApiError } from '@/services/api';
import {
  createPresupuesto,
  deletePresupuesto,
  ESTADO_COLORS,
  ESTADO_LABELS,
  ESTADOS_PRESUPUESTO,
  formatQuetzales,
  listPresupuestos,
  updatePresupuesto,
  type EstadoPresupuesto,
  type PresupuestoCapacitacion,
} from '@/services/companero-api';

const DANGER = '#d9534f';

export function PresupuestosCard() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { authFetch } = useAuth();
  const [items, setItems] = useState<PresupuestoCapacitacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    listPresupuestos(authFetch)
      .then((data) => active && setItems(data))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Error al cargar los presupuestos'));
    return () => {
      active = false;
    };
  }, [authFetch]);

  const changeEstado = async (item: PresupuestoCapacitacion, estado: EstadoPresupuesto) => {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updatePresupuesto(authFetch, item, { estado });
      setItems((prev) => prev?.map((p) => (p.id === item.id ? { ...p, ...updated } : p)) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: PresupuestoCapacitacion) => {
    const confirmed = await confirmDialog(`¿Eliminar "${item.nombre}"?`);
    if (!confirmed) return;
    setBusyId(item.id);
    setError(null);
    try {
      await deletePresupuesto(authFetch, item.id);
      setItems((prev) => prev?.filter((p) => p.id !== item.id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ThemedView style={styles.card}>
      <View style={styles.rowBetween}>
        <ThemedText type="subtitle" style={{ flex: 1 }}>
          Presupuestos de capacitación
        </ThemedText>
        <Pressable
          onPress={() => setShowForm((v) => !v)}
          style={({ pressed }) => [styles.smallButton, { borderColor: palette.tint }, pressed && { opacity: 0.6 }]}>
          <Ionicons name={showForm ? 'close' : 'add'} size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.tint }}>{showForm ? 'Cerrar' : 'Nuevo'}</ThemedText>
        </Pressable>
      </View>

      {showForm && (
        <PresupuestoForm
          onCreated={(created) => {
            setItems((prev) => [created, ...(prev ?? [])]);
            setShowForm(false);
          }}
        />
      )}

      {error && <ThemedText style={{ color: DANGER }}>{error}</ThemedText>}
      {!items && !error && <ActivityIndicator color={palette.tint} />}
      {items?.length === 0 && <ThemedText style={styles.muted}>No hay presupuestos registrados</ThemedText>}

      {items?.map((item) => {
        const expanded = expandedId === item.id;
        const busy = busyId === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setExpandedId(expanded ? null : item.id)}
            style={[styles.item, { borderColor: `${palette.icon}33` }]}>
            <View style={styles.rowBetween}>
              <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                {item.nombre}
              </ThemedText>
              <EstadoBadge estado={item.estado} />
            </View>
            {item.descripcion ? (
              <ThemedText style={[styles.muted, { fontSize: 14 }]} numberOfLines={expanded ? undefined : 1}>
                {item.descripcion}
              </ThemedText>
            ) : null}
            <View style={styles.rowBetween}>
              <ThemedText style={{ fontSize: 14 }}>
                {formatQuetzales(item.monto_ejecutado)} / {formatQuetzales(item.monto_asignado)}
              </ThemedText>
              <ThemedText style={[styles.muted, { fontSize: 13 }]}>
                {item.fecha_inicio}
                {item.fecha_fin ? ` → ${item.fecha_fin}` : ''}
              </ThemedText>
            </View>

            {expanded && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <ThemedText style={[styles.muted, { fontSize: 13 }]}>Cambiar estado:</ThemedText>
                <View style={styles.chips}>
                  {ESTADOS_PRESUPUESTO.map((estado) => (
                    <EstadoChip
                      key={estado}
                      estado={estado}
                      selected={item.estado === estado}
                      disabled={busy || item.estado === estado}
                      onPress={() => changeEstado(item, estado)}
                    />
                  ))}
                </View>
                <Pressable
                  onPress={() => remove(item)}
                  disabled={busy}
                  style={({ pressed }) => [styles.smallButton, { borderColor: DANGER }, pressed && { opacity: 0.6 }]}>
                  {busy ? (
                    <ActivityIndicator size="small" color={DANGER} />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color={DANGER} />
                  )}
                  <ThemedText style={{ color: DANGER }}>Eliminar</ThemedText>
                </Pressable>
              </View>
            )}
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

function PresupuestoForm({ onCreated }: { onCreated: (created: PresupuestoCapacitacion) => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { authFetch } = useAuth();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [estado, setEstado] = useState<EstadoPresupuesto>('planificada');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createPresupuesto(authFetch, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        monto_asignado: Number(monto.replace(',', '.')),
        fecha_inicio: fechaInicio.trim(),
        estado,
      });
      onCreated(created);
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length > 0) setFieldErrors(e.fieldErrors);
      else setError(e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = [styles.input, { color: palette.text, borderColor: `${palette.icon}55` }];

  return (
    <View style={[styles.form, { borderColor: `${palette.tint}55` }]}>
      <TextInput style={inputStyle} placeholder="Nombre" placeholderTextColor={palette.icon} value={nombre} onChangeText={setNombre} />
      <FieldError messages={fieldErrors.nombre} />
      <TextInput
        style={[inputStyle, { minHeight: 64, textAlignVertical: 'top' }]}
        placeholder="Descripción"
        placeholderTextColor={palette.icon}
        multiline
        value={descripcion}
        onChangeText={setDescripcion}
      />
      <FieldError messages={fieldErrors.descripcion} />
      <TextInput
        style={inputStyle}
        placeholder="Monto asignado (Q)"
        placeholderTextColor={palette.icon}
        keyboardType="decimal-pad"
        value={monto}
        onChangeText={setMonto}
      />
      <FieldError messages={fieldErrors.monto_asignado} />
      <TextInput
        style={inputStyle}
        placeholder="Fecha de inicio (AAAA-MM-DD)"
        placeholderTextColor={palette.icon}
        autoCapitalize="none"
        value={fechaInicio}
        onChangeText={setFechaInicio}
      />
      <FieldError messages={fieldErrors.fecha_inicio} />
      <View style={styles.chips}>
        {ESTADOS_PRESUPUESTO.map((option) => (
          <EstadoChip key={option} estado={option} selected={estado === option} onPress={() => setEstado(option)} />
        ))}
      </View>
      <FieldError messages={fieldErrors.estado} />
      {error && <ThemedText style={{ color: DANGER }}>{error}</ThemedText>}
      <Pressable
        onPress={submit}
        disabled={submitting}
        style={({ pressed }) => [styles.button, { backgroundColor: palette.tint }, pressed && { opacity: 0.7 }]}>
        {submitting ? (
          <ActivityIndicator color={palette.background} />
        ) : (
          <ThemedText type="defaultSemiBold" style={{ color: palette.background }}>
            Registrar presupuesto
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

function EstadoBadge({ estado }: { estado: EstadoPresupuesto }) {
  const color = ESTADO_COLORS[estado] ?? '#888';
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <ThemedText style={{ color, fontSize: 12, fontWeight: '600' }}>{ESTADO_LABELS[estado] ?? estado}</ThemedText>
    </View>
  );
}

function EstadoChip({
  estado,
  selected,
  disabled,
  onPress,
}: {
  estado: EstadoPresupuesto;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const color = ESTADO_COLORS[estado];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, { borderColor: selected ? color : `${color}55` }, selected && { backgroundColor: `${color}22` }]}>
      <ThemedText style={{ color, fontSize: 14, fontWeight: selected ? '600' : '400' }}>{ESTADO_LABELS[estado]}</ThemedText>
    </Pressable>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <ThemedText style={{ color: DANGER, fontSize: 13, marginTop: -4 }}>{messages.join(' ')}</ThemedText>;
}

function confirmDialog(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Confirmar', message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
    ])
  );
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  item: {
    gap: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  form: {
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
});
