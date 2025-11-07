import React, { createContext, useContext, useState } from 'react';

// Create the context
const InventoryContext = createContext();

// Custom hook for using the inventory easily
export const useInventory = () => useContext(InventoryContext);

// Provider component
export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState([
    { id: '1', name: 'Beef Fillet', quantity: 15, category: 'Butchery', updated: 'Nov 1, 2025' },
    { id: '2', name: 'Potatoes', quantity: 5, category: 'Vegetables', updated: 'Oct 31, 2025' },
    { id: '3', name: 'Cooking Oil', quantity: 12, category: 'Kitchen', updated: 'Oct 29, 2025' },
  ]);

  // ➕ Add Item
  const addItem = (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      updated: new Date().toDateString(),
    };
    setInventory((prev) => [...prev, newItem]);
  };

  // ➖ Deduct Quantity
  const deductItem = (id, amount) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(item.quantity - amount, 0), updated: new Date().toDateString() }
          : item
      )
    );
  };

  // ❌ Delete Item
  const deleteItem = (id) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <InventoryContext.Provider value={{ inventory, addItem, deductItem, deleteItem }}>
      {children}
    </InventoryContext.Provider>
  );
};

// ✅ Default export (fixes the warning and undefined context issue)
export default InventoryContext;
