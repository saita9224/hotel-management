// app/menu-items.jsx
// Full-screen host for the Menu Manager (opened from the sidebar).

import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { MenuProvider } from "../context/MenuContext";
import { useTheme } from "../hooks/useTheme";
import MenuManagerSheet from "../components/POS/MenuManagerSheet";

export default function MenuItemsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MenuProvider>
        <MenuManagerSheet visible onClose={() => router.back()} />
      </MenuProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
