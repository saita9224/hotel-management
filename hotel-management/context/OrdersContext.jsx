// context/OrdersContext.jsx
import React, { createContext, useContext, useState } from "react";
import { useInventory } from "./InventoryContext"; // optional: if you have this context

// Create context
const OrdersContext = createContext();

// Custom hook
export const useOrders = () => useContext(OrdersContext);

// Provider component
export const OrdersProvider = ({ children }) => {
  const { deductItem } = useInventory?.() || {}; // ✅ Safe call if InventoryContext missing
  const [orders, setOrders] = useState([]);

  // Add a new order
  const addOrder = (orderData) => {
    const newOrder = {
      id: `ORD-${Date.now()}`,
      employee: orderData.employee || "John Doe",
      date: new Date().toDateString(),
      items: orderData.items,
      total: orderData.items.reduce(
        (sum, item) => sum + item.price * item.qty,
        0
      ),
      type: orderData.type,
      table: orderData.table || null,
    };

    setOrders((prev) => [...prev, newOrder]);

    // Deduct inventory if context exists
    if (deductItem) {
      newOrder.items.forEach((item) => deductItem(item.id, item.qty));
    }
  };

  // Delete order
  const deleteOrder = (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // Retrieve today’s orders
  const getTodayOrders = () => {
    const today = new Date().toDateString();
    return orders.filter((o) => o.date === today);
  };

  return (
    <OrdersContext.Provider value={{ orders, addOrder, deleteOrder, getTodayOrders }}>
      {children}
    </OrdersContext.Provider>
  );
};

// ✅ Default export (required by Expo Router)
export default OrdersProvider;
