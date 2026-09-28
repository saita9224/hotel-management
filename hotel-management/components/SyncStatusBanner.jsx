// components/SyncStatusBanner.jsx

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOffline } from "../context/OfflineContext";

export default function SyncStatusBanner() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOffline();
  const insets = useSafeAreaInsets();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const getBackgroundColor = () => {
    if (!isOnline) return "#FFF3CD"; // Warning yellow
    if (isSyncing) return "#CCE5FF";  // Info blue
    return "#D4EDDA";                 // Success green
  };

  const getTextColor = () => {
    if (!isOnline) return "#856404";
    if (isSyncing) return "#004085";
    return "#155724";
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          paddingTop: Math.max(insets.top, 8),
        },
      ]}
    >
      <View style={styles.content}>
        {isSyncing && <ActivityIndicator size="small" color={getTextColor()} style={{ marginRight: 8 }} />}
        <Text style={[styles.text, { color: getTextColor() }]}>
          {!isOnline
            ? `⚠️ Offline Mode — ${pendingCount} mutation(s) queued locally`
            : isSyncing
            ? `🔄 Syncing ${pendingCount} offline action(s)...`
            : `✅ Online (${pendingCount} pending)`}
        </Text>
      </View>

      {isOnline && !isSyncing && pendingCount > 0 && (
        <TouchableOpacity onPress={syncNow} style={styles.syncBtn}>
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  syncBtn: {
    backgroundColor: "#155724",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  syncBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});

