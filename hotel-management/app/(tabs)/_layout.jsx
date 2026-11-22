// app/(tabs)/_layout.jsx

import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MenuProvider } from "../../context/MenuContext";
import { InventoryProvider } from "../../context/InventoryContext";
import { POSProvider } from "../../context/POSContext";
import { ExpensesProvider } from "../../context/ExpensesContext";
import { ReportsProvider } from "../../context/ReportsContext";
import { useTheme } from "../../hooks/useTheme";

const icons = {
  index: "home",
  inventory: "cube-outline",
  orders: "receipt-outline",
  expenses: "cash-outline",
  reports: "bar-chart-outline",
};

function TabsContent() {
  const { colors } = useTheme();
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
          tabBarLabel: "Dashboard",
          headerShown: false,
        }}
      />
      <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports", headerShown: false }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <MenuProvider>
      <InventoryProvider>
        <POSProvider>
          <ExpensesProvider>
          <ReportsProvider>
            <TabsContent />
          </ReportsProvider>
          </ExpensesProvider>
        </POSProvider>
      </InventoryProvider>
    </MenuProvider>
  );
}
