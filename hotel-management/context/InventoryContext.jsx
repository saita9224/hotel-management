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
  const { isOnline, refreshQueueCount } = useOffline();

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Try to load from server first if online
      if (isOnline) {
        const data = await fetchProducts();
        // Sync server data to local database
        for (const product of data) {
          const existing = await ProductRepository.findById(product.id);
          if (existing) {
            await ProductRepository.update(product.id, product);
          } else {
            await ProductRepository.create({ ...product, synced: true });
          }
        }
      }
      // Load from local database
      const localData = await ProductRepository.findAll();
      setProducts(localData);
    } catch (error) {
      // Fallback to local data if server fails
      try {
        const localData = await ProductRepository.findAll();
        setProducts(localData);
      } catch (localError) {
        console.error("Failed to load products from local database:", localError);
      }
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
    if (!isOnline) {
      const item = await enqueueMutation("CREATE_CATEGORY", { name });
      await refreshQueueCount();
      const mockCategory = { id: item.clientId, name: name.trim() };
      setServerCategories((prev) => [...prev, mockCategory].sort((a, b) => a.name.localeCompare(b.name)));
      return mockCategory;
    }
    try {
      const cat = await createCategoryService(name);
      setServerCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      return cat;
    } catch (error) {
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
    if (!isOnline) {
      const { clientId } = await enqueueMutation("CREATE_PRODUCT", {
        name,
        category_id,
        unit,
        quantity,
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
        current_stock: Number(quantity || 0),
        auto_deduct_on_sale: auto_deduct_on_sale ?? false,
        created_at: new Date().toISOString(),
      };
      
      // Store in local database
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
      throw error;
    }
  };

  // =====================================================
  // ADD STOCK
  // =====================================================

  const addStock = async (productId, quantity, reason, funded_by_business, notes) => {
    if (!isOnline) {
      await enqueueMutation("ADD_STOCK", {
        product_id: productId,
        quantity: Number(quantity),
        reason,
        funded_by_business,
        notes,
      });
      await refreshQueueCount();
      
      // Update local database
      await ProductRepository.updateStock(productId, Number(quantity));
      
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, current_stock: p.current_stock + Number(quantity) }
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
      });
      await loadProducts();
    } catch (error) {
      throw error;
    }
  };

  // =====================================================
  // DEDUCT STOCK
  // =====================================================

  const deductStock = async (productId, quantity, reason, notes) => {
    if (!isOnline) {
      await enqueueMutation("REMOVE_STOCK", {
        product_id: productId,
        quantity: Number(quantity),
        reason,
        notes,
      });
      await refreshQueueCount();
      
      // Update local database
      await ProductRepository.updateStock(productId, -Number(quantity));
      
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, current_stock: Math.max(0, p.current_stock - Number(quantity)) }
            : p
        )
      );
      return;
    }
    try {
      await removeStockService({ product_id: productId, quantity, reason, notes });
      await loadProducts();
    } catch (error) {
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