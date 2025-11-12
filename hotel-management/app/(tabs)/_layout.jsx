import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../theme/colors";

// 🧠 Context Providers 
import { OrdersProvider } from "../context/OrdersContext";
import { InventoryProvider } from "../context/InventoryContext";

// Mapping of route names to icon names
const icons = {
  index: "home",
  inventory: "cube-outline",
  orders: "receipt-outline",
  expenses: "cash-outline",
  reports: "bar-chart-outline",
};

export default function Layout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <InventoryProvider>
      <OrdersProvider>
        {/* SafeAreaView ensures tab bar sits above system navigation area */}
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <Tabs
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: theme.tabBarBackground,
                borderTopWidth: 0.5,
                borderTopColor: theme.border,
                height: 60,
                paddingBottom: 8, // 👈 adds space from screen edge
                paddingTop: 4,
              },
              tabBarActiveTintColor: theme.tabBarActive,
              tabBarInactiveTintColor: theme.tabBarInactive,
              tabBarIcon: ({ color, size }) => {
                const iconName = icons[route.name] || "help-circle-outline";
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: "600",
                marginBottom: 2,
              },
            })}
          >
            <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
            <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
            <Tabs.Screen name="orders" options={{ title: "Orders" }} />
            <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
            <Tabs.Screen name="reports" options={{ title: "Reports" }} />
          </Tabs>
        </SafeAreaView>
      </OrdersProvider>
    </InventoryProvider>
  );
}
