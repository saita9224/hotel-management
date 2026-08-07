// app/_layout.jsx

import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";

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
  const inTabsGroup = segments[0] === "(tabs)";
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
    inTabsGroup,
    router,
    segmentKey,
  ]);

  // Show loading screen while navigating or loading session
  if (!rootNavigationState?.key || stillLoading) {
    return <LoadingScreen />;
  }

  // Return children (the Stack) when ready
  return children;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(security)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="hr" options={{ headerShown: false }} />
          <Stack.Screen name="menu-modal" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
      </RouteGuard>
    </AuthProvider>
  );
}
