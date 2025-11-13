import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { useRouter } from "expo-router";
import { useOrders } from "../context/OrdersContext";

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { orders } = useOrders();

  // 🔢 Summary calculations
  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter((o) => !o.completed).length;

  // 🎨 Render each order
  const renderOrder = ({ item }) => (
    <View
      style={[
        styles.orderCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.orderName, { color: theme.text }]}>
          {item.name}
        </Text>
        <Text style={{ color: theme.accent, fontWeight: "600" }}>
          #{item.id}
        </Text>
      </View>
      <Text style={{ color: theme.text, opacity: 0.8 }}>
        Qty: {item.quantity} • KES {item.total?.toFixed(2)}
      </Text>
      <Text style={{ color: theme.text, opacity: 0.5, marginTop: 2 }}>
        {item.date || "Today"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* 🧭 Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: theme.accent }]}>Orders</Text>
      </View>

      {/* 📊 Summary Cards */}
      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="receipt-outline" size={24} color={theme.accent} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {totalOrders}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>
            Total Orders
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="cash-outline" size={24} color={theme.accent} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            KES {totalSales.toFixed(2)}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>
            Sales Today
          </Text>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="hourglass-outline" size={24} color={theme.accent} />
          <Text style={[styles.summaryValue, { color: theme.text }]}>
            {pendingOrders}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.text }]}>
            Pending
          </Text>
        </View>
      </View>

      {/* 🧾 Orders List */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Recent Orders
      </Text>
      <FlatList
        data={orders.slice().reverse()} // newest first
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.text,
              opacity: 0.5,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            No orders yet. Tap the + button to add one.
          </Text>
        }
      />

      {/* ➕ Floating Add Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => router.push("/add-order")} // ✅ full page navigation
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* 👁️ Eye Icon (Restored) */}
        <TouchableOpacity
          style={[styles.eyeButton, { backgroundColor: theme.card }]}
          onPress={() => router.push("/orders")} // adjust route if needed
        >
          <Ionicons name="eye-outline" size={26} color={theme.accent} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  orderCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  orderName: {
    fontSize: 16,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    alignItems: "center",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  eyeButton: {
    marginTop: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
});
