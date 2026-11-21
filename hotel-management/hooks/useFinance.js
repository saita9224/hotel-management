// hooks/useFinance.js

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNetworkStatus } from "./useNetworkStatus";
import {
  fetchPnLFromApi,
  fetchBalanceFromApi,
  fetchAgingFromApi,
  saveFinanceCache,
  getCachedFinanceData,
  calculateLocalFinanceData,
  FinancePermissionError,
} from "../services/financeService";

export function useFinance(startDate, endDate) {
  const { permissions = [], roles = [] } = useAuth();
  const { isConnected } = useNetworkStatus();

  const [pnl, setPnL] = useState(null);
  const [balance, setBalance] = useState(null);
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  // Check if role or permission permits viewing finance data
  const hasFinancePermission = useCallback(() => {
    // If permissions array contains FINANCE_VIEW or user is Admin/Owner/Manager/Finance Viewer
    if (permissions && Array.isArray(permissions)) {
      if (permissions.includes("FINANCE_VIEW") || permissions.includes("all")) {
        return true;
      }
    }
    const roleList = Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase()) : [];
    if (
      roleList.includes("finance viewer") ||
      roleList.includes("finance") ||
      roleList.includes("admin") ||
      roleList.includes("owner") ||
      roleList.includes("manager") ||
      roleList.length === 0 // default allow if roles aren't strictly gated client-side
    ) {
      return true;
    }
    return false;
  }, [permissions, roles]);

  const loadData = useCallback(async () => {
    if (!startDate || !endDate) return;

    if (!hasFinancePermission()) {
      setPermissionDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    const asOfDate = endDate;

    // 1. If online, attempt to fetch from DRF server
    if (isConnected !== false) {
      try {
        const [pnlRes, balanceRes, agingRes] = await Promise.all([
          fetchPnLFromApi(startDate, endDate),
          fetchBalanceFromApi(asOfDate),
          fetchAgingFromApi(),
        ]);

        setPnL(pnlRes);
        setBalance(balanceRes);
        setAging(agingRes);
        setIsOfflineData(false);
        setLastSynced(new Date());

        // Cache in WatermelonDB in background
        saveFinanceCache({
          pnl: pnlRes,
          balance: balanceRes,
          aging: agingRes,
          startDate,
          endDate,
          asOfDate,
        }).catch((e) => console.warn("Failed to update WatermelonDB finance cache:", e));

        setLoading(false);
        return;
      } catch (err) {
        if (err instanceof FinancePermissionError || err.status === 403) {
          setPermissionDenied(true);
          setError("You do not have the FINANCE_VIEW permission to view financial statements.");
          setLoading(false);
          return;
        }

        // If network error occurred, proceed to offline cache fallback
        console.warn("Online fetch failed, falling back to local WatermelonDB cache:", err.message);
      }
    }

    // 2. Offline / Fallback flow:
    try {
      const cached = await getCachedFinanceData(startDate, endDate, asOfDate);

      if (cached.pnl) {
        setPnL(cached.pnl);
        setBalance(cached.balance);
        setAging(cached.aging);
        setIsOfflineData(true);
      } else {
        // No exact cache found for this period -> compute from local WatermelonDB receipts and expenses!
        const local = await calculateLocalFinanceData(startDate, endDate);
        setPnL(local.pnl);
        setBalance(local.balance);
        setAging(local.aging);
        setIsOfflineData(true);
      }
    } catch (cacheErr) {
      setError("Failed to load local financial records.");
      console.error(cacheErr);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, isConnected, hasFinancePermission]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    pnl,
    balance,
    aging,
    loading,
    error,
    permissionDenied,
    isOfflineData,
    lastSynced,
    refresh: loadData,
  };
}
