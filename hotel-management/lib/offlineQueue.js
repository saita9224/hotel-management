// lib/offlineQueue.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const QUEUE_STORAGE_KEY = "@pos_offline_queue_v1";

/**
 * Get all queued mutation items.
 */
export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to read offline queue:", error);
    return [];
  }
}

/**
 * Save the entire queue array back to AsyncStorage.
 */
async function saveQueue(queue) {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to save offline queue:", error);
  }
}

/**
 * Enqueue a new mutation to the offline storage queue.
 */
export async function enqueueMutation(mutationType, payload) {
  const queue = await getQueue();
  const clientId = Crypto.randomUUID();
  const newItem = {
    id: clientId,
    clientId,
    mutationType,
    payload,
    createdAt: Date.now(),
    status: "PENDING",
    error: null,
  };

  queue.push(newItem);
  await saveQueue(queue);
  return newItem;
}

/**
 * Get pending mutations ordered by creation timestamp.
 */
export async function getPendingMutations() {
  const queue = await getQueue();
  return queue
    .filter((item) => item.status === "PENDING")
    .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Mark specified mutation IDs as 'SYNCING'.
 */
export async function markMutationsSyncing(clientIds) {
  const queue = await getQueue();
  const idSet = new Set(clientIds);
  const updated = queue.map((item) => {
    if (idSet.has(item.clientId)) {
      return { ...item, status: "SYNCING" };
    }
    return item;
  });
  await saveQueue(updated);
}

/**
 * Reset 'SYNCING' items back to 'PENDING' (e.g. if network failed mid-request).
 */
export async function resetSyncingToPending(clientIds) {
  const queue = await getQueue();
  const idSet = new Set(clientIds);
  const updated = queue.map((item) => {
    if (idSet.has(item.clientId) && item.status === "SYNCING") {
      return { ...item, status: "PENDING" };
    }
    return item;
  });
  await saveQueue(updated);
}

/**
 * Remove successfully processed or duplicate-ignored mutations from queue.
 */
export async function removeMutations(clientIds) {
  const queue = await getQueue();
  const idSet = new Set(clientIds);
  const filtered = queue.filter((item) => !idSet.has(item.clientId));
  await saveQueue(filtered);
}

/**
 * Mark a single mutation as failed with error details.
 */
export async function markMutationFailed(clientId, errorMsg) {
  const queue = await getQueue();
  const updated = queue.map((item) => {
    if (item.clientId === clientId) {
      return { ...item, status: "FAILED", error: String(errorMsg || "Sync failed") };
    }
    return item;
  });
  await saveQueue(updated);
}

/**
 * Get total count of items remaining in queue.
 */
export async function getQueueCount() {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Clear the entire offline queue (utility for reset/logout).
 */
export async function clearQueue() {
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear offline queue:", error);
  }
}
