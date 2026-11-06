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
  deleteDraftReceiptService,
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
import { useInventory } from "./InventoryContext";
import { useMenu } from "./MenuContext";
import { useOffline } from "./OfflineContext";
import { enqueueMutation } from "../database/syncQueue";
import { ReceiptRepository } from "../database/repositories/receiptRepository";
import { ProductRepository } from "../database/repositories/productRepository";

const POSContext = createContext();
export const usePOS = () => useContext(POSContext);

const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export const POSProvider = ({ children }) => {
  const { loadProducts } = useInventory();
  const { refreshMenu }  = useMenu();
  const { isOnline, refreshQueueCount } = useOffline();

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
      // Error handling
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
      // Error handling
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
      // Error handling
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
      // Error handling
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
      return s;
    } catch (err) {
      // Error handling
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
      // Error handling
      throw err;
    }
  };

  // ── Receipt ───────────────────────────────────────────

  const createReceipt = async ({ session_id, discount = 0, table_note = "" }) => {
    if (!isOnline) {
      const { clientId } = await enqueueMutation("CREATE_RECEIPT", { session_id, discount, table_note });
      await refreshQueueCount();
      
      const mockReceipt = {
        id: clientId,
        receipt_number: `OFFLINE-${clientId.slice(0, 6)}`,
        subtotal: 0,
        discount: Number(discount),
        total: 0,
        balance: 0,
        status: "OPEN",
        table_note,
        created_at: new Date().toISOString(),
        orders: [],
        payments: [],
        credit: null,
      };
      
      // Store in local database
      await ReceiptRepository.create({
        id: clientId,
        session_id,
        receipt_number: mockReceipt.receipt_number,
        subtotal: 0,
        discount: Number(discount),
        total: 0,
        balance: 0,
        status: "OPEN",
        table_note,
        synced: false,
      });
      
      setReceipts((prev) => [mockReceipt, ...prev]);
      return mockReceipt;
    }

    try {
      const receipt = await createReceiptService({ session_id, discount, table_note });
      
      // Store in local database
      await ReceiptRepository.create({
        ...receipt,
        synced: true,
      });
      
      setReceipts((prev) => [receipt, ...prev]);
      return receipt;
    } catch (err) {
      if (err?.message?.includes("Network")) {
        const { clientId } = await enqueueMutation("CREATE_RECEIPT", { session_id, discount, table_note });
        await refreshQueueCount();
        
        const mockReceipt = {
          id: clientId,
          receipt_number: `OFFLINE-${clientId.slice(0, 6)}`,
          subtotal: 0,
          discount: Number(discount),
          total: 0,
          balance: 0,
          status: "OPEN",
          table_note,
          created_at: new Date().toISOString(),
          orders: [],
          payments: [],
          credit: null,
        };
        
        await ReceiptRepository.create({
          id: clientId,
          session_id,
          receipt_number: mockReceipt.receipt_number,
          subtotal: 0,
          discount: Number(discount),
          total: 0,
          balance: 0,
          status: "OPEN",
          table_note,
          synced: false,
        });
        
        setReceipts((prev) => [mockReceipt, ...prev]);
        return mockReceipt;
      }
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
      return [];
    }
  };

  const deleteDraftReceipt = async (receiptId) => {
    try {
      await deleteDraftReceiptService(receiptId);
      setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      setCashierQueue((prev) => prev.filter((r) => r.id !== receiptId));
      setOpenReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      setActiveReceipt((prev) => (prev?.id === receiptId ? null : prev));
      return true;
    } catch (err) {
      throw err;
    }
  };

  // ── Orders ────────────────────────────────────────────

  const createOrder = async (receiptId) => {
    if (!isOnline) {
      const item = await enqueueMutation("CREATE_ORDER", { receiptId });
      await refreshQueueCount();
      return {
        id: item.clientId,
        is_saved: false,
        is_refunded: false,
        created_at: new Date().toISOString(),
        items: [],
      };
    }
    try {
      return await createOrderService(receiptId);
    } catch (err) {
      throw err;
    }
  };

  const addOrderItem = async (input) => {
    if (!isOnline) {
      await enqueueMutation("ADD_ORDER_ITEM", input);
      await refreshQueueCount();
      return {
        id: `offline-${Date.now()}`,
        product_id: input.product_id,
        product_name: "Offline Item",
        quantity: Number(input.quantity),
        listed_price: Number(input.final_price),
        final_price: Number(input.final_price),
        line_total: Number(input.quantity) * Number(input.final_price),
        price_overridden: false,
        price_override_reason: input.price_override_reason,
      };
    }
    try {
      return await addOrderItemService(input);
    } catch (err) {
      throw err;
    }
  };

  const addMenuOrderItem = async (input) => {
    if (!isOnline) {
      await enqueueMutation("ADD_MENU_ORDER_ITEM", input);
      await refreshQueueCount();
      return {
        id: `offline-${Date.now()}`,
        product_id: input.menu_item_id,
        product_name: "Offline Menu Item",
        quantity: Number(input.quantity),
        listed_price: 0,
        final_price: 0,
        line_total: 0,
        price_overridden: false,
      };
    }
    try {
      return await addMenuOrderItemService(input);
    } catch (err) {
      throw err;
    }
  };

  // ── Submit / Recall ───────────────────────────────────

  const submitOrder = async (receiptId, cartItems = []) => {
    if (!isOnline) {
      await enqueueMutation("SUBMIT_ORDER", { receiptId });
      await refreshQueueCount();

      // Deduct local stock for inventory-tracked products while offline
      if (cartItems && cartItems.length > 0) {
        for (const item of cartItems) {
          if (item.product_id && item.product_id !== "0") {
            try {
              await ProductRepository.updateStock(String(item.product_id), -Number(item.quantity || 1));
            } catch (err) {
              console.warn("Could not update local product stock offline:", err);
            }
          }
        }
        await loadProducts();
      }

      setReceipts((prev) =>
        prev.map((r) => (r.id === receiptId ? { ...r, status: "PENDING" } : r))
      );
      return receipts.find((r) => r.id === receiptId);
    }
    try {
      const updated = await submitOrderService(receiptId);
      setReceipts((prev) => {
        const exists = prev.some((r) => r.id === updated.id);
        if (exists) return prev.map((r) => (r.id === updated.id ? updated : r));
        return [updated, ...prev.filter((r) => r.id !== updated.id)];
      });
      await Promise.all([loadProducts(), refreshMenu()]);
      return updated;
    } catch (err) {
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
      throw err;
    }
  };

  // ── Payment ───────────────────────────────────────────

  const acceptPayment = async (input) => {
    if (!isOnline) {
      await enqueueMutation("ACCEPT_PAYMENT", input);
      await refreshQueueCount();
      const offlinePayment = {
        id: `offline-${Date.now()}`,
        method: input.method,
        amount: Number(input.amount),
        created_at: new Date().toISOString(),
      };
      setReceipts((prev) =>
        prev.map((r) => (r.id === input.receipt_id ? { ...r, status: "PAID" } : r))
      );
      return offlinePayment;
    }
    try {
      const payment = await acceptPaymentService(input);
      await Promise.all([loadCashierData(), loadReceipts(), loadProducts(), refreshMenu()]);
      return payment;
    } catch (err) {
      throw err;
    }
  };

  const createCredit = async (input) => {
    try {
      const credit = await createCreditService(input);
      await Promise.all([loadCashierData(), loadReceipts(), loadProducts(), refreshMenu()]);
      return credit;
    } catch (err) {
      // Error handling
      throw err;
    }
  };

  const settleCredit = async (input) => {
    try {
      const payment = await settleCreditService(input);
      await Promise.all([loadUnsettledCredits(), loadReceipts()]);
      return payment;
    } catch (err) {
      // Error handling
      throw err;
    }
  };

  const refundReceipt = async (input) => {
    try {
      const updated = await refundReceiptService(input);
      replaceReceipt(updated);
      setCashierQueue((prev) => prev.filter((r) => r.id !== updated.id));
      setOpenReceipts((prev) => prev.filter((r) => r.id !== updated.id));
      await Promise.all([loadProducts(), refreshMenu()]);
      return updated;
    } catch (err) {
      // Error handling
      throw err;
    }
  };

  // ── Summaries ─────────────────────────────────────────

  const getSummary = useCallback(() => {
    const todayReceipts = receipts.filter((r) => isToday(r.created_at));
    const totalSales   = todayReceipts
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.total, 0);
    const pendingCount = todayReceipts.filter((r) => r.status === "PENDING").length;
    const openCount    = todayReceipts.filter((r) => r.status === "OPEN").length;
    const creditCount  = todayReceipts.filter((r) => r.status === "CREDIT").length;
    const todayCount   = todayReceipts.length;
    return { totalSales, pendingCount, openCount, creditCount, todayCount };
  }, [receipts]);

  const getCashierSummary = useCallback(() => {
    const queueCount = cashierQueue.filter((r) => isToday(r.created_at)).length;
    const openCount  = openReceipts.filter((r) => isToday(r.created_at)).length;
    const paidToday  = receipts
      .filter((r) => isToday(r.created_at))
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
      deleteDraftReceipt,
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
