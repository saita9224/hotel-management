// services/expenseService.js

import { graphqlRequest } from "../lib/graphql";


// ======================================================
// NORMALIZERS
// ======================================================

const normalizeExpense = (e) => ({
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
});

const normalizePayment = (p) => ({
  id: p.id,
  expense_id: p.expenseId,
  amount: Number(p.amount ?? 0),
  paid_at: p.paidAt,
  item_name: p.itemName,
  supplier_name: p.supplierName,
  expense_total: Number(p.expenseTotal ?? 0),
});


// ======================================================
// FETCH ALL EXPENSES
// ======================================================

export const fetchAllExpenses = async () => {
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
  return (data?.allExpenses || []).map(normalizeExpense);
};


// ======================================================
// FETCH ALL PAYMENTS
// Used by the frontend to group payments by paid_at date
// so that balance payments made today on old expenses
// appear under today's total, not the purchase date.
// ======================================================

export const fetchAllPayments = async () => {
  const data = await graphqlRequest(`
    query {
      allPayments {
        id
        expenseId
        amount
        paidAt
        itemName
        supplierName
        expenseTotal
      }
    }
  `);
  return (data?.allPayments || []).map(normalizePayment);
};


// ======================================================
// FETCH SUPPLIERS
// ======================================================

export const fetchSuppliers = async () => {
  const data = await graphqlRequest(`
    query {
      suppliers {
        id
        name
      }
    }
  `);
  return data?.suppliers || [];
};


// ======================================================
// FETCH EXPENSES BY SUPPLIER
// ======================================================

export const fetchExpensesBySupplier = async (supplierId) => {
  const data = await graphqlRequest(
    `
    query($supplierId: Int!) {
      expensesBySupplier(supplierId: $supplierId) {
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
  `,
    { supplierId }
  );
  return (data?.expensesBySupplier || []).map(normalizeExpense);
};


// ======================================================
// FETCH EXPENSES BY ITEM NAME
// ======================================================

export const fetchExpensesByItem = async (itemName) => {
  const data = await graphqlRequest(
    `
    query($itemName: String!) {
      expensesByItem(itemName: $itemName) {
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
  `,
    { itemName }
  );
  return (data?.expensesByItem || []).map(normalizeExpense);
};


// ======================================================
// FETCH EXPENSES BY PRODUCT
// ======================================================

export const fetchExpensesByProduct = async (productId) => {
  const data = await graphqlRequest(
    `
    query($productId: Int!) {
      expensesByProduct(productId: $productId) {
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
  `,
    { productId }
  );
  return (data?.expensesByProduct || []).map(normalizeExpense);
};


// ======================================================
// EXPENSE DETAILS
// ======================================================

export const fetchExpenseDetails = async (expenseId) => {
  const data = await graphqlRequest(
    `
    query($expenseId: Int!) {
      expenseDetails(expenseId: $expenseId) {
        remainingBalance
        expense {
          id
          itemName
          quantity
          unitPrice
          totalPrice
          createdAt
          supplier { id name }
          product { id name }
        }
        payments {
          id
          amount
          paidAt
          itemName
          supplierName
          expenseTotal
        }
      }
    }
  `,
    { expenseId: parseInt(expenseId, 10) }
  );
  return data?.expenseDetails;
};


// ======================================================
// CREATE EXPENSE
// ======================================================

export const createExpenseService = async (input) => {
  if (!input?.item_name) throw new Error("Item name is required");
  if (!input?.quantity || !input?.unit_price)
    throw new Error("Quantity and unit price are required");

  const formattedInput = {
    itemName: input.item_name.trim(),
    quantity: Number(input.quantity),
    unitPrice: Number(input.unit_price),
    supplierId: input.supplier_id ? parseInt(input.supplier_id, 10) : null,
    supplierName: input.supplier_name?.trim() || null,
    productId: input.product_id ? parseInt(input.product_id, 10) : null,
  };

  const data = await graphqlRequest(
    `
    mutation($data: ExpenseInput!) {
      createExpense(data: $data) {
        expense {
          id
          itemName
          quantity
          totalPrice
          amountPaid
          balance
          isFullyPaid
          createdAt
          supplier { id name }
        }
        matchedProduct {
          id
          name
          unit
          currentStock
        }
      }
    }
  `,
    { data: formattedInput }
  );

  const raw = data?.createExpense;

  return {
    expense: raw?.expense
      ? normalizeExpense({ ...raw.expense, itemName: raw.expense.itemName })
      : null,
    matchedProduct: raw?.matchedProduct
      ? {
          id: raw.matchedProduct.id,
          name: raw.matchedProduct.name,
          unit: raw.matchedProduct.unit,
          current_stock: Number(raw.matchedProduct.currentStock ?? 0),
        }
      : null,
  };
};


// ======================================================
// PAY BALANCE
// ======================================================

export const payBalanceService = async (expenseId, amount) => {
  if (!expenseId) throw new Error("Expense ID is required");
  if (!amount || Number(amount) <= 0)
    throw new Error("Payment must be greater than zero");

  return graphqlRequest(
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
        expenseId: parseInt(expenseId, 10),
        amount: Number(amount),
      },
    }
  );
};