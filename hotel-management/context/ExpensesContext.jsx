// context/ExpensesContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

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
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOAD ALL EXPENSES + PAYMENTS (always together)
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
      console.log("Load Expenses Error:", error);
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
      console.log("Load Suppliers Error:", error);
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
    try {
      const result = await createExpenseService(input);
      await loadExpenses();
      return result;
    } catch (error) {
      console.log("Create Expense Error:", error);
      throw error;
    }
  };

  // =====================================================
  // PAY BALANCE
  // =====================================================

  const payBalance = async (expenseId, amount) => {
    try {
      await payBalanceService(expenseId, amount);
      await loadExpenses();
    } catch (error) {
      console.log("Pay Balance Error:", error);
      throw error;
    }
  };

  // =====================================================
  // DAILY PAYMENTS SUMMARY
  // Groups payments by paid_at date (not purchase date).
  // A balance paid today on a yesterday's expense
  // correctly appears under today.
  // =====================================================

  const getPaymentsByDate = useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      const day = new Date(p.paid_at).toDateString(); // "Mon Mar 10 2026"
      if (!map[day]) {
        map[day] = {
          date: new Date(p.paid_at),
          dateString: day,
          payments: [],
          total: 0,
        };
      }
      map[day].payments.push(p);
      map[day].total += p.amount;
    });
    // Sort days descending — today first
    return Object.values(map).sort((a, b) => b.date - a.date);
  }, [payments]);

  // =====================================================
  // TODAY'S TOTAL (payment-based, not purchase-based)
  // =====================================================

  const getTodayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return payments
      .filter((p) => new Date(p.paid_at).toDateString() === today)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  // =====================================================
  // OVERALL SUMMARY (still useful for supplier debts tab)
  // =====================================================

  const getExpensesSummary = () => {
    const totalExpense = expenses.reduce((sum, e) => sum + e.total_price, 0);
    const totalPaid = expenses.reduce((sum, e) => sum + e.amount_paid, 0);
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
      getExpensesSummary,
      getPaymentsByDate,   // grouped by paid_at for daily view
      getTodayTotal,       // today's cash out (payment-based)
    }),
    [expenses, payments, suppliers, loading, getPaymentsByDate, getTodayTotal]
  );

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
};