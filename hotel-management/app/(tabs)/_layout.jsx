// app/(tabs)/_layout.jsx

import React from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";  // 👈 added

import { Colors } from "../../theme/colors";

const icons = {
  index: "home",
  inventory: "cube-outline",
  orders: "receipt-outline",
  expenses: "cash-outline",
  reports: "bar-chart-outline",
};

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const insets = useSafeAreaInsets();  // 👈 added

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // ✅ HEADER CONFIGURATION
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTitleAlign: "center",
        headerTitleStyle: {
          color: theme.accent,
          fontWeight: "700",
        },
        headerTintColor: theme.text,

        // ✅ TAB BAR CONFIGURATION
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopWidth: 0.5,
          borderTopColor: theme.border,
          height: 60 + insets.bottom,       // 👈 accounts for bottom inset
          paddingBottom: insets.bottom + 4,  // 👈 pushes icons above nav bar
          paddingTop: 4,
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,

        tabBarIcon: ({ color, size }) => {
          const iconName = icons[route.name] ?? "help-circle-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginBottom: 2,
        },
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
              <Ionicons name="menu-outline" size={24} color={theme.text} />
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