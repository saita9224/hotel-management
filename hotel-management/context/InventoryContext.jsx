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
  createProductService,
  addStockService,
  removeStockService,
} from "../services/inventoryService";

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
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
  // CREATE PRODUCT + INITIAL STOCK
  // =====================================================

  const createProduct = async ({
    name,
    category,
    unit,
    quantity,
    reason,
    funded_by_business,  // 👈 added
    notes,               // 👈 added
  }) => {
    try {
      // Step 1: create the product
      const result = await createProductService({ name, category, unit });
      const productId = result?.createProduct?.id;

      if (!productId) throw new Error("Product creation failed");

      // Step 2: add initial stock if quantity provided
      if (quantity && Number(quantity) > 0) {
        await addStockService({
          product_id: productId,
          quantity: Number(quantity),
          reason: reason || "PURCHASE",
          funded_by_business: funded_by_business ?? true,  // 👈 passed through
          notes: notes || null,                             // 👈 passed through
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

  const addStock = async (productId, quantity, reason, funded_by_business, notes) => {  // 👈 added funded_by_business
    try {
      await addStockService({
        product_id: productId,
        quantity,
        reason,
        funded_by_business: funded_by_business ?? true,  // 👈 passed through
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
      await removeStockService({
        product_id: productId,
        quantity,
        reason,
        notes,
      });
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
  // CATEGORIES (derived)
  // =====================================================

  const categories = useMemo(() => {
    const unique = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(unique).sort()];
  }, [products]);

  // =====================================================
  // INIT — wait for auth before loading
  // =====================================================

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
    }
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      products,
      categories,
      loading,
      loadProducts,
      createProduct,
      addStock,
      deductStock,
      getProductMovements,
    }),
    [products, categories, loading]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};