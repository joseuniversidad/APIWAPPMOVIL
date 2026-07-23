import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function BackButton({ label = 'Volver', fallbackHref }: { label?: string; fallbackHref?: string }) {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackHref) {
      router.replace(fallbackHref as never);
    }
  };

  return (
    <Pressable onPress={handlePress} hitSlop={8} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <View style={styles.row}>
        <Ionicons name="arrow-back" size={16} color={palette.tint} />
        <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
});
