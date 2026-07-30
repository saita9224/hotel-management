import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

export const AUTH_STORAGE_KEYS = ["token", "schemaName", "roles", "permissions", "isEmailVerified"];

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

// ---------------------------------------------------------------------------
// Local session / PIN gate
//
// This is deliberately independent of the JWT session above. The PIN is
// never sent to or known by the server — it only ever gates *this device's*
// access to whatever is already cached locally. A JWT logout (clearStoredSession)
// does NOT touch the PIN; the PIN survives across a fresh real login by design,
// so signing in again doesn't force the user to re-set it.
// ---------------------------------------------------------------------------

const PIN_HASH_KEY = "pinHash";
const PIN_ATTEMPTS_KEY = "pinFailedAttempts";
const PIN_LOCKOUT_UNTIL_KEY = "pinLockoutUntil";

const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function hashPin(pin) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function hasPinSet() {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return !!hash;
}

export async function setPin(pin) {
  const hash = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(PIN_LOCKOUT_UNTIL_KEY).catch(() => {});
}

// Used by the "forgot PIN" flow — server never resets a PIN, since it
// never knew it. Caller is responsible for also forcing a fresh real login.
export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(PIN_LOCKOUT_UNTIL_KEY).catch(() => {});
}

// Returns the lockout expiry timestamp (ms) if currently locked out, else null.
// Clears expired lockouts as a side effect so callers don't have to.
export async function getPinLockout() {
  const until = await SecureStore.getItemAsync(PIN_LOCKOUT_UNTIL_KEY);
  if (!until) return null;

  const untilMs = parseInt(until, 10);
  if (Date.now() >= untilMs) {
    await SecureStore.deleteItemAsync(PIN_LOCKOUT_UNTIL_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY).catch(() => {});
    return null;
  }
  return untilMs;
}

// Returns one of:
//   { success: true }
//   { success: false, lockedUntil: <ms timestamp> }
//   { success: false, attemptsRemaining: <n> }
export async function verifyPin(pin) {
  const lockedUntil = await getPinLockout();
  if (lockedUntil) {
    return { success: false, lockedUntil };
  }

  const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  const candidateHash = await hashPin(pin);

  if (storedHash && candidateHash === storedHash) {
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY).catch(() => {});
    return { success: true };
  }

  const attemptsRaw = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY);
  const attempts = (attemptsRaw ? parseInt(attemptsRaw, 10) : 0) + 1;

  if (attempts >= MAX_PIN_ATTEMPTS) {
    const lockedUntilMs = Date.now() + LOCKOUT_DURATION_MS;
    await SecureStore.setItemAsync(PIN_LOCKOUT_UNTIL_KEY, String(lockedUntilMs));
    await SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY).catch(() => {});
    return { success: false, lockedUntil: lockedUntilMs };
  }

  await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY, String(attempts));
  return { success: false, attemptsRemaining: MAX_PIN_ATTEMPTS - attempts };
}