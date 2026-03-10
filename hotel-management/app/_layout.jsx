// app/_layout.jsx

import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { InventoryProvider } from "../context/InventoryContext";
import { OrdersProvider } from "../context/OrdersContext";
import { ExpensesProvider } from "../context/ExpensesContext";

// --------------------------------------------------------
// ROUTE GUARD
// Runs after auth state is restored from AsyncStorage.
// Redirects to login if unauthenticated, to tabs if already
// authenticated and trying to access auth screens.
// Data providers are only mounted when authenticated —
// this prevents fetches firing without a token.
// --------------------------------------------------------

function RouteGuard({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // wait for session restore to finish

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in and trying to access protected route → login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Already logged in and on auth screen → tabs
      router.replace("/(tabs)");
    }
  }, [loading, isAuthenticated, segments]);

  // Show spinner while session is being restored from AsyncStorage
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Only mount data providers once authenticated —
  // prevents fetchAllExpenses / fetchProducts etc. firing without a token
  if (!isAuthenticated) {
    return <Slot />;
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
      <RouteGuard>
        <Slot />
      </RouteGuard>
    </AuthProvider>
  );
}