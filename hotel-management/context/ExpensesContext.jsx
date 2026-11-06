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
import { enqueueMutation } from "../database/syncQueue";
import { ExpenseRepository } from "../database/repositories/expenseRepository";
import { ProductRepository } from "../database/repositories/productRepository";

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
      // Try to load from server first if online
      if (isOnline) {
        const [expenseData, paymentData] = await Promise.all([
          fetchAllExpenses(),
          fetchAllPayments(),
        ]);
        // Sync server data to local database
        for (const expense of expenseData) {
          const existing = await ExpenseRepository.findById(expense.id);
          if (existing) {
            await ExpenseRepository.update(expense.id, expense);
          } else {
            await ExpenseRepository.create({ ...expense, synced: true });
          }
        }
        setPayments(paymentData);
      }
      // Load from local database
      const localData = await ExpenseRepository.findAll();
      setExpenses(localData);
    } catch (error) {
      // Fallback to local data if server fails
      try {
        const localData = await ExpenseRepository.findAll();
        setExpenses(localData);
      } catch (localError) {
        console.error("Failed to load expenses from local database:", localError);
      }
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
      const total = Number(input.quantity) * Number(input.unit_price);
      const paid = input.amount_paid !== undefined ? Number(input.amount_paid) : total;
      const balance = Math.max(0, total - paid);
      const isFullyPaid = balance <= 0;

      const payload = {
        ...input,
        amount_paid: paid,
      };

      const { clientId } = await enqueueMutation("CREATE_EXPENSE", payload);
      await refreshQueueCount();
      
      let matchedProduct = null;
      if (!input.is_overhead) {
        try {
          const localProducts = await ProductRepository.findAll();
          const normName = String(input.item_name || "").trim().toLowerCase();
          matchedProduct = localProducts.find(
            (p) => p.name && p.name.trim().toLowerCase() === normName
          ) || null;
        } catch (e) {
          console.warn("Failed to match product locally:", e);
        }
      }

      const mockExpense = {
        id: clientId,
        product_id: matchedProduct?.id || null,
        item_name: input.item_name,
        quantity: Number(input.quantity),
        unit_price: Number(input.unit_price),
        total_price: total,
        amount_paid: paid,
        balance: balance,
        is_fully_paid: isFullyPaid,
        created_at: new Date().toISOString(),
        supplier_name: input.supplier_name || "",
      };
      
      // Store in local database
      await ExpenseRepository.create({
        id: clientId,
        product_id: matchedProduct?.id || null,
        item_name: input.item_name,
        quantity: Number(input.quantity),
        unit_price: Number(input.unit_price),
        total_price: total,
        amount_paid: paid,
        balance: balance,
        is_fully_paid: isFullyPaid,
        supplier_name: input.supplier_name || "",
        synced: false,
      });
      
      setExpenses((prev) => [mockExpense, ...prev]);
      return { expense: mockExpense, matchedProduct };
    }
    try {
      const result = await createExpenseService(input);
      
      // Store in local database
      await ExpenseRepository.create({
        ...result.expense,
        synced: true,
      });
      
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
      
      // Update local database
      await ExpenseRepository.updatePayment(expenseId, Number(amount));
      
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