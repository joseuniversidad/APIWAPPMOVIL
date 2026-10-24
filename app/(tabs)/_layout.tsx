import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="books.vertical.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="aprender"
        options={{
          title: 'Aprender',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="graduationcap.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="asistente"
        options={{
          title: 'Asistente',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="sparkles" color={color} />,
        }}
      />
      <Tabs.Screen
        name="api"
        options={{
          title: 'API',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="cloud.fill" color={color} />,
        }}
      />
      {/* Panel del superusuario: la pestaña solo existe para el administrador. */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.shield.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.crop.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
