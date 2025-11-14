// app/(tabs)/expenses.jsx
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { Colors } from "../theme/colors";
import { useExpenses } from "../context/ExpensesContext";
import { router } from "expo-router";
import PayBalanceModal from "../PayBalanceModal";

/**
 * Helper to format timestamp if present.
 * We support:
 *  - entry.timestamp (preferred)
 *  - fallback entry.date from context
 */
const formatTimestamp = (entry) => {
  if (!entry) return "";
  if (entry.timestamp) return entry.timestamp;
  if (entry.date) return entry.date;
  return "";
};

export default function ExpensesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { expenses = [], getTodaySummary = () => ({}), getExpensesByProduct } =
    useExpenses();

  const [expanded, setExpanded] = useState({});
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const { totalExpense = 0, totalPaid = 0, totalOutstanding = 0 } =
    getTodaySummary();

  // GROUP by product
  const productGroups = useMemo(() => {
    return expenses.reduce((acc, e) => {
      const pid = e.product_id ?? "unknown";
      if (!acc[pid]) {
        acc[pid] = {
          product_id: pid,
          product_name: e.product_name || e.description || pid,
          total_quantity: 0,
          total_amount: 0,
          total_paid: 0,
        };
      }
      acc[pid].total_quantity += Number(e.quantity || 0);
      acc[pid].total_amount += Number(e.total_amount || 0);
      acc[pid].total_paid += Number(e.paid || 0);
      return acc;
    }, {});
  }, [expenses]);

  const products = Object.values(productGroups);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openPayModalForEntry = (entryId) => {
    setSelectedEntryId(entryId);
    setPayModalVisible(true);
  };

  // Render inner entry card
  const renderEntry = (entry, idx) => {
    const balance = Number(entry.total_amount || 0) - Number(entry.paid || 0);
    const timestamp = formatTimestamp(entry);
    const key = entry.id ?? `entry-${idx}`;

    return (
      <View
        key={key}
        style={[
          styles.entryCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={[styles.entryTitle, { color: theme.text }]} numberOfLines={1}>
            {entry.product_name} {entry.supplier ? `— ${entry.supplier}` : ""}
          </Text>

          <Text style={{ color: theme.accent, fontWeight: "600" }}>
            {entry.id}
          </Text>
        </View>

        <Text style={{ color: theme.text, opacity: 0.85, marginTop: 6 }}>
          Qty: {entry.quantity || 0} • Unit: KES {entry.unit_price || 0}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <Text style={{ color: theme.text }}>
            Total: KES {Number(entry.total_amount || 0).toFixed(2)}
          </Text>
          <Text style={{ color: theme.text }}>
            Paid: KES {Number(entry.paid || 0).toFixed(2)}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ color: theme.accent, fontWeight: "700" }}>
            Balance: KES {balance.toFixed(2)}
          </Text>

          {balance > 0 ? (
            <TouchableOpacity
              style={[styles.payBtnSmall, { backgroundColor: theme.accent }]}
              onPress={() => openPayModalForEntry(entry.id)}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Pay</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: theme.accent, fontWeight: "600" }}>Paid</Text>
          )}
        </View>

        {timestamp ? (
          <Text
            style={{
              color: theme.tabBarInactive,
              marginTop: 8,
              fontSize: 12,
            }}
          >
            {timestamp}
          </Text>
        ) : null}
      </View>
    );
  };

  // Render outer product group card
  const renderProduct = ({ item }) => {
    const totalBalance =
      Number(item.total_amount || 0) - Number(item.total_paid || 0);

    const entriesRaw =
      typeof getExpensesByProduct === "function"
        ? getExpensesByProduct(item.product_id)
        : expenses.filter((e) => e.product_id === item.product_id);

    const entries = entriesRaw
      .slice()
      .sort((a, b) => {
        if (a.timestamp && b.timestamp)
          return b.timestamp.localeCompare(a.timestamp);
        if (a.date && b.date) return b.date.localeCompare(a.date);
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

    return (
      <View
        style={[
          styles.productCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => toggleExpand(item.product_id)}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.productTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.product_name}
              </Text>

              <Text style={{ color: theme.text, opacity: 0.75, marginTop: 4 }}>
                Qty: {item.total_quantity} • Total: KES{" "}
                {Number(item.total_amount || 0).toFixed(2)}
              </Text>

              <Text style={{ color: theme.text, opacity: 0.75 }}>
                Paid: KES {Number(item.total_paid || 0).toFixed(2)}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
              <Text style={{ color: theme.accent, fontWeight: "700" }}>
                Balance
              </Text>
              <Text style={{ color: theme.accent, fontWeight: "700" }}>
                KES {Number(totalBalance || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {expanded[item.product_id] && (
          <View style={{ marginTop: 10 }}>
            {entries.length === 0 ? (
              <Text
                style={{
                  color: theme.tabBarInactive,
                  textAlign: "center",
                }}
              >
                No entries
              </Text>
            ) : (
              entries.map((entry, idx) => renderEntry(entry, idx))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.header, { color: theme.text }]}>Expenses</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.smallCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.smallLabel, { color: theme.text }]}>
            Today Expense
          </Text>
          <Text style={[styles.smallValue, { color: theme.text }]}>
            KES {Number(totalExpense || 0).toFixed(2)}
          </Text>
        </View>

        <View
          style={[
            styles.smallCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.smallLabel, { color: theme.text }]}>Paid</Text>
          <Text style={[styles.smallValue, { color: theme.text }]}>
            KES {Number(totalPaid || 0).toFixed(2)}
          </Text>
        </View>

        <View
          style={[
            styles.smallCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.smallLabel, { color: theme.text }]}>
            Outstanding
          </Text>
          <Text style={[styles.smallValue, { color: theme.text }]}>
            KES {Number(totalOutstanding || 0).toFixed(2)}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Products</Text>

      <FlatList
        data={products}
        keyExtractor={(p) => String(p.product_id)}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.text,
              opacity: 0.6,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            No expenses yet. Tap + to add.
          </Text>
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push("/add-expenses")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ✅ FIXED PROP NAME */}
      <PayBalanceModal
        visible={payModalVisible}
        onClose={() => setPayModalVisible(false)}
        expenseId={selectedEntryId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  smallCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  smallLabel: { fontSize: 12, opacity: 0.8 },
  smallValue: { fontSize: 16, fontWeight: "700", marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  productCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  productTitle: { fontSize: 16, fontWeight: "700" },
  entryCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  entryTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  payBtnSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-end",
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});
