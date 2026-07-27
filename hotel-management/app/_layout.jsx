// app/_layout.jsx

import { Redirect, Slot, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth }  from "../context/AuthContext";
import { MenuProvider }           from "../context/MenuContext";
import { InventoryProvider }      from "../context/InventoryContext";
import { POSProvider }            from "../context/POSContext";
import { ExpensesProvider }       from "../context/ExpensesContext";
import { HRProvider }             from "../context/HRContext";
import { ReportsProvider }        from "../context/ReportsContext";

function RouteGuard({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === "(auth)";

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isAuthenticated) return children;

  if (inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <MenuProvider>
      <InventoryProvider>
        <POSProvider>
          <ExpensesProvider>
            <HRProvider>
              <ReportsProvider>
                {children}
              </ReportsProvider>
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
