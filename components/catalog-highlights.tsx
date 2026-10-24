import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppConfig } from '@/contexts/app-config-context';
import { useAuth } from '@/contexts/auth-context';
import { useCatalog } from '@/contexts/catalog-context';
import { readableOn } from '@/utils/color';

const TONE_COLORS = { info: '#0a7ea4', exito: '#2e9e5b', alerta: '#d9822b' } as const;
const TONE_ICONS = { info: 'information-circle', exito: 'sparkles', alerta: 'alert-circle' } as const;

// Lo que el superusuario publica para todos: anuncio fijado y lenguaje destacado.
// Se actualizan en vivo (Realtime) en el catálogo de cada usuario.
export function CatalogHighlights() {
  const router = useRouter();
  const { config } = useAppConfig();
  const { getLanguageById } = useCatalog();
  if (!config) return null;

  const announcementLanguage = getLanguageById(config.anuncio_language_id ?? undefined);
  const featured = getLanguageById(config.destacado_language_id ?? undefined);
  const toneColor = TONE_COLORS[config.anuncio_tono] ?? TONE_COLORS.info;
  const showAnnouncement = config.anuncio_activo && Boolean(config.anuncio_titulo);

  return (
    <>
      {showAnnouncement && (
        <Pressable
          disabled={!announcementLanguage}
          onPress={() => announcementLanguage && router.push(`/language/${announcementLanguage.id}`)}
          style={({ pressed }) => [styles.announcement, { borderColor: toneColor, backgroundColor: `${toneColor}1A` }, pressed && { opacity: 0.7 }]}>
          <Ionicons name={TONE_ICONS[config.anuncio_tono] ?? 'information-circle'} size={22} color={toneColor} />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="defaultSemiBold" style={{ color: toneColor }}>
              {config.anuncio_titulo}
            </ThemedText>
            {config.anuncio_texto && <ThemedText style={{ fontSize: 14 }}>{config.anuncio_texto}</ThemedText>}
          </View>
          {announcementLanguage && <Ionicons name="chevron-forward" size={18} color={toneColor} />}
        </Pressable>
      )}

      {featured && (
        <Pressable
          onPress={() => router.push(`/language/${featured.id}`)}
          style={({ pressed }) => [styles.featured, { backgroundColor: featured.color }, pressed && { opacity: 0.85 }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText style={styles.featuredEyebrow} lightColor={readableOn(featured.color)} darkColor={readableOn(featured.color)}>
              ⭐ DESTACADO DE LA SEMANA
            </ThemedText>
            <ThemedText style={styles.featuredTitle} lightColor={readableOn(featured.color)} darkColor={readableOn(featured.color)}>
              {featured.name}
            </ThemedText>
            <ThemedText style={{ fontSize: 14, opacity: 0.9 }} lightColor={readableOn(featured.color)} darkColor={readableOn(featured.color)} numberOfLines={2}>
              {config.destacado_nota || featured.tagline}
            </ThemedText>
          </View>
          <Ionicons name="arrow-forward-circle" size={32} color={readableOn(featured.color)} />
        </Pressable>
      )}
    </>
  );
}

// Barra para el superusuario: deja claro que está viendo la app como un estudiante.
export function AdminPreviewBar() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <Pressable onPress={() => router.navigate('/admin')} style={({ pressed }) => [styles.adminBar, pressed && { opacity: 0.85 }]}>
      <Ionicons name="shield-checkmark" size={16} color="#f5b301" />
      <ThemedText style={styles.adminBarText} lightColor="#ffffff" darkColor="#ffffff" numberOfLines={1}>
        Modo administrador · así ven la app tus usuarios
      </ThemedText>
      <ThemedText style={[styles.adminBarText, { color: '#f5b301', fontWeight: '700' }]}>Panel ›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  announcement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  featuredEyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
    lineHeight: 14,
  },
  featuredTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  adminBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#16213e',
  },
  adminBarText: {
    fontSize: 13,
    lineHeight: 17,
    flexShrink: 1,
  },
});
