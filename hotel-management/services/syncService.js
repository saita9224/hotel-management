// services/syncService.js

import { graphqlRequest } from "../lib/graphql";
import { SyncQueue } from "../database/syncQueue";
import { uploadBusinessLogoGraphQL } from "./businessService";
import { ProductRepository } from "../database/repositories/productRepository";
import { ExpenseRepository } from "../database/repositories/expenseRepository";
import { ReceiptRepository } from "../database/repositories/receiptRepository";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_SYNC_MUTATION = `
  mutation PushSync($mutations: [SyncMutationInput!]!) {
    pushSync(mutations: $mutations) {
      results {
        clientId
        status
        error
      }
    }
  }
`;

const priorityMap = {
  UPDATE_BUSINESS_LOGO: 0,
  CREATE_RECEIPT: 1,
  CREATE_ORDER: 2,
  ADD_ORDER_ITEM: 3,
  ADD_MENU_ORDER_ITEM: 3,
  SUBMIT_ORDER: 4,
  ACCEPT_PAYMENT: 5,
  CREATE_EXPENSE: 1,
  PAY_BALANCE: 2,
  CREATE_PRODUCT: 1,
  CREATE_CATEGORY: 1,
  ADD_STOCK: 2,
  REMOVE_STOCK: 2,
  CREATE_EMPLOYEE: 1,
  CHECK_IN_ATTENDANCE: 2,
  CREATE_LEAVE_REQUEST: 2,
};

function sortQueueByDependency(items) {
  return [...items].sort((a, b) => {
    const pA = priorityMap[a.mutationType] ?? 99;
    const pB = priorityMap[b.mutationType] ?? 99;
    if (pA !== pB) return pA - pB;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}

/**
 * Process all pending offline mutations in sequence/batch via pushSync GraphQL mutation.
 */
export async function processOfflineQueue() {
  const pendingItems = await SyncQueue.getPending();
  if (!pendingItems || pendingItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  // Separate logo upload mutations from standard data pushSync mutations
  const logoItems = pendingItems.filter((item) => item.mutationType === "UPDATE_BUSINESS_LOGO");
  const standardItems = pendingItems.filter((item) => item.mutationType !== "UPDATE_BUSINESS_LOGO");

  let syncedCount = 0;
  let failedCount = 0;

  // Process offline logo uploads
  for (const item of logoItems) {
    try {
      await SyncQueue.markSyncing([item.clientId]);
      const payload = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;
      const fileObj = {
        uri: payload.uri,
        name: payload.name || "logo.png",
        type: payload.type || "image/png",
      };

      const updatedBusiness = await uploadBusinessLogoGraphQL(fileObj);
      if (updatedBusiness?.logo) {
        const schemaName = await AsyncStorage.getItem("schemaName");
        const cacheKey = `@business_info_${schemaName}`;
        const existingRaw = await AsyncStorage.getItem(cacheKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            ...existing,
            ...updatedBusiness,
          })
        );
      }
      await SyncQueue.removeSucceeded([item.clientId]);
      syncedCount++;
    } catch (err) {
      console.error("Failed to sync offline business logo upload:", err);
      failedCount++;
      await SyncQueue.markFailed(item.clientId, err.message || "Logo upload sync failed");
    }
  }

  if (standardItems.length === 0) {
    return { syncedCount, failedCount };
  }

  // Sort queue by topological dependency order before batching
  const sortedItems = sortQueueByDependency(standardItems);
  const clientIds = sortedItems.map((item) => item.clientId);

  // 1. Mark items as SYNCING
  await SyncQueue.markSyncing(clientIds);

  // 2. Prepare payload for backend pushSync mutation
  const pushPayload = sortedItems.map((item) => ({
    clientId: item.clientId,
    mutationType: item.mutationType,
    payload: typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload,
  }));

  try {
    const data = await graphqlRequest(PUSH_SYNC_MUTATION, { mutations: pushPayload });
    const results = data?.pushSync?.results || [];

    const succeededIds = [];
    let failedCount = 0;

    for (const res of results) {
      if (res.status === "SUCCESS" || res.status === "DUPLICATE_IGNORED") {
        succeededIds.push(res.clientId);
      } else {
        failedCount++;
        await SyncQueue.markFailed(res.clientId, res.error || "Server processing failed");
      }
    }

    // Remove succeeded/duplicate items from local offline queue
    if (succeededIds.length > 0) {
      await SyncQueue.removeSucceeded(succeededIds);
    }

    return {
      syncedCount: succeededIds.length,
      failedCount,
    };
  } catch (error) {
    console.error("pushSync network execution failed:", error);
    // Reset items back to PENDING so they can retry when connection recovers
    await SyncQueue.resetToPending(clientIds);
    throw error;
  }
}

const PULL_CHANGES_QUERY = `
  query PullChanges($lastPulledAt: Float, $schemaVersion: Int) {
    pullChanges(lastPulledAt: $lastPulledAt, schemaVersion: $schemaVersion) {
      changes
      timestamp
    }
  }
`;

const LAST_SYNC_KEY = "@last_pulled_at";

export async function fetchServerChanges(lastPulledAt = null) {
  try {
    const ts = lastPulledAt ?? (await AsyncStorage.getItem(LAST_SYNC_KEY));
    const variables = {
      lastPulledAt: ts ? Number(ts) : null,
      schemaVersion: 1,
    };
    const data = await graphqlRequest(PULL_CHANGES_QUERY, variables);
    const result = data?.pullChanges;
    if (result?.timestamp) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, String(result.timestamp));
    }
    return result;
  } catch (err) {
    console.warn("fetchServerChanges failed:", err);
    return null;
  }
}

