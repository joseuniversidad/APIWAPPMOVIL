import { Stack } from 'expo-router';

import { FRAMEWORKS } from '@/data/frameworks';

// Genera una página estática por framework al exportar la web (evita 404 al recargar en el hosting).
export function generateStaticParams() {
  return FRAMEWORKS.map((framework) => ({ id: framework.id }));
}

export default function FrameworkLayout() {
  return <Stack screenOptions={{ headerBackTitle: 'Atrás', headerTitleAlign: 'center' }} />;
}
