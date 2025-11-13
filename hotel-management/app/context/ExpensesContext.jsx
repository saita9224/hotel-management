// app/context/ExpensesContext.jsx
import React, { createContext, useContext, useState } from "react";
import makeExpense from "../models/Expense";

const ExpensesContext = createContext();
export const useExpenses = () => useContext(ExpensesContext);

export const ExpensesProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([
    makeExpense({
      product_id: "sugar",
      group_id: "G-sugar-local-supplier",
      description: "Sugar - Local Supplier",
      supplier: "Local Supplier",
      quantity: 10,
      unit_price: 500,
      paid: 2000,
      date: new Date().toDateString(),
    }),
    makeExpense({
      product_id: "sugar",
      group_id: "G-sugar-local-supplier",
      description: "Payment",
      total_amount: 0,
      paid: 1000,
      date: new Date().toDateString(),
    }),
    makeExpense({
      product_id: "flour",
      group_id: "G-flour-bigmill-ltd",
      description: "Flour - BigMill Ltd",
      supplier: "BigMill Ltd",
      quantity: 1,
      unit_price: 3000,
      paid: 3000,
      date: new Date().toDateString(),
    }),
  ]);

  // ➕ Add a new expense
  const addExpense = (expenseData) => {
    // Derive product_id and supplier cleanly
    const rawDescription = expenseData.description || "";
    const parts = rawDescription.split("-");
    const product_id =
      expenseData.product_id ||
      parts[0]?.trim().toLowerCase().replace(/\s+/g, "-") ||
      `P-${Date.now()}`;
    const supplier =
      expenseData.supplier || parts[1]?.trim() || "Unknown Supplier";

    // Generate group_id automatically from product + supplier
    const group_id = `G-${product_id}-${supplier
      .toLowerCase()
      .replace(/\s+/g, "-")}`;

    const q = Number(expenseData.quantity || 0);
    const up = Number(expenseData.unit_price || 0);
    const paid = Number(expenseData.paid || 0);
    const total = Number(expenseData.total_amount ?? q * up);

    const newExpense = makeExpense({
      product_id,
      group_id,
      supplier,
      description: rawDescription || "Expense",
      total_amount: total,
      paid,
      quantity: q,
      unit_price: up,
      date: new Date().toDateString(),
    });

    setExpenses((prev) => [...prev, newExpense]);
    return group_id;
  };

  // 💸 Pay balance for a specific group
  const payBalance = (group_id, amount) => {
    const pay = Number(amount);
    if (!group_id || pay <= 0) return null;

    const payment = makeExpense({
      group_id,
      description: "Payment",
      total_amount: 0,
      paid: pay,
      date: new Date().toDateString(),
    });

    setExpenses((prev) => [...prev, payment]);
    return getGroupBalance(group_id);
  };

  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const getExpensesByGroup = (group_id) =>
    expenses.filter((e) => e.group_id === group_id);

  const getExpensesByProduct = (product_id) =>
    expenses.filter((e) => e.product_id === product_id);

  const getGroupBalance = (group_id) => {
    const group = expenses.filter((e) => e.group_id === group_id);
    if (!group.length) return 0;
    const total = group.reduce((s, e) => s + Number(e.total_amount || 0), 0);
    const paid = group.reduce((s, e) => s + Number(e.paid || 0), 0);
    return Math.max(total - paid, 0);
  };

  const getTodaySummary = () => {
    const today = new Date().toDateString();
    const todayEntries = expenses.filter((e) => e.date === today);
    const totalExpense = todayEntries.reduce((s, e) => s + (e.total_amount || 0), 0);
    const totalPaid = todayEntries.reduce((s, e) => s + (e.paid || 0), 0);

    const outstanding = expenses.reduce((map, e) => {
      map[e.group_id] = map[e.group_id] || { total: 0, paid: 0 };
      map[e.group_id].total += Number(e.total_amount || 0);
      map[e.group_id].paid += Number(e.paid || 0);
      return map;
    }, {});
    const totalOutstanding = Object.values(outstanding).reduce(
      (s, g) => s + Math.max(g.total - g.paid, 0),
      0
    );

    return { totalExpense, totalPaid, totalOutstanding };
  };

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        addExpense,
        payBalance,
        deleteExpense,
        getExpensesByGroup,
        getExpensesByProduct,
        getGroupBalance,
        getTodaySummary,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};

export default ExpensesProvider;
