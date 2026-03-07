// components/Expenses/ExpenseTable.jsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";

import { useExpenses } from "../../context/ExpensesContext";
import { useTheme } from "../../hooks/useTheme";
import { getExpenseStatusColor } from "../../utils/expenseColors";

/* ---------------- HELPERS ---------------- */

const safeNumber = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const formatDateHeader = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const toDateKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Semantic colors — legible on both light and dark backgrounds
const COLORS = {
  debt: "#FF453A",
  paid: "#30D158",
  debtBg: "#FF453A18",
  paidBg: "#30D15818",
};

/* ---------------- COMPONENT ---------------- */

export default function ExpenseTable({ onPayBalance, onSupplierPress }) {
  const { expenses } = useExpenses();
  const { colors, fonts } = useTheme();

  const [expandedDates, setExpandedDates] = useState({});

  /* ---------------- GROUP BY DATE ---------------- */

  const dateGroups = useMemo(() => {
    const groups = {};

    expenses.forEach((e) => {
      const key = toDateKey(e.created_at);

      if (!groups[key]) {
        groups[key] = {
          date_key: key,
          entries: [],
          total_amount: 0,
          total_paid: 0,
          total_balance: 0,
        };
      }

      groups[key].entries.push(e);
      groups[key].total_amount  += safeNumber(e.total_price);
      groups[key].total_paid    += safeNumber(e.amount_paid);
      groups[key].total_balance += safeNumber(e.balance);
    });

    Object.values(groups).forEach((g) => {
      g.entries.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.date_key) - new Date(a.date_key)
    );
  }, [expenses]);

  /* ---------------- TOGGLE ---------------- */

  const toggleDate = (key) => {
    setExpandedDates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  /* ---------------- ENTRY CARD ---------------- */

  const renderEntry = (entry) => {
    const total   = safeNumber(entry.total_price);
    const paid    = safeNumber(entry.amount_paid);
    const balance = safeNumber(entry.balance);
    const statusColor = getExpenseStatusColor(entry, colors);

    return (
      <View
        key={entry.id}
        style={[
          styles.entryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {/* Item name + ID */}
        <View style={styles.rowBetween}>
          <Text style={[styles.entryTitle, { color: colors.text, fontFamily: fonts.sans }]}>
            {entry.item_name}
          </Text>
          <Text style={{ color: statusColor, fontWeight: "600", fontSize: 12 }}>
            #{entry.id}
          </Text>
        </View>

        {/* Qty + unit price — colors.text for readability in dark mode */}
        <Text style={{ color: colors.text, marginTop: 4, fontSize: 13 }}>
          Qty: {entry.quantity} • Unit: KES {entry.unit_price}
        </Text>

        {/* Total + paid */}
        <View style={styles.rowBetween}>
          <Text style={{ color: colors.text }}>
            Total: KES {total.toFixed(2)}
          </Text>
          <Text style={{ color: COLORS.paid, fontWeight: "600" }}>
            Paid: KES {paid.toFixed(2)}
          </Text>
        </View>

        {/* Balance */}
        <Text style={{
          color: balance > 0 ? COLORS.debt : COLORS.paid,
          fontWeight: "700",
          marginTop: 4,
        }}>
          Balance: KES {balance.toFixed(2)}
        </Text>

        {/* Supplier — label in text color, value in accent */}
        {entry.supplier_name ? (
          <TouchableOpacity onPress={() => onSupplierPress?.(entry.supplier_name)}>
            <Text style={{ marginTop: 6, fontSize: 12 }}>
              <Text style={{ color: colors.text }}>Supplier: </Text>
              <Text style={{ color: colors.accent }}>{entry.supplier_name} ›</Text>
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Pay balance button */}
        {!entry.is_fully_paid && (
          <TouchableOpacity
            style={[
              styles.payBtn,
              { borderColor: colors.accent, backgroundColor: colors.accent + "15" },
            ]}
            onPress={() => onPayBalance?.(entry.id)}
          >
            <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 12 }}>
              Pay Balance
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* ---------------- DATE GROUP CARD ---------------- */

  const renderGroup = ({ item }) => {
    const expanded = expandedDates[item.date_key];
    const hasDebt = item.total_balance > 0;

    return (
      <View
        style={[
          styles.groupCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => toggleDate(item.date_key)}>
          <View style={styles.rowBetween}>

            <View style={{ flex: 1 }}>
              {/* Date header */}
              <Text style={[styles.groupTitle, { color: colors.text, fontFamily: fonts.sans }]}>
                {formatDateHeader(item.date_key)}
              </Text>

              {/* Entry count + total */}
              <Text style={{ color: colors.tabBarInactive, marginTop: 2, fontSize: 13 }}>
                {item.entries.length}{" "}
                {item.entries.length === 1 ? "expense" : "expenses"}
                {"  •  "}Total: KES {item.total_amount.toFixed(2)}
              </Text>

              {/* Paid */}
              <Text style={{ color: COLORS.paid, fontSize: 13, marginTop: 2 }}>
                Paid: KES {item.total_paid.toFixed(2)}
              </Text>
            </View>

            {/* Balance pill + toggle arrow */}
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <View style={[
                styles.balancePill,
                { backgroundColor: hasDebt ? COLORS.debtBg : COLORS.paidBg },
              ]}>
                <Text style={{
                  color: hasDebt ? COLORS.debt : COLORS.paid,
                  fontWeight: "700",
                  fontSize: 13,
                }}>
                  {hasDebt ? `KES ${item.total_balance.toFixed(2)}` : "✓ Settled"}
                </Text>
              </View>
              <Text style={{ color: colors.tabBarInactive, fontSize: 16 }}>
                {expanded ? "▲" : "▼"}
              </Text>
            </View>

          </View>
        </TouchableOpacity>

        {/* Entries */}
        {expanded && (
          <View style={{ marginTop: 10 }}>
            {item.entries.map((entry) => renderEntry(entry))}
          </View>
        )}
      </View>
    );
  };

  /* ---------------- UI ---------------- */

  return (
    <FlatList
      data={dateGroups}
      keyExtractor={(item) => item.date_key}
      renderItem={renderGroup}
      contentContainerStyle={{ paddingBottom: 120 }}
      ListEmptyComponent={
        <Text style={{ textAlign: "center", marginTop: 40, color: colors.tabBarInactive }}>
          No expenses found
        </Text>
      }
    />
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  groupCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  balancePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  entryCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  payBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
});