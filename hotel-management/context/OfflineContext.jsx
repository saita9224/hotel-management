// context/OfflineContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { processOfflineQueue } from "../services/syncService";
import { getQueueCount } from "../lib/offlineQueue";

const OfflineContext = createContext({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  syncNow: async () => {},
  refreshQueueCount: async () => {},
});

export function OfflineProvider({ children }) {
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshQueueCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    try {
      setIsSyncing(true);
      await processOfflineQueue();
    } catch (err) {
      console.warn("Manual sync error:", err);
    } finally {
      setIsSyncing(false);
      await refreshQueueCount();
    }
  }, [isOnline, isSyncing, refreshQueueCount]);

  // Initial queue count load
  useEffect(() => {
    refreshQueueCount();
  }, [refreshQueueCount]);

  // Auto-sync when coming back online if pending items exist
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncNow();
    }
  }, [isOnline, pendingCount, isSyncing, syncNow]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        isSyncing,
        syncNow,
        refreshQueueCount,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
