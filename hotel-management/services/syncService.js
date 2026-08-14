// services/syncService.js

import { graphqlRequest } from "../lib/graphql";
import {
  getPendingMutations,
  markMutationsSyncing,
  resetSyncingToPending,
  removeMutations,
  markMutationFailed,
} from "../lib/offlineQueue";

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

/**
 * Process all pending offline mutations in sequence/batch via pushSync GraphQL mutation.
 */
export async function processOfflineQueue() {
  const pendingItems = await getPendingMutations();
  if (!pendingItems || pendingItems.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const clientIds = pendingItems.map((item) => item.clientId);

  // 1. Mark items as SYNCING
  await markMutationsSyncing(clientIds);

  // 2. Prepare payload for backend pushSync mutation
  const pushPayload = pendingItems.map((item) => ({
    clientId: item.clientId,
    mutationType: item.mutationType,
    payload: item.payload,
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
        await markMutationFailed(res.clientId, res.error || "Server processing failed");
      }
    }

    // Remove succeeded/duplicate items from local offline queue
    if (succeededIds.length > 0) {
      await removeMutations(succeededIds);
    }

    return {
      syncedCount: succeededIds.length,
      failedCount,
    };
  } catch (error) {
    console.error("pushSync network execution failed:", error);
    // Reset items back to PENDING so they can retry when connection recovers
    await resetSyncingToPending(clientIds);
    throw error;
  }
}
