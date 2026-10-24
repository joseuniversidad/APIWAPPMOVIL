import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { openNotice, useNotices } from '@/contexts/notices-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import type { Notice } from '@/services/notices';

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} d`;
}

// Lista de avisos para todos. Al abrirla se marcan como leídos; los no leídos conservan el punto
// mientras la pantalla está abierta para que se distingan.
export default function NoticesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const border = colorScheme === 'dark' ? '#2a2d2e' : '#e6e8ea';
  const { contentMaxWidth } = useResponsive();
  const { notices, isUnread, markAllRead, refresh } = useNotices();
  // Se congelan los no leídos al entrar, antes de marcarlos.
  const [unreadIds] = useState(() => new Set(notices.filter(isUnread).map((n) => n.id)));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const renderItem = ({ item, index }: { item: Notice; index: number }) => {
    const unread = unreadIds.has(item.id);
    const opensSomething = Boolean(item.language_id || item.reto_id);
    return (
      <Pressable
        onPress={() => opensSomething && openNotice({ lenguaje: item.language_id, reto: item.reto_id })}
        disabled={!opensSomething}
        style={({ pressed }) => [styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: border }, pressed && { opacity: 0.6 }]}>
        <View style={[styles.dot, { backgroundColor: unread ? palette.tint : 'transparent' }]} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="defaultSemiBold">{item.titulo}</ThemedText>
          <ThemedText style={{ opacity: 0.8 }}>{item.cuerpo}</ThemedText>
          <ThemedText style={styles.meta}>{timeAgo(item.created_at)}</ThemedText>
        </View>
        {opensSomething && <Ionicons name="chevron-forward" size={18} color={palette.icon} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <FlatList
        data={notices}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refresh();
              setTimeout(() => setRefreshing(false), 600);
            }}
            tintColor={palette.tint}
          />
        }
        contentContainerStyle={[styles.content, contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' } : undefined]}
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: 8 }}>
            <BackButton fallbackHref="/" />
            <ThemedText type="title" style={{ fontSize: 28, lineHeight: 34, paddingHorizontal: 16 }}>
              Avisos
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={36} color={palette.icon} />
            <ThemedText style={{ opacity: 0.65, textAlign: 'center' }}>
              Todavía no hay avisos. Aquí aparecerán los lenguajes nuevos, los retos y los mensajes del superusuario.
            </ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meta: {
    fontSize: 12,
    opacity: 0.6,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    padding: 32,
  },
});
