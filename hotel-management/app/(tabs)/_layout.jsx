// app/(tabs)/_layout.jsx

import React from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";

const icons = {
  index: "home",
  inventory: "cube-outline",
  orders: "receipt-outline",
  expenses: "cash-outline",
  reports: "bar-chart-outline",
};

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerTitleAlign: "center",
        headerTitleStyle: { color: colors.accent, fontWeight: "700" },
        headerTintColor: colors.text,

        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,

        tabBarIcon: ({ color, size }) => {
          const iconName = icons[route.name] ?? "help-circle-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },

        tabBarLabelStyle: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/menu-modal")}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="menu-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
    </Tabs>
  );
}