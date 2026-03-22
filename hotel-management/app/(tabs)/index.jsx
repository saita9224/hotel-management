// app/(tabs)/index.jsx

import React, { useMemo } from "react";
import {
  View, Text, Image, StyleSheet,
  ScrollView, TouchableOpacity,
} from "react-native";
import { useTheme }     from "../../hooks/useTheme";
import { useAuth }      from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { usePOS }       from "../../context/POSContext";
import { useExpenses }  from "../../context/ExpensesContext";
import { useRouter }    from "expo-router";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export default function HomeScreen() {
  const { colors }                  = useTheme();
  const { permissions }             = useAuth();
  const { products }                = useInventory();
  const { receipts, unsettledCredits } = usePOS();
  const { expenses }                = useExpenses();
  const router                      = useRouter();

  const can = (code) => permissions.includes(code);

  const today = new Date().toISOString().split("T")[0];

  // ── Derived stats ──────────────────────────────────

  const todayReceipts = useMemo(() =>
    receipts.filter((r) => {
      const d = r.submitted_at || r.created_at;
      return d && d.startsWith(today);
    }),
    [receipts, today]
  );

  const todayRevenue = useMemo(() =>
    todayReceipts
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + Number(r.total || 0), 0),
    [todayReceipts]
  );

  const pendingCount = useMemo(() =>
    receipts.filter((r) => r.status === "PENDING").length,
    [receipts]
  );

  const todayExpenses = useMemo(() =>
    expenses
      .filter((e) => e.created_at?.startsWith(today))
      .reduce((sum, e) => sum + Number(e.total_price || 0), 0),
    [expenses, today]
  );

  const outOfStockCount = useMemo(() =>
    products.filter((p) => p.current_stock <= 0).length,
    [products]
  );

  const lowStockCount = useMemo(() =>
    products.filter((p) => p.current_stock > 0 && p.current_stock < 10).length,
    [products]
  );

  const overdueCredits = useMemo(() =>
    (unsettledCredits ?? []).filter((c) => c.due_date < today).length,
    [unsettledCredits, today]
  );

  // ── Overview rows (role-aware) ─────────────────────

  const overviewRows = useMemo(() => {
    const rows = [];

    if (can("pos.create_order")) {
      rows.push({
        emoji: "🧾",
        label: "Orders Today",
        value: todayReceipts.length,
        onPress: () => router.push("/(tabs)/orders"),
      });
    }

    if (can("pos.view_cashier")) {
      rows.push({
        emoji: "⏳",
        label: "Pending Payment",
        value: pendingCount,
        onPress: () => router.push("/(tabs)/orders"),
      });
    }

    if (can("pos.accept_payment")) {
      rows.push({
        emoji: "💰",
        label: "Revenue",
        value: `KES ${formatKES(todayRevenue)}`,
        onPress: () => router.push("/(tabs)/reports"),
      });
    }

    if (can("inventory.stock.view")) {
      rows.push({
        emoji: "📦",
        label: "Low / Out of Stock",
        value: lowStockCount + outOfStockCount,
        onPress: () => router.push("/(tabs)/inventory"),
      });
    }

    if (can("expenses.view")) {
      rows.push({
        emoji: "🧮",
        label: "Expenses Today",
        value: `KES ${formatKES(todayExpenses)}`,
        onPress: () => router.push("/(tabs)/expenses"),
      });
    }

    if (can("pos.settle_credit")) {
      rows.push({
        emoji: "💳",
        label: "Overdue Credits",
        value: overdueCredits,
        onPress: () => router.push("/(tabs)/orders"),
      });
    }

    return rows;
  }, [
    todayReceipts, pendingCount, todayRevenue,
    lowStockCount, outOfStockCount, todayExpenses,
    overdueCredits, permissions,
  ]);

  // ── Smart reminders (role-aware) ───────────────────

  const reminders = useMemo(() => {
    const list = [];

    if (can("inventory.stock.view")) {
      if (outOfStockCount > 0)
        list.push({
          text:    `• ${outOfStockCount} item${outOfStockCount > 1 ? "s" : ""} out of stock`,
          color:   "#FF453A",
          onPress: () => router.push("/(tabs)/inventory"),
        });
      if (lowStockCount > 0)
        list.push({
          text:    `• ${lowStockCount} item${lowStockCount > 1 ? "s" : ""} running low`,
          color:   "#FF9F0A",
          onPress: () => router.push("/(tabs)/inventory"),
        });
    }

    if (can("pos.view_cashier") && pendingCount > 0)
      list.push({
        text:    `• ${pendingCount} order${pendingCount > 1 ? "s" : ""} waiting for payment`,
        color:   "#FF9F0A",
        onPress: () => router.push("/(tabs)/orders"),
      });

    if (can("pos.create_order") && pendingCount > 0)
      list.push({
        text:    `• ${pendingCount} of your order${pendingCount > 1 ? "s" : ""} pending cashier`,
        color:   "#FF9F0A",
        onPress: () => router.push("/(tabs)/orders"),
      });

    if (can("pos.settle_credit") && overdueCredits > 0)
      list.push({
        text:    `• ${overdueCredits} credit account${overdueCredits > 1 ? "s" : ""} overdue`,
        color:   "#FF453A",
        onPress: () => router.push("/(tabs)/orders"),
      });

    if (list.length === 0)
      list.push({
        text:    "• Everything looks good today!",
        color:   "#30D158",
        onPress: null,
      });

    return list;
  }, [
    outOfStockCount, lowStockCount,
    pendingCount, overdueCredits, permissions,
  ]);

  // ── UI ─────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Logo section — unchanged from original ── */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/hoppers_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.accent }]}>HOPPERS</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          HOTEL & BUTCHERY
        </Text>
        <Text style={[styles.motto, { color: colors.tabBarInactive }]}>
          STAY. SAVOR. SMILE.
        </Text>
      </View>

      {/* ── Today's Overview — same card style, live data ── */}
      <View style={[styles.summaryCard, { borderColor: colors.accent }]}>
        <Text style={[styles.summaryTitle, { color: colors.accent }]}>
          TODAY'S OVERVIEW
        </Text>

        {overviewRows.length === 0 ? (
          <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>
            No data available for your role.
          </Text>
        ) : (
          overviewRows.map((row, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.summaryRow}
              onPress={row.onPress}
              activeOpacity={row.onPress ? 0.7 : 1}
            >
              <Text style={[styles.summaryItem, { color: colors.text }]}>
                {row.emoji} {row.label}:
              </Text>
              <Text style={[styles.summaryValue, { color: colors.accent }]}>
                {row.value}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ── Reminders — same card style, smart content ── */}
      <View style={[styles.reminderCard, { borderColor: colors.accent }]}>
        <Text style={[styles.reminderTitle, { color: colors.accent }]}>
          REMINDERS
        </Text>

        {reminders.map((r, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={r.onPress}
            activeOpacity={r.onPress ? 0.7 : 1}
          >
            <Text style={[styles.reminderItem, { color: r.color }]}>
              {r.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    letterSpacing: 1,
  },
  motto: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  summaryTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  summaryItem: {
    fontSize: 14,
  },
  summaryValue: {
    fontWeight: "bold",
    fontSize: 14,
  },
  reminderCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    width: "100%",
    marginBottom: 20,
  },
  reminderTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  reminderItem: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "600",
  },
});