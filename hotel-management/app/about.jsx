// app/about.jsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";

export default function AboutScreen() {
  const { business } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const version = Constants.expoConfig?.version || "1.0.0";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>About</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="cube" size={48} color={colors.accent} />
        <Text style={[styles.appName, { color: colors.text }]}>Bizzman</Text>
        <Text style={[styles.version, { color: colors.tabBarInactive }]}>
          Version {version}
        </Text>
        {!!business?.name && (
          <Text style={[styles.business, { color: colors.tabBarInactive }]}>
            {business.name}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700" },
  content: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  appName: { fontSize: 24, fontWeight: "800", marginTop: 16 },
  version: { fontSize: 14, marginTop: 6 },
  business: { fontSize: 13, marginTop: 24 },
});
