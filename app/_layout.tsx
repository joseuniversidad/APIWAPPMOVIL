import { Stack, DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/auth-context';
import { CatalogProvider } from '@/contexts/catalog-context';
import { ThemeProvider as AppThemeProvider } from '@/contexts/theme-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <CatalogProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </CatalogProvider>
    </AppThemeProvider>
  );
}

function RootNavigation() {
  const colorScheme = useColorScheme();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="language/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="framework/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="agregar-lenguaje" options={{ headerShown: false, title: 'Agregar lenguaje' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}
