// services/inventoryService.js

import { graphqlRequest } from "../lib/graphql";


// ======================================================
// NORMALIZERS
// ======================================================

const normalizeProduct = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category || "Uncategorized",
  unit: p.unit,
  current_stock: Number(p.currentStock ?? 0),
  created_at: p.createdAt,
});

const normalizeMovement = (m) => ({
  id: m.id,
  movement_type: m.movementType,
  reason: m.reason,
  quantity: Number(m.quantity ?? 0),
  notes: m.notes || "",
  created_at: m.createdAt,
  performed_by: m.performedBy?.name || "Unknown",
});


// ======================================================
// FETCH ALL PRODUCTS
// ======================================================

export const fetchProducts = async () => {
  const data = await graphqlRequest(`
    query {
      products {
        id
        name
        category
        unit
        currentStock
        createdAt
      }
    }
  `);
  return (data?.products || []).map(normalizeProduct);
};


// ======================================================
// FETCH STOCK MOVEMENTS FOR A PRODUCT
// ======================================================

export const fetchStockMovements = async (productId) => {
  const data = await graphqlRequest(
    `
    query($productId: ID) {
      stockMovements(productId: $productId) {
        id
        movementType
        reason
        quantity
        notes
        createdAt
        performedBy { name }
      }
    }
  `,
    { productId }
  );
  return (data?.stockMovements || []).map(normalizeMovement);
};


// ======================================================
// CREATE PRODUCT (standalone — no stock)
// ======================================================

export const createProductService = async (input) => {
  return graphqlRequest(
    `
    mutation($input: CreateProductInput!) {
      createProduct(input: $input) {
        id
        name
        category
        unit
        currentStock
        createdAt
      }
    }
  `,
    { input }
  );
};


// ======================================================
// ADD STOCK FROM EXPENSE — ATOMIC (matched product flow)
// Links existing expense to existing product in one transaction.
// If it fails, no partial record is left behind.
// ======================================================

export const addStockFromExpenseService = async ({
  product_id,
  quantity,
  expense_item_id,
}) => {
  return graphqlRequest(
    `
    mutation($input: AddStockFromExpenseInput!) {
      addStockFromExpense(input: $input) {
        id
        movementType
        reason
        quantity
        createdAt
      }
    }
  `,
    {
      input: {
        productId: product_id,
        quantity: Number(quantity),
        expenseItemId: expense_item_id,
      },
    }
  );
};


// ======================================================
// CREATE PRODUCT WITH STOCK — ATOMIC (new product flow)
// One mutation = one transaction. If stock fails,
// the product is also rolled back.
// ======================================================

export const createProductWithStockService = async ({
  name,
  unit,
  category,
  quantity,
  expense_item_id,
}) => {
  return graphqlRequest(
    `
    mutation($input: CreateProductWithStockInput!) {
      createProductWithStock(input: $input) {
        id
        name
        unit
        currentStock
      }
    }
  `,
    {
      input: {
        name,
        unit,
        category,
        quantity: Number(quantity),
        expenseItemId: expense_item_id,
      },
    }
  );
};


// ======================================================
// ADD STOCK (IN) — general purpose
// ======================================================

export const addStockService = async (input) => {
  return graphqlRequest(
    `
    mutation($input: AddStockInput!) {
      addStock(input: $input) {
        id
        movementType
        reason
        quantity
        createdAt
      }
    }
  `,
    {
      input: {
        productId: input.product_id,
        quantity: Number(input.quantity),
        reason: input.reason,
        fundedByBusiness: input.funded_by_business ?? true,
        expenseItemId: input.expense_item_id || null,
        notes: input.notes || null,
      },
    }
  );
};


// ======================================================
// REMOVE STOCK (OUT)
// ======================================================

export const removeStockService = async (input) => {
  return graphqlRequest(
    `
    mutation($input: RemoveStockInput!) {
      removeStock(input: $input) {
        id
        movementType
        reason
        quantity
        createdAt
      }
    }
  `,
    {
      input: {
        productId: input.product_id,
        quantity: Number(input.quantity),
        reason: input.reason,
        notes: input.notes || null,
      },
    }
  );
};