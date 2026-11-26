// context/InventoryContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { useAuth } from "./AuthContext";
import { useMenu } from "./MenuContext";
import { useOffline } from "./OfflineContext";
import { enqueueMutation } from "../database/syncQueue";
import { ProductRepository } from "../database/repositories/productRepository";

import {
  fetchProducts,
  fetchCategories,
  fetchStockMovements,
  fetchPendingReconciliations,
  createProductService,
  createCategoryService,
  addStockService,
  removeStockService,
  addStockFromExpenseService,
  createProductWithStockService,
  submitReconciliationService,
  approveReconciliationService,
  rejectReconciliationService,
  createProductPackagingService,
  deleteProductPackagingService,
} from "../services/inventoryService";

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

const isNetworkError = (error) =>
  /network|failed to fetch|timed?\s*out|unreachable/i.test(String(error?.message || ""));

// Resolve a packaging label to its base-unit factor using the
// product's cached packagings. Returns 1 when no packaging.
const packagingFactor = (product, packagingLabel) => {
  if (!packagingLabel) return 1;
  const pk = (product?.packagings || []).find(
    (p) => String(p.label).toLowerCase() === String(packagingLabel).toLowerCase()
  );
  return pk ? Number(pk.quantity_in_base) || 1 : 1;
};

