import React from "react";
import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../context/OfflineContext";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0;

export default function SyncStatusBanner() {
  const { isOnline, pendingCount } = useOffline();

  const accessibilityLabel = `Offline. ${pendingCount} action${pendingCount === 1 ? "" : "s"} waiting to sync.`;

  return (
    <View
      accessible={!isOnline}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={isOnline ? undefined : accessibilityLabel}
      style={[styles.container, { backgroundColor: isOnline ? "transparent" : "#F59E0B" }]}
    >
      <View style={{ height: STATUS_BAR_HEIGHT }} />
      {!isOnline && (
        <View style={styles.bar}>
          <Text style={styles.text} numberOfLines={1}>
            {`Offline — ${pendingCount} pending sync`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  bar: {
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  text: {
    color: "#422006",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
