import { Stack, DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { CatalogProvider } from '@/contexts/catalog-context';
import { NoticesProvider } from '@/contexts/notices-context';
import { ThemeProvider as AppThemeProvider } from '@/contexts/theme-context';
import { UserDataProvider } from '@/contexts/user-data-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <CatalogProvider>
        <AuthProvider>
          <UserDataProvider>
            <NoticesProvider>
              <RootNavigation />
            </NoticesProvider>
          </UserDataProvider>
        </AuthProvider>
      </CatalogProvider>
    </AppThemeProvider>
  );
}

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { user, isAdmin, isTeacher, loading } = useAuth();
  // Solo se entra con una cuenta registrada (ya no hay modo invitado).
  const canEnter = Boolean(user);

  // Mientras se lee la sesión guardada no se decide la ruta, para no mostrar el login un instante.
  if (loading) {
    const palette = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.tint} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={canEnter}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="language/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="framework/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="comparar" options={{ headerShown: false, title: 'Comparar lenguajes' }} />
          <Stack.Screen name="practicar" options={{ headerShown: false, title: 'Practicar código' }} />
          <Stack.Screen name="avisos" options={{ headerShown: false, title: 'Avisos' }} />
          <Stack.Screen name="clase/[id]" options={{ headerShown: false, title: 'Clase' }} />
          <Stack.Screen name="reto/[id]" options={{ headerShown: false, title: 'Reto' }} />
        </Stack.Protected>
        {/* Publicar retos: profesores y superusuario. */}
        <Stack.Protected guard={canEnter && isTeacher}>
          <Stack.Screen name="nuevo-reto" options={{ headerShown: false, title: 'Nuevo reto' }} />
        </Stack.Protected>
        {/* Agregar y editar lenguajes es exclusivo del superusuario. */}
        <Stack.Protected guard={canEnter && isAdmin}>
          <Stack.Screen name="agregar-lenguaje" options={{ headerShown: false, title: 'Agregar lenguaje' }} />
        </Stack.Protected>
        <Stack.Protected guard={!canEnter}>
          <Stack.Screen name="login" options={{ headerShown: false, title: 'Iniciar sesión' }} />
          <Stack.Screen name="registro" options={{ headerShown: false, title: 'Crear cuenta' }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}
