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
  fetchUnpricedInventoryItems,
  createMenuItemService,
  updateMenuItemService,
  deleteMenuItemService,
} from "../services/menuService";

const MenuContext = createContext();
export const useMenu = () => useContext(MenuContext);

export const MenuProvider = ({ children }) => {
  const [menuItems, setMenuItems]           = useState([]);
  const [unpricedItems, setUnpricedItems]   = useState([]);
  const [loading, setLoading]               = useState(false);

  // frequentItems — available, price > 0, pinned first then by order_count
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
      const [items, unpriced] = await Promise.all([
        fetchAllMenuItems(),
        fetchUnpricedInventoryItems(),
      ]);
      setMenuItems(items);
      setUnpricedItems(unpriced);
    } catch (err) {
      console.log("MenuContext load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const createMenuItem = async (input) => {
    const item = await createMenuItemService(input);
    setMenuItems((prev) => [...prev, item]);
    // Remove from unpriced list if it was there
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
    // If price was updated from 0, remove from unpriced list
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
  };

  useEffect(() => {
    refreshMenu();
  }, []);

  const value = useMemo(
    () => ({
      menuItems,
      frequentItems,
      unpricedItems,
      loading,
      refreshMenu,
      createMenuItem,
      updateMenuItem,
      deleteMenuItem,
    }),
    [menuItems, frequentItems, unpricedItems, loading]
  );

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};