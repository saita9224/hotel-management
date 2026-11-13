import React from "react";
import { StyleSheet, View } from "react-native";
import { useOffline } from "../context/OfflineContext";

export default function SyncStatusBanner() {
  const { isOnline, pendingCount } = useOffline();

  if (isOnline) {
    return null;
  }

  const backgroundColor = "#F59E0B";

  const accessibilityLabel = `Offline. ${pendingCount} action${pendingCount === 1 ? "" : "s"} waiting to sync.`;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { backgroundColor }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    height: 20,
    width: "100%",
  },
});
