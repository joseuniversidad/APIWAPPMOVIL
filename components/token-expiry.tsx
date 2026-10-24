import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// Muestra cuándo expira el token de la API con una cuenta regresiva en vivo.
export function TokenExpiry({ expiresAt }: { expiresAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!expiresAt) {
    return <ThemedText style={styles.muted}>La API no informó la fecha de expiración del token</ThemedText>;
  }

  const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return (
    <ThemedText style={styles.muted}>
      Token expira: {new Date(expiresAt).toLocaleString('es-GT')} ({hours}h {minutes}m {seconds}s)
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  muted: {
    opacity: 0.7,
    fontSize: 14,
  },
});
