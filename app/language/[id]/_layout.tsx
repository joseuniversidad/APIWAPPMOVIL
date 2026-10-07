import { Stack } from 'expo-router';

import { LANGUAGES } from '@/data/languages';

// Genera una página estática por lenguaje al exportar la web (evita 404 al recargar en el hosting).
export function generateStaticParams() {
  return LANGUAGES.map((language) => ({ id: language.id }));
}

export default function LanguageLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
