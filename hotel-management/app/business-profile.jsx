// app/business-profile.jsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import BusinessLogo from "../components/BusinessLogo";

export default function BusinessProfileScreen() {
  const { business } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <Text style={[styles.title, { color: colors.text }]}>Business Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <BusinessLogo size={160} />
        <Text style={[styles.name, { color: colors.text }]}>
          {business?.name || "Your Business"}
        </Text>
        <Text style={[styles.hint, { color: colors.tabBarInactive }]}>
          Tap the logo to change it
        </Text>
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
  content: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24 },
  name: { fontSize: 22, fontWeight: "800", marginTop: 16 },
  hint: { fontSize: 13, marginTop: 6 },
});
