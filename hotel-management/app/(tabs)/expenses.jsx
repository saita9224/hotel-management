import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { Colors } from "../../theme/colors";
import { useExpenses } from "../../context/ExpensesContext";
import { router } from "expo-router";
import PayBalanceModal from "../PayBalanceModal";

/* ---------------- HELPERS ---------------- */

const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const formatTimestamp = (entry) => {
  if (!entry) return "";
  return entry.timestamp || entry.date || "";
};

/* ---------------- SCREEN ---------------- */

export default function ExpensesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const {
    expenses = [],
    getTodaySummary = () => ({}),
    getExpensesByProduct,
  } = useExpenses();

  const [expanded, setExpanded] = useState({});
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const {
    totalExpense = 0,
    totalPaid = 0,
    totalOutstanding = 0,
  } = getTodaySummary();

  /* ---------------- GROUP BY PRODUCT ---------------- */

  const productGroups = useMemo(() => {
    return expenses.reduce((acc, e) => {
      const pid = e.product_id ?? "no-product";

      if (!acc[pid]) {
        acc[pid] = {
          product_id: pid,
          product_name: e.product_name || e.item_name || "Unnamed",
          total_quantity: 0,
          total_amount: 0,
          total_paid: 0,
          total_balance: 0,
        };
      }

      const quantity = safeNumber(e.quantity);
      const totalPrice =
        e.total_price !== null && e.total_price !== undefined
          ? safeNumber(e.total_price)
          : safeNumber(e.unit_price) * quantity;

      const paid = safeNumber(e.amount_paid);
      const balance =
        e.balance !== null && e.balance !== undefined
          ? safeNumber(e.balance)
          : totalPrice - paid;

      acc[pid].total_quantity += quantity;
      acc[pid].total_amount += totalPrice;
      acc[pid].total_paid += paid;
      acc[pid].total_balance += balance;

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

  /* ---------------- ENTRY CARD ---------------- */

  const renderEntry = (entry, idx) => {
    const quantity = safeNumber(entry.quantity);
    const unitPrice = safeNumber(entry.unit_price);

    const totalPrice =
      entry.total_price !== null && entry.total_price !== undefined
        ? safeNumber(entry.total_price)
        : unitPrice * quantity;

    const paid = safeNumber(entry.amount_paid);
    const balance =
      entry.balance !== null && entry.balance !== undefined
        ? safeNumber(entry.balance)
        : totalPrice - paid;

    const timestamp = formatTimestamp(entry);
    const key = entry.id ? String(entry.id) : `entry-${idx}`;

    return (
      <View
        key={key}
        style={[
          styles.entryCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.rowBetween}>
          <Text
            style={[styles.entryTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {entry.product_name || entry.item_name || "Unnamed"}
            {entry.supplier ? ` — ${entry.supplier}` : ""}
          </Text>

          <Text style={{ color: theme.accent, fontWeight: "600" }}>
            #{entry.id || "-"}
          </Text>
        </View>

        <Text style={[styles.subText(theme)]}>
          Qty: {quantity} • Unit: KES {unitPrice.toFixed(2)}
        </Text>

        <View style={styles.rowBetween}>
          <Text style={{ color: theme.text }}>
            Total: KES {totalPrice.toFixed(2)}
          </Text>
          <Text style={{ color: theme.text }}>
            Paid: KES {paid.toFixed(2)}
          </Text>
        </View>

        <View style={[styles.rowBetween, { alignItems: "center" }]}>
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
            <Text style={{ color: theme.accent, fontWeight: "600" }}>
              Paid
            </Text>
          )}
        </View>

        {timestamp ? (
          <Text style={styles.timestamp(theme)}>{timestamp}</Text>
        ) : null}
      </View>
    );
  };

  /* ---------------- PRODUCT CARD ---------------- */

  const renderProduct = ({ item }) => {
    const entries =
      typeof getExpensesByProduct === "function"
        ? getExpensesByProduct(item.product_id)
        : expenses.filter((e) => e.product_id === item.product_id);

    return (
      <View
        style={[
          styles.productCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => toggleExpand(item.product_id)}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.productTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.product_name}
              </Text>

              <Text style={styles.subText(theme)}>
                Qty: {item.total_quantity} • Total: KES{" "}
                {item.total_amount.toFixed(2)}
              </Text>

              <Text style={styles.subText(theme)}>
                Paid: KES {item.total_paid.toFixed(2)}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.accent, fontWeight: "700" }}>
                Balance
              </Text>
              <Text style={{ color: theme.accent, fontWeight: "700" }}>
                KES {item.total_balance.toFixed(2)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {expanded[item.product_id] && (
          <View style={{ marginTop: 10 }}>
            {entries.length === 0 ? (
              <Text style={styles.emptyText(theme)}>No entries</Text>
            ) : (
              entries.map((entry, idx) => renderEntry(entry, idx))
            )}
          </View>
        )}
      </View>
    );
  };

  /* ---------------- UI ---------------- */

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.header, { color: theme.text }]}>Expenses</Text>

      <View style={styles.summaryRow}>
        <SummaryCard label="Today Expense" value={totalExpense} theme={theme} />
        <SummaryCard label="Paid" value={totalPaid} theme={theme} />
        <SummaryCard
          label="Outstanding"
          value={totalOutstanding}
          theme={theme}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => String(p.product_id)}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListEmptyComponent={
          <Text style={styles.emptyText(theme)}>
            No expenses yet. Tap + to add.
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push("/add-expenses")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <PayBalanceModal
        visible={payModalVisible}
        onClose={() => setPayModalVisible(false)}
        expenseId={selectedEntryId}
      />
    </SafeAreaView>
  );
}

/* ---------------- COMPONENTS ---------------- */

const SummaryCard = ({ label, value, theme }) => (
  <View
    style={[
      styles.smallCard,
      { backgroundColor: theme.card, borderColor: theme.border },
    ]}
  >
    <Text style={[styles.smallLabel, { color: theme.text }]}>{label}</Text>
    <Text style={[styles.smallValue, { color: theme.text }]}>
      KES {safeNumber(value).toFixed(2)}
    </Text>
  </View>
);

/* ---------------- STYLES ---------------- */

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

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  subText: (theme) => ({
    color: theme.text,
    opacity: 0.85,
    marginTop: 6,
  }),

  emptyText: (theme) => ({
    color: theme.text,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 20,
  }),

  timestamp: (theme) => ({
    color: theme.tabBarInactive,
    marginTop: 8,
    fontSize: 12,
  }),

  payBtnSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
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