// app/_layout.jsx

import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { OfflineProvider } from "../context/OfflineContext";
import { DatabaseProvider } from "../database/DatabaseProvider";
import { database } from "../database";
import SyncStatusBanner from "../components/SyncStatusBanner";

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

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (stillLoading) return;

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

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

  if (!rootNavigationState?.key || stillLoading) {
    return <LoadingScreen />;
  }

  return children;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DatabaseProvider database={database}>
        <OfflineProvider>
          <RouteGuard>
            <View style={{ flex: 1 }}>
              <SyncStatusBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(security)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="hr" options={{ headerShown: false }} />
                <Stack.Screen name="menu-modal" options={{ headerShown: false, presentation: 'modal' }} />
              </Stack>
            </View>
          </RouteGuard>
        </OfflineProvider>
      </DatabaseProvider>
    </AuthProvider>
  );
}

