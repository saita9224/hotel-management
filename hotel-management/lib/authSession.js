import AsyncStorage from "@react-native-async-storage/async-storage";

export const AUTH_STORAGE_KEYS = ["token", "schemaName", "roles", "permissions"];

const listeners = new Set();

export function subscribeToAuthFailure(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function clearStoredSession() {
  await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
}

export async function handleAuthFailure() {
  await clearStoredSession();
  listeners.forEach((listener) => listener());
}
