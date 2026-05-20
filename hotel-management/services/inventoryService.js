// services/inventoryService.js

import { graphqlRequest } from "../lib/graphql";


// ======================================================
// NORMALIZERS
// ======================================================

const normalizeCategory = (c) => ({
  id:   c.id,
  name: c.name,
});

const normalizeProduct = (p) => ({
  id:                  p.id,
  name:                p.name,
  category:            p.category ? normalizeCategory(p.category) : null,
  unit:                p.unit,
  current_stock:       Number(p.currentStock ?? 0),
  auto_deduct_on_sale: p.autoDeductOnSale ?? false,
  created_at:          p.createdAt,
});

const normalizeMovement = (m) => ({
  id:           m.id,
  movement_type: m.movementType,
  reason:        m.reason,
  quantity:      Number(m.quantity ?? 0),
  notes:         m.notes || "",
  created_at:    m.createdAt,
  performed_by:  m.performedBy?.name || "Unknown",
});

const normalizeReconciliation = (r) => ({
  id:               r.id,
  product:          normalizeProduct(r.product),
  system_quantity:  Number(r.systemQuantity ?? 0),
  counted_quantity: Number(r.countedQuantity ?? 0),
  difference:       Number(r.difference ?? 0),
  status:           r.status,
  counted_at:       r.countedAt,
  counted_by:       r.countedBy?.name || "Unknown",
  notes:            r.notes || null,
});

// Category fields used in product queries
const CATEGORY_FIELDS = `
  category { id name }
`;

const PRODUCT_FIELDS = `
  id name unit currentStock autoDeductOnSale createdAt
  ${CATEGORY_FIELDS}
`;

const RECONCILIATION_FIELDS = `
  id
  product { ${PRODUCT_FIELDS} }
  systemQuantity
  countedQuantity
  difference
  status
  countedAt
  countedBy { name }
  notes
`;


// ======================================================
// FETCH ALL CATEGORIES
// ======================================================

export const fetchCategories = async () => {
  const data = await graphqlRequest(`
    query {
      categories {
        id
        name
      }
    }
  `);
  return (data?.categories || []).map(normalizeCategory);
};


// ======================================================
// CREATE CATEGORY
// ======================================================

export const createCategoryService = async (name) => {
  const data = await graphqlRequest(
    `
    mutation($input: CreateCategoryInput!) {
      createCategory(input: $input) {
        id
        name
      }
    }
  `,
    { input: { name: name.trim() } }
  );
  return normalizeCategory(data.createCategory);
};


// ======================================================
// SUGGEST CATEGORY BY PRODUCT NAME
// Called when item name has 3+ characters to auto-select
// the category based on existing products.
// ======================================================

export const suggestCategoryService = async (productName) => {
  if (!productName || productName.trim().length < 3) return null;

  const data = await graphqlRequest(
    `
    query($productName: String!) {
      suggestCategory(productName: $productName) {
        category { id name }
        matchedProductName
      }
    }
  `,
    { productName: productName.trim() }
  );

  if (!data?.suggestCategory) return null;

  return {
    category:             normalizeCategory(data.suggestCategory.category),
    matched_product_name: data.suggestCategory.matchedProductName,
  };
};


// ======================================================
// FETCH ALL PRODUCTS
// ======================================================

export const fetchProducts = async () => {
  const data = await graphqlRequest(`
    query {
      products {
        ${PRODUCT_FIELDS}
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
// Now sends categoryId instead of category string
// ======================================================

export const createProductService = async (input) => {
  return graphqlRequest(
    `
    mutation($input: CreateProductInput!) {
      createProduct(input: $input) {
        ${PRODUCT_FIELDS}
      }
    }
  `,
    {
      input: {
        name:               input.name,
        unit:               input.unit,
        categoryId:         input.category_id || null,
        autoDeductOnSale:   input.auto_deduct_on_sale ?? false,
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
        productId:      product_id,
        quantity:       Number(quantity),
        expenseItemId:  expense_item_id,
      },
    }
  );
};


// ======================================================
// CREATE PRODUCT WITH STOCK — ATOMIC
// Now sends categoryId instead of category string
// ======================================================

export const createProductWithStockService = async ({
  name,
  unit,
  category_id,
  quantity,
  expense_item_id,
  auto_deduct_on_sale,
}) => {
  return graphqlRequest(
    `
    mutation($input: CreateProductWithStockInput!) {
      createProductWithStock(input: $input) {
        ${PRODUCT_FIELDS}
      }
    }
  `,
    {
      input: {
        name:               name,
        unit:               unit,
        categoryId:         category_id || null,
        quantity:           Number(quantity),
        expenseItemId:      expense_item_id,
        autoDeductOnSale:   auto_deduct_on_sale ?? false,
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
        productId:         input.product_id,
        quantity:          Number(input.quantity),
        reason:            input.reason,
        fundedByBusiness:  input.funded_by_business ?? true,
        expenseItemId:     input.expense_item_id || null,
        notes:             input.notes || null,
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
        quantity:  Number(input.quantity),
        reason:    input.reason,
        notes:     input.notes || null,
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
          productId:       c.product_id,
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