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
  auto_deduct_on_sale: p.autoDeductOnSale ?? false,
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

const normalizeReconciliation = (r) => ({
  id: r.id,
  product: normalizeProduct(r.product),
  system_quantity: Number(r.systemQuantity ?? 0),
  counted_quantity: Number(r.countedQuantity ?? 0),
  difference: Number(r.difference ?? 0),
  status: r.status,
  counted_at: r.countedAt,
  counted_by: r.countedBy?.name || "Unknown",
  notes: r.notes || null,
});

const RECONCILIATION_FIELDS = `
  id
  product {
    id name category unit currentStock autoDeductOnSale createdAt
  }
  systemQuantity
  countedQuantity
  difference
  status
  countedAt
  countedBy { name }
  notes
`;


// ======================================================
// FETCH ALL PRODUCTS
// ======================================================

export const fetchProducts = async () => {
  const data = await graphqlRequest(`
    query {
      products {
        id name category unit currentStock autoDeductOnSale createdAt
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
        id movementType reason quantity notes createdAt
        performedBy { name }
      }
    }
  `,
    { productId }
  );
  return (data?.stockMovements || []).map(normalizeMovement);
};


// ======================================================
// FETCH PENDING RECONCILIATIONS
// ======================================================

export const fetchPendingReconciliations = async () => {
  const data = await graphqlRequest(`
    query {
      pendingReconciliations {
        ${RECONCILIATION_FIELDS}
      }
    }
  `);
  return (data?.pendingReconciliations || []).map(normalizeReconciliation);
};


// ======================================================
// CREATE PRODUCT (standalone — no stock)
// ======================================================

export const createProductService = async (input) => {
  return graphqlRequest(
    `
    mutation($input: CreateProductInput!) {
      createProduct(input: $input) {
        id name category unit currentStock autoDeductOnSale createdAt
      }
    }
  `,
    {
      input: {
        name: input.name,
        unit: input.unit,
        category: input.category || null,
        autoDeductOnSale: input.auto_deduct_on_sale ?? false,
      },
    }
  );
};


// ======================================================
// ADD STOCK FROM EXPENSE — ATOMIC
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
        id movementType reason quantity createdAt
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
// CREATE PRODUCT WITH STOCK — ATOMIC
// ======================================================

export const createProductWithStockService = async ({
  name,
  unit,
  category,
  quantity,
  expense_item_id,
  auto_deduct_on_sale,
}) => {
  return graphqlRequest(
    `
    mutation($input: CreateProductWithStockInput!) {
      createProductWithStock(input: $input) {
        id name unit currentStock autoDeductOnSale
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
        autoDeductOnSale: auto_deduct_on_sale ?? false,
      },
    }
  );
};


// ======================================================
// ADD STOCK (IN)
// ======================================================

export const addStockService = async (input) => {
  return graphqlRequest(
    `
    mutation($input: AddStockInput!) {
      addStock(input: $input) {
        id movementType reason quantity createdAt
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
        id movementType reason quantity createdAt
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


// ======================================================
// SUBMIT STOCK RECONCILIATION (BULK)
// ======================================================

export const submitReconciliationService = async (counts) => {
  const data = await graphqlRequest(
    `
    mutation($input: SubmitReconciliationInput!) {
      submitReconciliation(input: $input) {
        ${RECONCILIATION_FIELDS}
      }
    }
  `,
    {
      input: {
        counts: counts.map((c) => ({
          productId: c.product_id,
          countedQuantity: Number(c.counted_quantity),
        })),
      },
    }
  );
  return (data?.submitReconciliation || []).map(normalizeReconciliation);
};


// ======================================================
// APPROVE RECONCILIATION
// ======================================================

export const approveReconciliationService = async (reconciliationId) => {
  const data = await graphqlRequest(
    `
    mutation($reconciliationId: ID!) {
      approveReconciliation(reconciliationId: $reconciliationId) {
        ${RECONCILIATION_FIELDS}
      }
    }
  `,
    { reconciliationId }
  );
  return normalizeReconciliation(data.approveReconciliation);
};


// ======================================================
// REJECT RECONCILIATION
// ======================================================

export const rejectReconciliationService = async (reconciliationId, notes) => {
  const data = await graphqlRequest(
    `
    mutation($reconciliationId: ID!, $notes: String) {
      rejectReconciliation(reconciliationId: $reconciliationId, notes: $notes) {
        ${RECONCILIATION_FIELDS}
      }
    }
  `,
    { reconciliationId, notes: notes || null }
  );
  return normalizeReconciliation(data.rejectReconciliation);
};