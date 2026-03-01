import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { graphqlRequest } from "../lib/graphql";

const ExpensesContext = createContext();

export const useExpenses = () => useContext(ExpensesContext);

export const ExpensesProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOAD EXPENSES
  // =====================================================
  const loadExpenses = async () => {
    try {
      setLoading(true);

      const data = await graphqlRequest(`
        query {
          allExpenses {
            id
            itemName
            quantity
            unitPrice
            totalPrice
            amountPaid
            balance
            isFullyPaid
            createdAt
            supplier { id name }
            product { id name }
          }
        }
      `);

      const normalized = (data?.allExpenses || []).map((e) => ({
        id: e.id,
        supplier_id: e.supplier?.id ?? null,
        supplier_name: e.supplier?.name ?? "",
        product_id: e.product?.id ?? null,
        product_name: e.product?.name ?? e.itemName,
        item_name: e.itemName,
        quantity: Number(e.quantity ?? 0),
        unit_price: Number(e.unitPrice ?? 0),
        total_price: Number(e.totalPrice ?? 0),
        amount_paid: Number(e.amountPaid ?? 0),
        balance: Number(e.balance ?? 0),
        is_fully_paid: e.isFullyPaid,
        created_at: e.createdAt,
      }));

      setExpenses(normalized);
    } catch (error) {
      console.log("Load Expenses Error:", error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // =====================================================
  // CREATE EXPENSE
  // =====================================================
  const createExpense = async (input) => {
    try {
      if (!input?.item_name) {
        throw new Error("Item name is required.");
      }

      if (!input?.quantity || !input?.unit_price) {
        throw new Error("Quantity and unit price are required.");
      }

      const formattedInput = {
        itemName: input.item_name.trim(),
        quantity: Number(input.quantity),
        unitPrice: Number(input.unit_price),

        // Hybrid supplier resolution
        supplierId: input.supplier_id || null,
        supplierName: input.supplier_name?.trim() || null,

        // Optional product
        productId: input.product_id || null,
      };

      await graphqlRequest(
        `
        mutation($data: ExpenseInput!) {
          createExpense(data: $data) {
            id
          }
        }
        `,
        { data: formattedInput }
      );

      await loadExpenses();
    } catch (error) {
      console.log("Create Expense Error:", error?.message || error);
      throw error;
    }
  };

  // =====================================================
  // PAY BALANCE
  // =====================================================
  const payBalance = async (expenseId, amount) => {
    try {
      if (!expenseId) {
        throw new Error("Expense ID is required.");
      }

      if (!amount || Number(amount) <= 0) {
        throw new Error("Payment amount must be greater than zero.");
      }

      await graphqlRequest(
        `
        mutation($data: PayBalanceInput!) {
          payBalance(data: $data) {
            id
            amountPaid
            balance
            isFullyPaid
          }
        }
        `,
        {
          data: {
            expenseId: expenseId,
            amount: Number(amount),
          },
        }
      );

      await loadExpenses();
    } catch (error) {
      console.log("Pay Balance Error:", error?.message || error);
      throw error;
    }
  };

  // =====================================================
  // SUMMARY HELPERS
  // =====================================================
  const getTodaySummary = () => {
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

  const getExpensesByProduct = (productId) => {
    return expenses.filter((e) => e.product_id === productId);
  };

  const value = useMemo(
    () => ({
      expenses,
      loading,
      loadExpenses,
      createExpense,
      payBalance,
      getTodaySummary,
      getExpensesByProduct,
    }),
    [expenses, loading]
  );

  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
};