import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ADMIN_GOLD = '#f5b301';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAdmin } = useAuth();

  const adminTab = (
    <Tabs.Screen
      key="admin"
      name="admin"
      options={{
        title: 'Admin',
        // Solo existe para el superusuario; para él es la primera pestaña y la de inicio.
        href: isAdmin ? undefined : null,
        tabBarActiveTintColor: ADMIN_GOLD,
        tabBarIcon: ({ color }) => <IconSymbol size={26} name="checkmark.shield.fill" color={color} />,
      }}
    />
  );

  const studentTabs = [
    <Tabs.Screen
      key="index"
      name="index"
      options={{
        title: 'Catálogo',
        tabBarIcon: ({ color }) => <IconSymbol size={26} name="books.vertical.fill" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="aprender"
      name="aprender"
      options={{
        title: 'Aprender',
        tabBarIcon: ({ color }) => <IconSymbol size={26} name="graduationcap.fill" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="asistente"
      name="asistente"
      options={{
        title: 'Asistente',
        tabBarIcon: ({ color }) => <IconSymbol size={26} name="sparkles" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="api"
      name="api"
      options={{
        title: 'API',
        tabBarIcon: ({ color }) => <IconSymbol size={26} name="cloud.fill" color={color} />,
      }}
    />,
    <Tabs.Screen
      key="perfil"
      name="perfil"
      options={{
        title: 'Perfil',
        tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.crop.circle.fill" color={color} />,
      }}
    />,
  ];

  return (
    <Tabs
      // La primera pestaña es la de inicio: el panel para el superusuario, el catálogo para los demás.
      initialRouteName={isAdmin ? 'admin' : 'index'}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      {isAdmin ? [adminTab, ...studentTabs] : [...studentTabs, adminTab]}
    </Tabs>
  );
}
