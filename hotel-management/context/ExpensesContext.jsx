// context/ExpensesContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { useMenu } from "./MenuContext";

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
        console.log("Menu refresh after expense product creation failed:", err);
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