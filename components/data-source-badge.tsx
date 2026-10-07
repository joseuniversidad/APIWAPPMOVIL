import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useCatalog } from '@/contexts/catalog-context';

// Indica de dónde vienen los datos del catálogo: de la API propia en Supabase o del respaldo local.
export function DataSourceBadge() {
  const { source, loading, error, reload } = useCatalog();
  const fromCloud = source === 'supabase';
  const color = fromCloud ? '#2e9e5b' : '#e0a100';

  return (
    <Pressable
      onPress={fromCloud || loading ? undefined : reload}
      accessibilityRole="button"
      accessibilityLabel={fromCloud ? 'Datos desde Supabase' : 'Datos locales, tocar para reintentar'}
      style={[styles.badge, { borderColor: `${color}66`, backgroundColor: `${color}1A` }]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={fromCloud ? 'cloud-done-outline' : 'phone-portrait-outline'} size={14} color={color} />
      )}
      <ThemedText style={[styles.text, { color }]}>
        {loading ? 'Conectando con Supabase…' : fromCloud ? 'Datos desde Supabase' : error ? 'Datos locales · reintentar' : 'Datos locales'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
