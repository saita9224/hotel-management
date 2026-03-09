// app/_layout.jsx

import { Slot } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { InventoryProvider } from "../context/InventoryContext";
import { OrdersProvider } from "../context/OrdersContext";
import { ExpensesProvider } from "../context/ExpensesContext";
import { View, ActivityIndicator } from "react-native";

// Gate: don't render data providers until auth is restored
function AppProviders({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <InventoryProvider>
      <OrdersProvider>
        <ExpensesProvider>
          {children}
        </ExpensesProvider>
      </OrdersProvider>
    </InventoryProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProviders>
        <Slot />
      </AppProviders>
    </AuthProvider>
  );
}