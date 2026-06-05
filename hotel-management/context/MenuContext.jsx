// context/MenuContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

import {
  fetchAllMenuItems,
  fetchMenuCategories,
  fetchUnpricedInventoryItems,
  createMenuCategoryService,
  createMenuItemService,
  updateMenuItemService,
  deleteMenuItemService,
} from "../services/menuService";

const MenuContext = createContext();
export const useMenu = () => useContext(MenuContext);

const DEFAULT_MENU_CATEGORIES = [
  { key: "food",   name: "Food",   item_count: 0 },
  { key: "drinks", name: "Drinks", item_count: 0 },
  { key: "snacks", name: "Snacks", item_count: 0 },
  { key: "other",  name: "Other",  item_count: 0 },
];

export const MenuProvider = ({ children }) => {
  const [menuItems, setMenuItems]         = useState([]);
  const [unpricedItems, setUnpricedItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState(DEFAULT_MENU_CATEGORIES);
  const [loading, setLoading]             = useState(false);

  // frequentItems — available, price > 0, pinned first then by order_count.
  // Derives from menuItems so it's always in sync without a separate fetch.
  const frequentItems = useMemo(() => {
    return [...menuItems]
      .filter((m) => m.is_available && m.price > 0)
      .sort((a, b) => {
        if (b.is_pinned !== a.is_pinned) return b.is_pinned ? 1 : -1;
        return (b.order_count ?? 0) - (a.order_count ?? 0);
      })
      .slice(0, 12);
  }, [menuItems]);

  const refreshMenu = async () => {
    try {
      setLoading(true);
      const [items, unpriced, categories] = await Promise.all([
        fetchAllMenuItems(),
        fetchUnpricedInventoryItems(),
        fetchMenuCategories(),
      ]);
      // Defensive: guarantee arrays even if the service returns null/undefined
      setMenuItems(Array.isArray(items) ? items : []);
      setUnpricedItems(Array.isArray(unpriced) ? unpriced : []);
      setMenuCategories(Array.isArray(categories) && categories.length ? categories : DEFAULT_MENU_CATEGORIES);
    } catch (err) {
      console.error("MenuContext load error:", err);
      // Keep existing state on error rather than blowing up the UI
    } finally {
      setLoading(false);
    }
  };

  const createMenuItem = async (input) => {
    const item = await createMenuItemService(input);
    setMenuItems((prev) => [...prev, item]);
    await refreshMenu();
    if (input.product_id) {
      setUnpricedItems((prev) =>
        prev.filter((p) => String(p.product_id) !== String(input.product_id))
      );
    }
    return item;
  };

  const updateMenuItem = async (input) => {
    const updated = await updateMenuItemService(input);
    setMenuItems((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
    await refreshMenu();
    if (updated.price > 0 && updated.product_id) {
      setUnpricedItems((prev) =>
        prev.filter((p) => String(p.product_id) !== String(updated.product_id))
      );
    }
    return updated;
  };

  const deleteMenuItem = async (itemId) => {
    await deleteMenuItemService(itemId);
    setMenuItems((prev) => prev.filter((m) => m.id !== String(itemId)));
    await refreshMenu();
  };

  const createMenuCategory = async (name) => {
    const category = await createMenuCategoryService(name);
    await refreshMenu();
    return category;
  };

  useEffect(() => {
    refreshMenu();
  }, []);

  const value = useMemo(
    () => ({
      menuItems,
      frequentItems,
      unpricedItems,
      menuCategories,
      loading,
      refreshMenu,
      createMenuCategory,
      createMenuItem,
      updateMenuItem,
      deleteMenuItem,
    }),
    [menuItems, frequentItems, unpricedItems, menuCategories, loading]
  );

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};
