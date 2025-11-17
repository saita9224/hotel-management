// app/context/InventoryContext.jsx
import React, { createContext, useContext, useState, useMemo } from "react";
import uuid from "react-native-uuid";

const InventoryContext = createContext();
export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([
    { id: "1", name: "Beef Fillet", category: "Butchery" },
    { id: "2", name: "Potatoes", category: "Vegetables" },
    { id: "3", name: "Cooking Oil", category: "Kitchen" },
  ]);

  const [transactions, setTransactions] = useState([
    { id: uuid.v4(), productId: "1", quantity: 15, date: "2025-11-01T10:00:00Z" },
    { id: uuid.v4(), productId: "2", quantity: 5, date: "2025-10-31T10:00:00Z" },
    { id: uuid.v4(), productId: "3", quantity: 12, date: "2025-10-29T10:00:00Z" },
  ]);

  // 🔹 Unique categories for auto-suggest
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products]
  );

  // ➕ Add new product
  const addProduct = ({ id, name, category }) => {
    setProducts((prev) => [...prev, { id, name, category }]);
  };

  const deleteItem = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) => prev.filter((t) => t.productId !== id));
  };

  const addStock = (productId, quantity) => {
    setTransactions((prev) => [
      ...prev,
      {
        id: uuid.v4(),
        productId,
        quantity: Math.abs(Number(quantity)),
        date: new Date().toISOString(),
      },
    ]);
  };

  const deductStock = (productId, quantity) => {
    const amount = Math.abs(Number(quantity));
    const available = getProductTotal(productId);

    if (amount > available) {
      return { ok: false, message: `Not enough stock. Available: ${available}` };
    }

    setTransactions((prev) => [
      ...prev,
      {
        id: uuid.v4(),
        productId,
        quantity: -amount,
        date: new Date().toISOString(),
      },
    ]);

    return { ok: true };
  };

  const getProductTransactions = (productId) =>
    transactions
      .filter((t) => t.productId === productId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

  const getProductTotal = (productId) =>
    getProductTransactions(productId).reduce((sum, t) => sum + t.quantity, 0);

  const inventory = useMemo(() => {
    return products.map((p) => {
      const trx = getProductTransactions(p.id);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        quantity: trx.reduce((sum, t) => sum + t.quantity, 0),
        updated: trx.length ? trx[trx.length - 1].date : "N/A",
      };
    });
  }, [products, transactions]);

  return (
    <InventoryContext.Provider
      value={{
        products,
        transactions,
        inventory,
        categories,
        addProduct,
        deleteItem,
        addStock,
        deductStock,
        getProductTotal,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export default InventoryContext;
