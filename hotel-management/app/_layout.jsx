// app/_layout.jsx
import { Stack } from "expo-router";
import { InventoryProvider } from "./context/InventoryContext";
import { OrdersProvider } from "./context/OrdersContext";
import ExpensesProvider from "./context/ExpensesContext"; // ✅ add this import

export default function RootLayout() {
  return (
    <InventoryProvider>
      <OrdersProvider>
        <ExpensesProvider>
          <Stack>
            {/* Tabs (main navigation) */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            {/* Standalone pages */}
            <Stack.Screen
              name="add-item"
              options={{
                title: "Add New Item",
                headerShown: true,
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="deduct-item"
              options={{
                title: "Deduct Item",
                headerShown: true,
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="add-expenses"
              options={{
                title: "Add Expense",
                headerShown: true,
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="PayBalanceModal"
              options={{
                title: "Pay Balance",
                presentation: "modal", // ✅ replaces old modal route
                headerShown: true,
              }}
            />
          </Stack>
        </ExpensesProvider>
      </OrdersProvider>
    </InventoryProvider>
  );
}
