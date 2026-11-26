// utils/permissions.js
// Permission checking utilities for role-based UI gating.

/**
 * Check if user has a specific permission.
 * @param {string[]} permissions - Array of permission strings from AuthContext
 * @param {string} required - Required permission string (e.g., "pos.manage_menu")
 * @returns {boolean}
 */
export const hasPermission = (permissions, required) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return permissions.includes(required);
};

/**
 * Check if user has ANY of the specified permissions.
 * @param {string[]} permissions - Array of permission strings
 * @param {string[]} required - Array of permission strings to check
 * @returns {boolean}
 */
export const hasAnyPermission = (permissions, required) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return required.some((perm) => permissions.includes(perm));
};

/**
 * Check if user has ALL of the specified permissions.
 * @param {string[]} permissions - Array of permission strings
 * @param {string[]} required - Array of permission strings to check
 * @returns {boolean}
 */
export const hasAllPermissions = (permissions, required) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return required.every((perm) => permissions.includes(perm));
};

// Common permission constants
export const PERMISSIONS = {
  POS_VIEW_ORDERS: "pos.view_orders",
  POS_MANAGE_MENU: "pos.manage_menu",
  INVENTORY_PRODUCT_VIEW: "inventory.product.view",
  INVENTORY_PRODUCT_MANAGE: "inventory.product.manage",
};