export async function applyServerChanges(changes) {
  if (!changes) return;

  // 1. Sync products
  if (changes.products) {
    const { created = [], updated = [] } = changes.products;
    for (const p of [...created, ...updated]) {
      try {
        const existing = await ProductRepository.findById(p.id);
        if (existing) {
          await ProductRepository.update(p.id, {
            name: p.name,
            category_id: p.category_id,
            unit: p.unit,
            auto_deduct_on_sale: p.auto_deduct_on_sale,
            synced: true,
          });
        } else {
          await ProductRepository.create({
            id: p.id,
            name: p.name,
            category_id: p.category_id,
            unit: p.unit,
            current_stock: 0,
            auto_deduct_on_sale: p.auto_deduct_on_sale,
            synced: true,
          });
        }
      } catch (e) {
        console.warn("Failed to apply product delta:", p.id, e);
      }
    }
  }

  // 2. Sync expenses
  if (changes.expenses) {
    const { created = [], updated = [] } = changes.expenses;
    for (const e of [...created, ...updated]) {
      try {
        const existing = await ExpenseRepository.findById(e.id);
        if (existing) {
          await ExpenseRepository.update(e.id, { ...e, synced: true });
        } else {
          await ExpenseRepository.create({ ...e, synced: true });
        }
      } catch (err) {
        console.warn("Failed to apply expense delta:", e.id, err);
      }
    }
  }

  // 3. Sync receipts
  if (changes.receipts) {
    const { created = [], updated = [] } = changes.receipts;
    for (const r of [...created, ...updated]) {
      try {
        const existing = await ReceiptRepository.findById(r.id);
        if (existing) {
          await ReceiptRepository.update(r.id, { ...r, synced: true });
        } else {
          await ReceiptRepository.create({ ...r, synced: true });
        }
      } catch (err) {
        console.warn("Failed to apply receipt delta:", r.id, err);
      }
    }
  }
}

export async function pullAndApplyServerChanges() {
  const result = await fetchServerChanges();
  if (result?.changes) {
    await applyServerChanges(result.changes);
  }
  return result;
}

