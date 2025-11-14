// app/context/ExpensesContext.jsx
import React, { createContext, useContext, useState } from "react";
import makeExpense from "../models/Expense";

const ExpensesContext = createContext();
export const useExpenses = () => useContext(ExpensesContext);

const normalizeName = (name = "") =>
  name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

/** format timestamp like "2025-02-11 14:45" */
const formatTimestampNow = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
};

/** simple ISO-style date portion used for "today" grouping (matches toDateString usage) */
const dateOnly = (d = new Date()) => d.toDateString();

export const ExpensesProvider = ({ children }) => {
  // demo / initial data: expenses (main tracking table) and payments (history table)
  const [expenses, setExpenses] = useState([
    // Sugar purchase (partially paid)
    makeExpense({
      product_id: "sugar",
      product_name: "Sugar",
      supplier: "Local Supplier",
      description: "Sugar - Local Supplier",
      quantity: 10,
      unit_price: 500,
      total_amount: 10 * 500,
      paid: 2000, // initial paid recorded on this expense
      date: dateOnly(), // date of creation (string)
      timestamp: formatTimestampNow(), // detailed timestamp (not shown on list except when expanded)
    }),

    // Flour purchase (fully paid)
    makeExpense({
      product_id: "flour",
      product_name: "Flour",
      supplier: "BigMill Ltd",
      description: "Flour - BigMill Ltd",
      quantity: 1,
      unit_price: 3000,
      total_amount: 1 * 3000,
      paid: 3000,
      date: dateOnly(),
      timestamp: formatTimestampNow(),
    }),
  ]);

  // payments: each item links to an expense.id (expense-level payment history)
  // format: { payment_id: "P-<ts>", expense_id: "<E-...>", product_id, amount: Number, paid_at: "YYYY-MM-DD HH:mm", note? }
  const [payments, setPayments] = useState([
    // If you want to reflect the sugar initial paid=2000 as a historical payment,
    // you can add a payment record here. For demo we leave payments empty.
  ]);

  /** Get or create product_id */
  const getOrCreateProductId = (product_name) => {
    const norm = normalizeName(product_name);
    if (!norm) return `P-${Date.now()}`;

    const found = expenses.find(
      (e) =>
        normalizeName(e.product_name) === norm ||
        normalizeName(e.description || "") === norm
    );

    return found ? found.product_id : norm;
  };

  /**
   * ➕ Add new expense entry (main tracking table)
   * expenseData: { product_name, supplier, description, quantity, unit_price, paid, total_amount (optional) }
   */
  const addExpense = (expenseData) => {
    const product_name =
      expenseData.product_name?.trim() ||
      expenseData.description ||
      "Product";

    const product_id =
      expenseData.product_id || getOrCreateProductId(product_name);

    const supplier = expenseData.supplier?.trim() || "";
    const q = Number(expenseData.quantity || 0);
    const up = Number(expenseData.unit_price || 0);
    const paid = Number(expenseData.paid || 0);

    const total_amount =
      Number(expenseData.total_amount) || Number(q * up) || 0;

    const ts = formatTimestampNow();
    const newExpense = makeExpense({
      product_id,
      product_name,
      supplier,
      description:
        expenseData.description ||
        `${product_name}${supplier ? " - " + supplier : ""}`,
      quantity: q,
      unit_price: up,
      total_amount,
      paid,
      date: dateOnly(), // searchable "day" string
      timestamp: ts, // detailed timestamp
    });

    setExpenses((prev) => [...prev, newExpense]);

    // If there's an initial paid amount and you want that recorded as a payment history
    // create a payment record as well (keeps tracking consistent).
    if (paid > 0) {
      const payment = {
        payment_id: `P-${Date.now()}`,
        expense_id: newExpense.id,
        product_id,
        amount: paid,
        paid_at: ts,
        note: "Initial recorded payment",
      };
      setPayments((prev) => [...prev, payment]);
    }

    return product_id;
  };

  /**
   * 💸 Pay balance for a specific expense entry.
   * IMPORTANT: this updates the existing expense entry (no new expense record)
   * and creates a payment record in `payments` for history.
   *
   * signature: payBalance(expenseId, amount, timestampOptional)
   */
  const payBalance = (expenseId, amount, timestamp) => {
    const val = Number(amount || 0);
    if (!expenseId || val <= 0) return null;

    // find the expense to update
    const entry = expenses.find((e) => e.id === expenseId);
    if (!entry) return null;

    // compute outstanding for this expense
    const outstanding = Math.max(Number(entry.total_amount || 0) - Number(entry.paid || 0), 0);
    if (val > outstanding) {
      // clamp to outstanding (you may choose to reject instead)
      // Here we clamp and still record only up to outstanding.
      // If you prefer to reject, return null or throw.
      // For now we clamp and proceed.
      // console.warn("Payment exceeds outstanding, clamping to outstanding amount.");
      // val = outstanding; // can't reassign const - create new var
    }

    const paidAt = timestamp || formatTimestampNow();

    // 1) update expense paid amount (immutable update)
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        // compute new paid but do not exceed total_amount
        const currentPaid = Number(e.paid || 0);
        const total = Number(e.total_amount || 0);
        const newPaidRaw = currentPaid + val;
        const newPaid = Math.min(newPaidRaw, total);
        return {
          ...e,
          paid: newPaid,
        };
      })
    );

    // 2) create a payment record in payments array
    const paymentRecord = {
      payment_id: `P-${Date.now()}`,
      expense_id: expenseId,
      product_id: entry.product_id,
      amount: val,
      paid_at: paidAt,
      note: "",
    };
    setPayments((prev) => [...prev, paymentRecord]);

    // return the new outstanding for convenience
    const newOutstanding = Math.max(Number(entry.total_amount || 0) - (Number(entry.paid || 0) + val), 0);
    return newOutstanding;
  };

  /** ❌ Delete an expense (tracking entry) */
  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    // keep payments for audit — optional: remove payments that reference this expense too if desired
  };

  /** Get all expenses for a product_id */
  const getExpensesByProduct = (product_id) =>
    expenses.filter((e) => e.product_id === product_id);

  /** Get payments for a specific expense entry */
  const getPaymentsByExpense = (expense_id) =>
    payments.filter((p) => p.expense_id === expense_id);

  /** product-level balance: sum(total_amount) - sum(paid) across expenses (we keep expense.paid updated) */
  const getProductBalance = (product_id) => {
    const group = expenses.filter((e) => e.product_id === product_id);
    if (!group.length) return 0;

    const total = group.reduce((s, e) => s + Number(e.total_amount || 0), 0);
    const paid = group.reduce((s, e) => s + Number(e.paid || 0), 0);

    return Math.max(total - paid, 0);
  };

  /**
   * Summary for today:
   * - totalExpense: sum of expenses created today (total_amount)
   * - totalPaid: sum of payments made today (payments.paid_at)
   * - totalOutstanding: sum across all products (total - paid)
   */
  const getTodaySummary = () => {
    const today = dateOnly();
    const totalExpense = expenses
      .filter((e) => e.date === today)
      .reduce((s, e) => s + Number(e.total_amount || 0), 0);

    const totalPaid = payments
      .filter((p) => {
        // payments.paid_at is "YYYY-MM-DD HH:mm" -> new Date(p.paid_at) works in modern JS but to be defensive:
        if (!p.paid_at) return false;
        const paidDate = new Date(p.paid_at.replace(" ", "T"));
        return dateOnly(paidDate) === today;
      })
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const outstandingMap = expenses.reduce((map, e) => {
      map[e.product_id] = map[e.product_id] || { total: 0, paid: 0 };
      map[e.product_id].total += Number(e.total_amount || 0);
      map[e.product_id].paid += Number(e.paid || 0);
      return map;
    }, {});

    const totalOutstanding = Object.values(outstandingMap).reduce(
      (s, g) => s + Math.max(g.total - g.paid, 0),
      0
    );

    return { totalExpense, totalPaid, totalOutstanding };
  };

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        payments,
        addExpense,
        payBalance,
        deleteExpense,
        getExpensesByProduct,
        getPaymentsByExpense,
        getProductBalance,
        getTodaySummary,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};

export default ExpensesProvider;
