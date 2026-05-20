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

import {
  fetchProducts,
  fetchCategories,
  fetchStockMovements,
  fetchPendingReconciliations,
  createProductService,
  createCategoryService,
  addStockService,
  removeStockService,
  submitReconciliationService,
  approveReconciliationService,
  rejectReconciliationService,
} from "../services/inventoryService";

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const [products,               setProducts]               = useState([]);
  const [serverCategories,       setServerCategories]       = useState([]);
  const [pendingReconciliations, setPendingReconciliations] = useState([]);
  const [loading,                setLoading]                = useState(false);

  const { isAuthenticated } = useAuth();
  const { refreshMenu }     = useMenu();

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.log("Load Products Error:", error);
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
      console.log("Load Categories Error:", error);
    }
  };

  // =====================================================
  // CREATE CATEGORY
  // =====================================================

  const createCategory = async (name) => {
    try {
      const cat = await createCategoryService(name);
      // Append immediately so the UI updates without a full reload
      setServerCategories((prev) => [...prev, cat].sort((a, b) =>
        a.name.localeCompare(b.name)
      ));
      return cat;
    } catch (error) {
      console.log("Create Category Error:", error);
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
      console.log("Load Reconciliations Error:", error);
    }
  };

  // =====================================================
  // CREATE PRODUCT + INITIAL STOCK
  // category_id is now passed instead of a string
  // =====================================================

  const createProduct = async ({
    name,
    category_id,
    unit,
    quantity,
    reason,
    funded_by_business,
    notes,
    auto_deduct_on_sale,
  }) => {
    try {
      const result = await createProductService({
        name,
        category_id,
        unit,
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
      });

      const productId = result?.createProduct?.id;
      if (!productId) throw new Error("Product creation failed");

      if (quantity && Number(quantity) > 0) {
        await addStockService({
          product_id:         productId,
          quantity:           Number(quantity),
          reason:             reason || "PURCHASE",
          funded_by_business: funded_by_business ?? true,
          notes:              notes || null,
        });
      }

      await loadProducts();

      if (auto_deduct_on_sale) {
        await refreshMenu();
      }

      return productId;
    } catch (error) {
      console.log("Create Product Error:", error);
      throw error;
    }
  };

  // =====================================================
  // ADD STOCK
  // =====================================================

  const addStock = async (productId, quantity, reason, funded_by_business, notes) => {
    try {
      await addStockService({
        product_id:         productId,
        quantity,
        reason,
        funded_by_business: funded_by_business ?? true,
        notes,
      });
      await loadProducts();
    } catch (error) {
      console.log("Add Stock Error:", error);
      throw error;
    }
  };

  // =====================================================
  // DEDUCT STOCK
  // =====================================================

  const deductStock = async (productId, quantity, reason, notes) => {
    try {
      await removeStockService({ product_id: productId, quantity, reason, notes });
      await loadProducts();
    } catch (error) {
      console.log("Deduct Stock Error:", error);
      throw error;
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
      console.log("Submit Reconciliation Error:", error);
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
      console.log("Approve Reconciliation Error:", error);
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
      console.log("Reject Reconciliation Error:", error);
      throw error;
    }
  };

  // =====================================================
  // FILTER CATEGORIES — derived from products for the
  // inventory list pill filter ("All", "Beverages", ...)
  // Separate from serverCategories which is used in forms.
  // =====================================================

  const categories = useMemo(() => {
    const unique = new Set(
      products
        .map((p) => p.category?.name)
        .filter(Boolean)
    );
    return ["All", ...Array.from(unique).sort()];
  }, [products]);

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

  const value = useMemo(
    () => ({
      products,
      categories,
      serverCategories,   // full { id, name } objects for forms
      loading,
      pendingReconciliations,
      loadProducts,
      loadCategories,
      createCategory,
      loadPendingReconciliations,
      createProduct,
      addStock,
      deductStock,
      getProductMovements,
      submitReconciliation,
      approveReconciliation,
      rejectReconciliation,
    }),
    [products, categories, serverCategories, loading, pendingReconciliations]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};