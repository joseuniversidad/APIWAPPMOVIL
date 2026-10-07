import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore limita cada valor a ~2048 bytes y una sesión de Supabase
// (access_token + refresh_token) suele superarlo, así que se guarda en fragmentos.
// En web no existe SecureStore, por eso se usa AsyncStorage (localStorage).
const CHUNK_SIZE = 1800;

async function setChunked(key: string, value: string): Promise<void> {
  await removeChunked(key);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}_${index}`, chunk)));
  await SecureStore.setItemAsync(`${key}_n`, String(chunks.length));
}

async function getChunked(key: string): Promise<string | null> {
  const total = await SecureStore.getItemAsync(`${key}_n`);
  if (!total) return null;
  const chunks = await Promise.all(
    Array.from({ length: Number(total) }, (_, index) => SecureStore.getItemAsync(`${key}_${index}`))
  );
  if (chunks.some((chunk) => chunk === null)) return null;
  return chunks.join('');
}

async function removeChunked(key: string): Promise<void> {
  const total = await SecureStore.getItemAsync(`${key}_n`);
  if (!total) return;
  await Promise.all(
    Array.from({ length: Number(total) }, (_, index) => SecureStore.deleteItemAsync(`${key}_${index}`))
  );
  await SecureStore.deleteItemAsync(`${key}_n`);
}

// Al exportar la web las páginas se renderizan en Node, donde no existe `window`:
// ahí no hay sesión que leer ni guardar.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const sessionStorage = {
  getItem: (key: string) =>
    isServer ? Promise.resolve(null) : Platform.OS === 'web' ? AsyncStorage.getItem(key) : getChunked(key),
  setItem: (key: string, value: string) =>
    isServer ? Promise.resolve() : Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : setChunked(key, value),
  removeItem: (key: string) =>
    isServer ? Promise.resolve() : Platform.OS === 'web' ? AsyncStorage.removeItem(key) : removeChunked(key),
};
