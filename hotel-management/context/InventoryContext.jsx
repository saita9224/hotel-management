// context/InventoryContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import { useAuth } from "./AuthContext";

import {
  fetchProducts,
  fetchStockMovements,
  fetchPendingReconciliations,
  createProductService,
  addStockService,
  removeStockService,
  submitReconciliationService,
  approveReconciliationService,
  rejectReconciliationService,
} from "../services/inventoryService";

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [pendingReconciliations, setPendingReconciliations] = useState([]);
  const [loading, setLoading] = useState(false);

  const { isAuthenticated } = useAuth();

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
  // =====================================================

  const createProduct = async ({
    name,
    category,
    unit,
    quantity,
    reason,
    funded_by_business,
    notes,
  }) => {
    try {
      const result = await createProductService({ name, category, unit });
      const productId = result?.createProduct?.id;
      if (!productId) throw new Error("Product creation failed");

      if (quantity && Number(quantity) > 0) {
        await addStockService({
          product_id: productId,
          quantity: Number(quantity),
          reason: reason || "PURCHASE",
          funded_by_business: funded_by_business ?? true,
          notes: notes || null,
        });
      }

      await loadProducts();
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
        product_id: productId,
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
  // counts = [{ product_id, counted_quantity }]
  // Returns the created reconciliation records with differences.
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
  // CATEGORIES (derived)
  // =====================================================

  const categories = useMemo(() => {
    const unique = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(unique).sort()];
  }, [products]);

  // =====================================================
  // INIT
  // =====================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
      loadPendingReconciliations();
    }
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      products,
      categories,
      loading,
      pendingReconciliations,
      loadProducts,
      loadPendingReconciliations,
      createProduct,
      addStock,
      deductStock,
      getProductMovements,
      submitReconciliation,
      approveReconciliation,
      rejectReconciliation,
    }),
    [products, categories, loading, pendingReconciliations]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};