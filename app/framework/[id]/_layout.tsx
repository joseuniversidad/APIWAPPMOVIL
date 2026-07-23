import { Stack } from 'expo-router';

export default function FrameworkLayout() {
  return <Stack screenOptions={{ headerBackTitle: 'Atrás', headerTitleAlign: 'center' }} />;
}
