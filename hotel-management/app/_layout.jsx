import { Redirect, Slot, useSegments } from "expo-router";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth }  from "../context/AuthContext";
import { MenuProvider }           from "../context/MenuContext";
import { InventoryProvider }      from "../context/InventoryContext";
import { POSProvider }            from "../context/POSContext";
import { ExpensesProvider }       from "../context/ExpensesContext";
import { HRProvider }             from "../context/HRContext";
import { ReportsProvider }        from "../context/ReportsContext";

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

function RouteGuard({ children }) {
  const { loading, isAuthenticated, pinIsSet, pinVerified } = useAuth();
  const segments = useSegments();
  const inAuthGroup = segments[0] === "(auth)";
  const onPinRoute = segments[0] === "pin-gate" || segments[0] === "set-pin";

  if (loading || (isAuthenticated && pinIsSet === null)) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    if (!inAuthGroup) {
      return <Redirect href="/(auth)/login" />;
    }
    return children;
  }

  if (!pinIsSet) {
    if (!onPinRoute) return <Redirect href="/set-pin" />;
    return children;
  }

  if (!pinVerified) {
    if (!onPinRoute) return <Redirect href="/pin-gate" />;
    return children;
  }

  if (onPinRoute || inAuthGroup) {
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