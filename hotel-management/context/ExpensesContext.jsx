// context/ExpensesContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { useMenu } from "./MenuContext";
import { useOffline } from "./OfflineContext";
import { enqueueMutation } from "../lib/offlineQueue";

import {
  fetchAllExpenses,
  fetchAllPayments,
  fetchSuppliers,
  fetchExpensesBySupplier,
  fetchExpensesByItem,
  fetchExpensesByProduct,
  fetchExpenseDetails,
  createExpenseService,
  payBalanceService,
} from "../services/expenseService";

const ExpensesContext = createContext();

export const useExpenses = () => useContext(ExpensesContext);

export const ExpensesProvider = ({ children }) => {
  const [expenses, setExpenses]   = useState([]);
  const [payments, setPayments]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(false);

  const { refreshMenu } = useMenu();
  const { isOnline, refreshQueueCount } = useOffline();

  // =====================================================
  // LOAD ALL EXPENSES + PAYMENTS
  // =====================================================

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const [expenseData, paymentData] = await Promise.all([
        fetchAllExpenses(),
        fetchAllPayments(),
      ]);
      setExpenses(expenseData);
      setPayments(paymentData);
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD SUPPLIERS
  // =====================================================

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (error) {
      // Error handling
    }
  };

  // =====================================================
  // SEARCH FUNCTIONS
  // =====================================================

  const getExpensesBySupplier = async (supplierId) =>
    await fetchExpensesBySupplier(supplierId);

  const getExpensesByItem = async (itemName) =>
    await fetchExpensesByItem(itemName);

  const getExpensesByProduct = async (productId) =>
    await fetchExpensesByProduct(productId);

  const getExpenseDetails = async (expenseId) =>
    await fetchExpenseDetails(expenseId);

  // =====================================================
  // CREATE EXPENSE
  // =====================================================

  const createExpense = async (input) => {
    if (!isOnline) {
      await enqueueMutation("CREATE_EXPENSE", input);
      await refreshQueueCount();
      const mockExpense = {
        id: `offline-${Date.now()}`,
        item_name: input.item_name,
        quantity: Number(input.quantity),
        unit_price: Number(input.unit_price),
        total_price: Number(input.quantity) * Number(input.unit_price),
        amount_paid: Number(input.quantity) * Number(input.unit_price),
        balance: 0,
        is_fully_paid: true,
        created_at: new Date().toISOString(),
        supplier_name: input.supplier_name || "",
      };
      setExpenses((prev) => [mockExpense, ...prev]);
      return { expense: mockExpense, matchedProduct: null };
    }
    try {
      const result = await createExpenseService(input);
      await loadExpenses();
      return result;
    } catch (error) {
      throw error;
    }
  };

  // =====================================================
  // PAY BALANCE
  // =====================================================

  const payBalance = async (expenseId, amount) => {
    if (!isOnline) {
      await enqueueMutation("PAY_BALANCE", { expenseId, amount });
      await refreshQueueCount();
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expenseId
            ? { ...e, amount_paid: e.amount_paid + Number(amount), balance: Math.max(0, e.balance - Number(amount)) }
            : e
        )
      );
      return;
    }
    try {
      await payBalanceService(expenseId, amount);
      await loadExpenses();
    } catch (error) {
      throw error;
    }
  };

  // =====================================================
  // NOTIFY MENU — called by ExpenseForm after a new
  // product is created via the expense flow with
  // auto_deduct_on_sale=True, so it immediately appears
  // in the Menu Manager's unpriced list.
  // =====================================================

  const notifyMenuOfNewProduct = async (auto_deduct_on_sale) => {
    if (auto_deduct_on_sale) {
      try {
        await refreshMenu();
      } catch (err) {
        // Error handling
      }
    }
  };

  // =====================================================
  // SUMMARY HELPERS
  // =====================================================

  const getExpensesSummary = () => {
    const totalExpense     = expenses.reduce((sum, e) => sum + e.total_price, 0);
    const totalPaid        = expenses.reduce((sum, e) => sum + e.amount_paid, 0);
    const totalOutstanding = expenses.reduce((sum, e) => sum + e.balance, 0);
    return { totalExpense, totalPaid, totalOutstanding };
  };

  // =====================================================
  // INIT
  // =====================================================

  useEffect(() => {
    loadExpenses();
    loadSuppliers();
  }, []);

  const value = useMemo(
    () => ({
      expenses,
      payments,
      suppliers,
      loading,
      loadExpenses,
      loadSuppliers,
      getExpensesBySupplier,
      getExpensesByItem,
      getExpensesByProduct,
      getExpenseDetails,
      createExpense,
      payBalance,
      notifyMenuOfNewProduct,
      getExpensesSummary,
    }),
    [expenses, payments, suppliers, loading]
  );

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
};