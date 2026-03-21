// app/_layout.jsx

import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth }       from "../context/AuthContext";
import { MenuProvider }                from "../context/MenuContext";
import { InventoryProvider }           from "../context/InventoryContext";
import { POSProvider }                 from "../context/POSContext";
import { ExpensesProvider }            from "../context/ExpensesContext";
import { HRProvider }                  from "../context/HRContext";

function RouteGuard({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuthenticated && !inAuthGroup) router.replace("/(auth)/login");
    else if (isAuthenticated && inAuthGroup) router.replace("/(tabs)");
  }, [loading, isAuthenticated, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <Slot />;

  return (
    <MenuProvider>
      <InventoryProvider>
        <POSProvider>
          <ExpensesProvider>
            <HRProvider>
              {children}
            </HRProvider>
          </ExpensesProvider>
        </POSProvider>
      </InventoryProvider>
    </MenuProvider>
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