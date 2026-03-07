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
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOAD ALL EXPENSES
  // =====================================================

  const loadExpenses = async () => {
    try {
      setLoading(true);

      const data = await fetchAllExpenses();

      setExpenses(data);

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

  const getExpensesBySupplier = async (supplierId) => {
    return await fetchExpensesBySupplier(supplierId);
  };

  const getExpensesByItem = async (itemName) => {
    return await fetchExpensesByItem(itemName);
  };

  const getExpensesByProduct = async (productId) => {
    return await fetchExpensesByProduct(productId);
  };

  const getExpenseDetails = async (expenseId) => {
    return await fetchExpenseDetails(expenseId);
  };

  // =====================================================
  // CREATE EXPENSE
  // =====================================================

  const createExpense = async (input) => {
    try {
      await createExpenseService(input);
      await loadExpenses();
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
  // SUMMARY HELPERS
  // =====================================================

  const getExpensesSummary = () => {
    const totalExpense = expenses.reduce(
      (sum, e) => sum + e.total_price,
      0
    );

    const totalPaid = expenses.reduce(
      (sum, e) => sum + e.amount_paid,
      0
    );

    const totalOutstanding = expenses.reduce(
      (sum, e) => sum + e.balance,
      0
    );

    return {
      totalExpense,
      totalPaid,
      totalOutstanding,
    };
  };

  // =====================================================
  // INIT LOAD
  // =====================================================

  useEffect(() => {
    loadExpenses();
    loadSuppliers();
  }, []);

  const value = useMemo(
    () => ({
      expenses,
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
    }),
    [expenses, suppliers, loading]
  );

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
};