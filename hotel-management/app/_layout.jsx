import { Slot } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { InventoryProvider } from "../context/InventoryContext";
import { OrdersProvider } from "../context/OrdersContext";
import { ExpensesProvider } from "../context/ExpensesContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <OrdersProvider>
          <ExpensesProvider>
            <Slot />
          </ExpensesProvider>
        </OrdersProvider>
      </InventoryProvider>
    </AuthProvider>
  );
}