// services/menuService.js

import { graphqlRequest } from "../lib/graphql";


// ── Normalizers ──────────────────────────────────────────

const normalizeMenuItem = (m) => ({
  id:            m.id,
  name:          m.name,
  emoji:         m.emoji,
  price:         Number(m.price ?? 0),
  is_available:  m.isAvailable,
  is_pinned:     m.isPinned,
  has_inventory: m.hasInventory,
  product_id:    m.productId ?? null,
});

const normalizeUnpricedProduct = (p) => ({
  product_id:   p.productId,
  product_name: p.productName,
  unit:         p.unit ?? "",
});

const MENU_ITEM_FIELDS = `
  id
  name
  emoji
  price
  isAvailable
  isPinned
  hasInventory
  productId
`;


// ── Queries ──────────────────────────────────────────────

export const fetchMenuItems = async () => {
  const data = await graphqlRequest(`
    query {
      menuItems {
        ${MENU_ITEM_FIELDS}
      }
    }
  `);
  return (data?.menuItems ?? []).map(normalizeMenuItem);
};

export const fetchAllMenuItems = async () => {
  const data = await graphqlRequest(`
    query {
      allMenuItems {
        ${MENU_ITEM_FIELDS}
      }
    }
  `);
  return (data?.allMenuItems ?? []).map(normalizeMenuItem);
};

export const fetchUnpricedInventoryItems = async () => {
  const data = await graphqlRequest(`
    query {
      unpricedInventoryItems {
        productId
        productName
        unit
      }
    }
  `);
  return (data?.unpricedInventoryItems ?? []).map(normalizeUnpricedProduct);
};


// ── Mutations ─────────────────────────────────────────────

export const createMenuItemService = async ({
  name,
  emoji,
  price,
  is_pinned  = false,
  product_id = null,
}) => {
  const data = await graphqlRequest(
    `mutation($input: CreateMenuItemInput!) {
      createMenuItem(input: $input) {
        ${MENU_ITEM_FIELDS}
      }
    }`,
    {
      input: {
        name,
        emoji,
        price:     Number(price),
        isPinned:  is_pinned,
        productId: product_id ? String(product_id) : null,
      },
    }
  );
  return normalizeMenuItem(data.createMenuItem);
};

export const updateMenuItemService = async ({
  item_id,
  name         = null,
  emoji        = null,
  price        = null,
  is_pinned    = null,
  is_available = null,
}) => {
  const data = await graphqlRequest(
    `mutation($input: UpdateMenuItemInput!) {
      updateMenuItem(input: $input) {
        ${MENU_ITEM_FIELDS}
      }
    }`,
    {
      input: {
        itemId:      String(item_id),
        name,
        emoji,
        price:       price !== null ? Number(price) : null,
        isPinned:    is_pinned,
        isAvailable: is_available,
      },
    }
  );
  return normalizeMenuItem(data.updateMenuItem);
};

export const deleteMenuItemService = async (itemId) => {
  const data = await graphqlRequest(
    `mutation($itemId: ID!) {
      deleteMenuItem(itemId: $itemId)
    }`,
    { itemId: String(itemId) }
  );
  return data.deleteMenuItem;
};