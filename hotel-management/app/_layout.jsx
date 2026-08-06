// app/_layout.jsx

import { Slot, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
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
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  const inAuthGroup = segments[0] === "(auth)";
  const inSecurityGroup = segments[0] === "(security)";
  const segmentKey = segments.join("/");

  const stillLoading = loading || (isAuthenticated && pinIsSet === null);

  // Navigation is dispatched imperatively, gated on the root navigator
  // actually being ready (rootNavigationState?.key). Firing a redirect
  // before that point is what caused "REPLACE action not handled by any
  // navigator" — which in practice triggered a full reset of the
  // navigation tree, remounting AuthProvider and wiping pinVerified.
  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (stillLoading) return;

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    // From here on, a real (JWT) session exists on this device.

    if (!pinIsSet) {
      if (!inSecurityGroup) router.replace("/(security)/create-pin");
      return;
    }

    if (!pinVerified) {
      if (!inSecurityGroup) router.replace("/(security)/unlock");
      return;
    }

    if (inSecurityGroup || inAuthGroup) {
      router.replace("/(tabs)/");
    }
  }, [
    rootNavigationState?.key,
    stillLoading,
    isAuthenticated,
    pinIsSet,
    pinVerified,
    inAuthGroup,
    inSecurityGroup,
    router,
    segmentKey,
  ]);

  if (!rootNavigationState?.key || stillLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return inAuthGroup ? children : <LoadingScreen />;
  }

  if (!pinIsSet) {
    return inSecurityGroup ? children : <LoadingScreen />;
  }

  if (!pinVerified) {
    return inSecurityGroup ? children : <LoadingScreen />;
  }

  if (inSecurityGroup || inAuthGroup) {
    // Navigating away — the effect above has already dispatched it.
    return <LoadingScreen />;
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