export const InventoryProvider = ({ children }) => {
  const [products,               setProducts]               = useState([]);
  const [serverCategories,       setServerCategories]       = useState([]);
  const [pendingReconciliations, setPendingReconciliations] = useState([]);
  const [loading,                setLoading]                = useState(false);

  const { isAuthenticated } = useAuth();
  const { refreshMenu }     = useMenu();
  const { isOnline, isSyncing, refreshQueueCount } = useOffline();

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Try to load from server first if online
      if (isOnline) {
        try {
          const data = await fetchProducts();
          const localProducts = await ProductRepository.findAll();
          for (const product of data) {
            const normName = String(product.name || "").trim().toLowerCase();
            const prodIdStr = String(product.id);

            const matches = localProducts.filter(
              (p) =>
                String(p.id) === prodIdStr ||
                (p.name && p.name.trim().toLowerCase() === normName)
            );

            // Server is source of truth EXCEPT for records with pending
            // local changes (offline stock moves / creations) — never
            // clobber or purge those during a pull.
            const syncedMatches = matches.filter((p) => p.synced !== false);

            if (syncedMatches.length > 0) {
              const primary =
                syncedMatches.find((p) => String(p.id) === prodIdStr) || syncedMatches[0];
              await ProductRepository.update(primary.id, {
                ...product,
                synced: true,
              });

              // Purge extra duplicate local records from WatermelonDB SQLite
              for (const extra of syncedMatches) {
                if (extra.id !== primary.id) {
                  await ProductRepository.delete(extra.id);
                }
              }
            } else {
              await ProductRepository.create({ ...product, synced: true });
            }
          }
        } catch (serverError) {
          console.warn("Failed to fetch products from server:", serverError);
        }
      }

      // Load from local database and deduplicate
      const localData = await ProductRepository.findAll();
      const seenNames = new Map();
      const seenIds = new Set();
      const uniqueProductsList = [];
      const duplicatesToDelete = [];

      for (const p of localData) {
        const normName = String(p.name || "").trim().toLowerCase();
        const pIdStr = String(p.id).toLowerCase();

        const duplicateByName = normName ? seenNames.get(normName) : null;
        const duplicateById = seenIds.has(pIdStr);

        if (!duplicateByName && !duplicateById) {
          if (normName) seenNames.set(normName, p);
          seenIds.add(pIdStr);
          uniqueProductsList.push(p);
        } else {
          const existing = duplicateByName;
          if (existing) {
            if (p.synced && !existing.synced) {
              duplicatesToDelete.push(existing.id);
              const idx = uniqueProductsList.indexOf(existing);
              if (idx !== -1) uniqueProductsList[idx] = p;
              if (normName) seenNames.set(normName, p);
              seenIds.add(pIdStr);
            } else {
              duplicatesToDelete.push(p.id);
            }
          } else {
            duplicatesToDelete.push(p.id);
          }
        }
      }

      for (const dupId of duplicatesToDelete) {
        try {
          await ProductRepository.delete(dupId);
        } catch (e) {
          console.warn("Error purging duplicate product record:", dupId, e);
        }
      }

      setProducts(uniqueProductsList);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD CATEGORIES FROM BACKEND
  // =====================================================

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setServerCategories(data);
    } catch (error) {
      // Error handling
    }
  };

  // =====================================================
  // CREATE CATEGORY
  // =====================================================

  const createCategory = async (name) => {
    const enqueueOffline = async () => {
      const item = await enqueueMutation("CREATE_CATEGORY", { name });
      await refreshQueueCount();
      const mockCategory = { id: item.clientId, name: name.trim() };
      setServerCategories((prev) => [...prev, mockCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return mockCategory;
    };

    if (!isOnline) {
      return enqueueOffline();
    }
    try {
      const cat = await createCategoryService(name);
      setServerCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      return cat;
    } catch (error) {
      const msg = String(error?.message || "");
      const isNetworkError =
        !isOnline ||
        /network|failed to fetch|timed?\s*out|unreachable/i.test(msg);
      if (isNetworkError) {
        return enqueueOffline();
      }
      throw error;
    }
  };

  // =====================================================
  // LOAD PENDING RECONCILIATIONS
  // =====================================================

  const loadPendingReconciliations = async () => {
    try {
      const data = await fetchPendingReconciliations();
      setPendingReconciliations(data);
    } catch (error) {
      // Error handling
    }
  };

  // =====================================================
  // CREATE PRODUCT + INITIAL STOCK
  // =====================================================

  const createProduct = async (args, forceOffline = false) => {
    const {
      name,
      category_id,
      unit,
      quantity,
      reason,
      funded_by_business,
      notes,
      auto_deduct_on_sale,
      packaging_def,   // { label, quantity_in_base, is_purchase_unit, is_sale_unit } | null
      stock_unit,       // packaging label the quantity is expressed in | null = base
    } = args;
    const pkgFactor = packaging_def && stock_unit === packaging_def.label
      ? Number(packaging_def.quantity_in_base) || 1
      : 1;
    const baseQty = Number(quantity || 0) * pkgFactor;
    if (forceOffline || !isOnline) {
      const { clientId } = await enqueueMutation("CREATE_PRODUCT", {
        name,
        category_id,
        unit,
        quantity: baseQty, // base units — packaging defs aren't synced for new offline products
        reason,
        funded_by_business,
        notes,
        auto_deduct_on_sale,
      });
      await refreshQueueCount();
      
      const mockProduct = {
        id: clientId,
        name,
        category: serverCategories.find((c) => c.id === category_id) || null,
        unit,
        current_stock: baseQty,
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
        packagings: packaging_def
          ? [{
              id: `local-${Date.now()}`,
              label: packaging_def.label,
              quantity_in_base: Number(packaging_def.quantity_in_base) || 1,
              is_purchase_unit: Boolean(packaging_def.is_purchase_unit),
              is_sale_unit: Boolean(packaging_def.is_sale_unit),
            }]
          : [],
        created_at: new Date().toISOString(),
      };
      
      // Store in local database
      await ProductRepository.create({
        id: clientId,
        name,
        category_id,
        unit,
        current_stock: baseQty,
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
        packagings: mockProduct.packagings,
        synced: false,
      });
      
      setProducts((prev) => [mockProduct, ...prev]);
      return clientId;
    }
    try {
      const result = await createProductService({
        name,
        category_id,
        unit,
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
      });

      const productId = result?.createProduct?.id;
      if (!productId) throw new Error("Product creation failed");

      // Define packaging BEFORE the stock add so the backend can
      // resolve the packaging label on addStock.
      if (packaging_def?.label) {
        try {
          await createProductPackagingService({
            product_id:        productId,
            label:             packaging_def.label,
            quantity_in_base:  packaging_def.quantity_in_base,
            is_purchase_unit:  packaging_def.is_purchase_unit,
            is_sale_unit:      packaging_def.is_sale_unit,
          });
        } catch (pkgErr) {
          console.warn("Packaging creation failed (stock will use base units):", pkgErr?.message);
        }
      }

      if (quantity && Number(quantity) > 0) {
        await addStockService({
          product_id:         productId,
          quantity:           Number(quantity),
          reason:             reason || "PURCHASE",
          funded_by_business: funded_by_business ?? true,
          notes:              notes || null,
          packaging:          stock_unit || null,
        });
      }

      await loadProducts();

      if (auto_deduct_on_sale) {
        await refreshMenu();
      }

      return productId;
    } catch (error) {
      if (isNetworkError(error)) return createProduct(args, true);
      throw error;
    }
  };

  // =====================================================
  // ADD STOCK
  // =====================================================

  const addStock = async (productId, quantity, reason, funded_by_business, notes, packaging = null, forceOffline = false) => {
    const product = products.find((p) => String(p.id) === String(productId));
    const factor = packagingFactor(product, packaging);
    const baseQty = Number(quantity) * factor;
    if (forceOffline || !isOnline) {
      await enqueueMutation("ADD_STOCK", {
        product_id: productId,
        quantity: Number(quantity),
        reason,
        funded_by_business,
        notes,
        packaging: packaging || null,
      });
      await refreshQueueCount();
      
      // Update local database (stock is stored in base units)
      await ProductRepository.updateStock(productId, baseQty);
      
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, current_stock: p.current_stock + baseQty }
            : p
        )
      );
      return;
    }
    try {
      await addStockService({
        product_id:         productId,
        quantity,
        reason,
        funded_by_business: funded_by_business ?? true,
        notes,
        packaging:          packaging || null,
      });
      await loadProducts();
    } catch (error) {
      if (isNetworkError(error)) return addStock(productId, quantity, reason, funded_by_business, notes, packaging, true);
      throw error;
    }
  };

  // =====================================================
  // DEDUCT STOCK
  // =====================================================

  const deductStock = async (productId, quantity, reason, notes, packaging = null, forceOffline = false) => {
    const product = products.find((p) => String(p.id) === String(productId));
    const factor = packagingFactor(product, packaging);
    const baseQty = Number(quantity) * factor;
    if (forceOffline || !isOnline) {
      await enqueueMutation("REMOVE_STOCK", {
        product_id: productId,
        quantity: Number(quantity),
        reason,
        notes,
        packaging: packaging || null,
      });
      await refreshQueueCount();
      
      // Update local database (stock is stored in base units)
      await ProductRepository.updateStock(productId, -baseQty);
      
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, current_stock: Math.max(0, p.current_stock - baseQty) }
            : p
        )
      );
      return;
    }
    try {
      await removeStockService({ product_id: productId, quantity, reason, notes, packaging: packaging || null });
      await loadProducts();
    } catch (error) {
      if (isNetworkError(error)) return deductStock(productId, quantity, reason, notes, packaging, true);
      throw error;
    }
  };

  // =====================================================
  // SEARCH PRODUCTS (for recipe ingredient picker)
  // =====================================================

  const searchProducts = async (search, { autoDeductOnly = false } = {}) => {
    try {
      // Use cached products state which includes both server and local DB products.
      // This ensures offline-created products are searchable before they sync.
      let filtered = products ?? [];

      // Client-side search filter
      if (search && search.trim()) {
        const query = search.trim().toLowerCase();
        filtered = filtered.filter((p) =>
          p.name?.toLowerCase().includes(query) ||
          p.category?.name?.toLowerCase().includes(query)
        );
      }

      // Filter by auto_deduct_on_sale if requested
      if (autoDeductOnly) {
        filtered = filtered.filter((p) => p.auto_deduct_on_sale);
      }

      return filtered.slice(0, 50); // Limit results
    } catch (error) {
      console.error("Failed to search products:", error);
      return [];
    }
  };

  // =====================================================
  // GET MOVEMENTS FOR A PRODUCT
  // =====================================================

  const getProductMovements = async (productId) => {
    return await fetchStockMovements(productId);
  };

  // =====================================================
  // SUBMIT RECONCILIATION
  // =====================================================

  const submitReconciliation = async (counts) => {
    try {
      const results = await submitReconciliationService(counts);
      await loadPendingReconciliations();
      return results;
    } catch (error) {
      throw error;
    }
  };

  // =====================================================
  // APPROVE RECONCILIATION
  // =====================================================

  const approveReconciliation = async (reconciliationId) => {
    try {
      const result = await approveReconciliationService(reconciliationId);
      await Promise.all([loadProducts(), loadPendingReconciliations()]);
      return result;
    } catch (error) {
      throw error;
    }
  };

  // =====================================================
  // REJECT RECONCILIATION
  // =====================================================

  const rejectReconciliation = async (reconciliationId, notes) => {
    try {
      const result = await rejectReconciliationService(reconciliationId, notes);
      await loadPendingReconciliations();
      return result;
    } catch (error) {
      throw error;
    }
  };

  // =====================================================
  // ENRICH PRODUCTS — WatermelonDB only stores
  // category_id, so resolve the display name from
  // serverCategories here.
  // =====================================================

  const enrichedProducts = useMemo(() => {
    return products.map((p) => {
      if (!p.category?.id || p.category.name) return p;
      const match = serverCategories.find(
        (c) => String(c.id) === String(p.category.id)
      );
      return match
        ? { ...p, category: { ...p.category, name: match.name } }
        : p;
    });
  }, [products, serverCategories]);

  // =====================================================
  // FILTER CATEGORIES — derived from products for the
  // inventory list pill filter ("All", "Beverages", ...)
  // Separate from serverCategories which is used in forms.
  // =====================================================

  const categories = useMemo(() => {
    const unique = new Set(
      enrichedProducts
        .map((p) => p.category?.name)
        .filter(Boolean)
    );
    return ["All", ...Array.from(unique).sort()];
  }, [enrichedProducts]);

  // =====================================================
  // INIT
  // =====================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
      loadCategories();
      loadPendingReconciliations();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && isOnline && !isSyncing) {
      loadProducts();
      loadCategories();
    }
  }, [isAuthenticated, isOnline, isSyncing]);

  // =====================================================
  // ADD STOCK FROM EXPENSE
  // =====================================================

  const addStockFromExpense = async ({ product_id, quantity, expense_item_id, packaging = null }, forceOffline = false) => {
    const product = products.find((p) => String(p.id) === String(product_id));
    const factor = packagingFactor(product, packaging);
    const baseQty = Number(quantity) * factor;
    if (forceOffline || !isOnline) {
      await enqueueMutation("ADD_STOCK_FROM_EXPENSE", {
        product_id,
        quantity: Number(quantity),
        expense_item_id,
        packaging: packaging || null,
      });
      await refreshQueueCount();

      await ProductRepository.updateStock(product_id, baseQty);

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product_id
            ? { ...p, current_stock: p.current_stock + baseQty }
            : p
        )
      );
      return;
    }
    try {
      await addStockFromExpenseService({
        product_id,
        quantity,
        expense_item_id,
        packaging: packaging || null,
      });
      await loadProducts();
    } catch (error) {
      if (isNetworkError(error)) return addStockFromExpense({ product_id, quantity, expense_item_id, packaging }, true);
      throw error;
    }
  };

  // =====================================================
  // CREATE PRODUCT WITH STOCK
  // =====================================================

  const createProductWithStock = async (args, forceOffline = false) => {
    const {
      name,
      unit,
      category_id,
      quantity,
      expense_item_id,
      auto_deduct_on_sale,
      packaging,
    } = args;
    if (forceOffline || !isOnline) {
      const { clientId } = await enqueueMutation("CREATE_PRODUCT_WITH_STOCK", {
        name,
        unit,
        category_id,
        quantity: Number(quantity),
        expense_item_id,
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
        packaging: packaging || null,
      });
      await refreshQueueCount();

      const mockProduct = {
        id: clientId,
        name,
        category: serverCategories.find((c) => c.id === category_id) || null,
        unit,
        current_stock: Number(quantity || 0),
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
        created_at: new Date().toISOString(),
      };

      await ProductRepository.create({
        id: clientId,
        name,
        category_id,
        unit,
        current_stock: Number(quantity || 0),
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
        synced: false,
      });

      setProducts((prev) => [mockProduct, ...prev]);
      return clientId;
    }
    try {
      const result = await createProductWithStockService({
        name,
        unit,
        category_id,
        quantity,
        expense_item_id,
        auto_deduct_on_sale,
        packaging: packaging || null,
      });
      await loadProducts();
      return result;
    } catch (error) {
      if (isNetworkError(error)) return createProductWithStock(args, true);
      throw error;
    }
  };

  // =====================================================
  // PRODUCT PACKAGING (unit conversion)
  // =====================================================

  const createPackaging = async (productId, { label, quantity_in_base, is_purchase_unit, is_sale_unit }) => {
    const result = await createProductPackagingService({
      product_id:        productId,
      label,
      quantity_in_base,
      is_purchase_unit,
      is_sale_unit,
    });
    await loadProducts();
    return result;
  };

  const deletePackaging = async (packagingId) => {
    await deleteProductPackagingService(packagingId);
    await loadProducts();
  };

  const value = useMemo(
    () => ({
      products: enrichedProducts,
      categories,
      serverCategories,   // full { id, name } objects for forms
      loading,
      pendingReconciliations,
      loadProducts,
      loadCategories,
      createCategory,
      loadPendingReconciliations,
      createProduct,
      createProductWithStock,
      addStock,
      addStockFromExpense,
      deductStock,
      searchProducts,
      getProductMovements,
      submitReconciliation,
      approveReconciliation,
      rejectReconciliation,
      createPackaging,
      deletePackaging,
    }),
    [enrichedProducts, categories, serverCategories, loading, pendingReconciliations]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
