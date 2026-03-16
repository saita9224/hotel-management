// context/POSContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

import {
  fetchActiveSession,
  openSessionService,
  closeSessionService,
  createReceiptService,
  fetchReceiptsBySession,
  fetchMyPendingReceipts,
  fetchCashierQueue,
  fetchOpenReceipts,
  fetchUnsettledCredits,
  createOrderService,
  addOrderItemService,
  addMenuOrderItemService,
  submitOrderService,
  recallOrderService,
  acceptPaymentService,
  createCreditService,
  settleCreditService,
  refundReceiptService,
} from "../services/posService";

const POSContext = createContext();
export const usePOS = () => useContext(POSContext);

export const POSProvider = ({ children }) => {
  const [session, setSession]                   = useState(null);
  const [receipts, setReceipts]                 = useState([]);
  const [cashierQueue, setCashierQueue]         = useState([]);
  const [openReceipts, setOpenReceipts]         = useState([]);
  const [unsettledCredits, setUnsettledCredits] = useState([]);
  const [activeReceipt, setActiveReceipt]       = useState(null);
  const [loading, setLoading]                   = useState(false);
  const [cashierLoading, setCashierLoading]     = useState(false);

  const replaceReceipt = useCallback((updated) => {
    setReceipts((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  }, []);

  // ── Session ───────────────────────────────────────────

  const loadSession = async () => {
    try {
      setLoading(true);
      const s = await fetchActiveSession();
      setSession(s);
      if (s) {
        const r = await fetchReceiptsBySession(s.id);
        setReceipts(r);
      } else {
        setReceipts([]);
      }
    } catch (err) {
      console.log("Load Session Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadReceipts = async () => {
    if (!session) return;
    try {
      const r = await fetchReceiptsBySession(session.id);
      setReceipts(r);
    } catch (err) {
      console.log("Load Receipts Error:", err);
    }
  };

  const loadCashierData = useCallback(async () => {
    try {
      setCashierLoading(true);
      const [queue, open] = await Promise.all([
        fetchCashierQueue(session?.id ?? null),
        fetchOpenReceipts(session?.id ?? null),
      ]);
      setCashierQueue(queue);
      setOpenReceipts(open);
    } catch (err) {
      console.log("Load Cashier Data Error:", err);
    } finally {
      setCashierLoading(false);
    }
  }, [session?.id]);

  const loadUnsettledCredits = useCallback(async (overdueOnly = false) => {
    try {
      const credits = await fetchUnsettledCredits(overdueOnly);
      setUnsettledCredits(credits);
      return credits;
    } catch (err) {
      console.log("Load Unsettled Credits Error:", err);
      return [];
    }
  }, []);

  const openSession = async (openingCash = 0) => {
    try {
      const s = await openSessionService(openingCash);
      setSession(s);
      setReceipts([]);
      setCashierQueue([]);
      setOpenReceipts([]);
    } catch (err) {
      console.log("Open Session Error:", err);
      throw err;
    }
  };

  const closeSession = async (closingCash) => {
    if (!session) throw new Error("No active session");
    try {
      await closeSessionService(session.id, closingCash);
      setSession(null);
      setReceipts([]);
      setCashierQueue([]);
      setOpenReceipts([]);
      setActiveReceipt(null);
    } catch (err) {
      console.log("Close Session Error:", err);
      throw err;
    }
  };

  // ── Receipt ───────────────────────────────────────────

  const createReceipt = async ({ session_id, discount = 0, table_note = "" }) => {
    try {
      const receipt = await createReceiptService({ session_id, discount, table_note });
      setReceipts((prev) => [receipt, ...prev]);
      return receipt;
    } catch (err) {
      console.log("Create Receipt Error:", err);
      throw err;
    }
  };

  const startNewReceipt  = (receipt) => setActiveReceipt(receipt);
  const clearActiveReceipt = () => setActiveReceipt(null);

  const getMyPendingReceipts = async () => {
    if (!session) return [];
    try {
      return await fetchMyPendingReceipts(session.id);
    } catch (err) {
      console.log("Fetch My Pending Error:", err);
      return [];
    }
  };

  // ── Orders ────────────────────────────────────────────

  const createOrder = async (receiptId) => {
    try {
      return await createOrderService(receiptId);
    } catch (err) {
      console.log("Create Order Error:", err);
      throw err;
    }
  };

  const addOrderItem = async (input) => {
    try {
      return await addOrderItemService(input);
    } catch (err) {
      console.log("Add Order Item Error:", err);
      throw err;
    }
  };

  const addMenuOrderItem = async (input) => {
    try {
      return await addMenuOrderItemService(input);
    } catch (err) {
      console.log("Add Menu Order Item Error:", err);
      throw err;
    }
  };

  // ── Submit / Recall ───────────────────────────────────

  const submitOrder = async (receiptId) => {
    try {
      const updated = await submitOrderService(receiptId);
      setReceipts((prev) => {
        const exists = prev.some((r) => r.id === updated.id);
        if (exists) return prev.map((r) => (r.id === updated.id ? updated : r));
        return [updated, ...prev.filter((r) => r.id !== updated.id)];
      });
      return updated;
    } catch (err) {
      console.log("Submit Order Error:", err);
      throw err;
    }
  };

  const recallOrder = async (receiptId) => {
    try {
      const updated = await recallOrderService(receiptId);
      replaceReceipt(updated);
      setCashierQueue((prev) => prev.filter((r) => r.id !== updated.id));
      return updated;
    } catch (err) {
      console.log("Recall Order Error:", err);
      throw err;
    }
  };

  // ── Payment ───────────────────────────────────────────

  const acceptPayment = async (input) => {
    try {
      const payment = await acceptPaymentService(input);
      await Promise.all([loadCashierData(), loadReceipts()]);
      return payment;
    } catch (err) {
      console.log("Accept Payment Error:", err);
      throw err;
    }
  };

  const createCredit = async (input) => {
    try {
      const credit = await createCreditService(input);
      await Promise.all([loadCashierData(), loadReceipts()]);
      return credit;
    } catch (err) {
      console.log("Create Credit Error:", err);
      throw err;
    }
  };

  const settleCredit = async (input) => {
    try {
      const payment = await settleCreditService(input);
      await Promise.all([loadUnsettledCredits(), loadReceipts()]);
      return payment;
    } catch (err) {
      console.log("Settle Credit Error:", err);
      throw err;
    }
  };

  const refundReceipt = async (input) => {
    try {
      const updated = await refundReceiptService(input);
      replaceReceipt(updated);
      setCashierQueue((prev) => prev.filter((r) => r.id !== updated.id));
      setOpenReceipts((prev) => prev.filter((r) => r.id !== updated.id));
      return updated;
    } catch (err) {
      console.log("Refund Receipt Error:", err);
      throw err;
    }
  };

  // ── Summaries ─────────────────────────────────────────

  const getSummary = useCallback(() => {
    const totalSales   = receipts
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.total, 0);
    const pendingCount = receipts.filter((r) => r.status === "PENDING").length;
    const openCount    = receipts.filter((r) => r.status === "OPEN").length;
    const creditCount  = receipts.filter((r) => r.status === "CREDIT").length;
    return { totalSales, pendingCount, openCount, creditCount };
  }, [receipts]);

  const getCashierSummary = useCallback(() => {
    const queueCount = cashierQueue.length;
    const openCount  = openReceipts.length;
    const paidToday  = receipts
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.total, 0);
    return { queueCount, openCount, paidToday };
  }, [cashierQueue, openReceipts, receipts]);

  useEffect(() => { loadSession(); }, []);

  const value = useMemo(
    () => ({
      session, receipts, cashierQueue, openReceipts,
      unsettledCredits, activeReceipt, loading, cashierLoading,
      loadSession, loadReceipts, loadCashierData, loadUnsettledCredits,
      openSession, closeSession,
      createReceipt, startNewReceipt, clearActiveReceipt, getMyPendingReceipts,
      createOrder, addOrderItem, addMenuOrderItem,
      submitOrder, recallOrder,
      acceptPayment, createCredit, settleCredit, refundReceipt,
      getSummary, getCashierSummary,
    }),
    [
      session, receipts, cashierQueue, openReceipts,
      unsettledCredits, activeReceipt, loading, cashierLoading,
    ]
  );

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};