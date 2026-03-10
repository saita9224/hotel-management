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

const safeNumber = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const formatKES = (value) =>
  safeNumber(value).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toDateKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateHeader = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
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

const COLORS = {
  debt: "#FF453A",
  paid: "#30D158",
  debtBg: "#FF453A18",
  paidBg: "#30D15818",
  balanceBg: "#FF9F0A18",
  balanceText: "#FF9F0A",
};

export default function ExpenseTable({ onPayBalance, onSupplierPress }) {
  const { expenses, payments } = useExpenses();
  const { colors } = useTheme();

  const [expandedDates, setExpandedDates] = useState({});

  const dateGroups = useMemo(() => {
    const groups = {};

    const ensureGroup = (key) => {
      if (!groups[key]) {
        groups[key] = {
          date_key: key,
          entries: [],
          balance_payments: [],
          total_same_day_paid: 0, // cash paid on day of purchase
          total_balance_paid: 0,  // cash paid on a later day (cross-day)
        };
      }
    };

    // Step 1: group expenses by purchase date
    // total_same_day_paid = sum of amount_paid on expenses created this day
    // (these are payments that happened on the same day as the purchase)
    expenses.forEach((e) => {
      const key = toDateKey(e.created_at);
      ensureGroup(key);
      groups[key].entries.push(e);
      groups[key].total_same_day_paid += safeNumber(e.amount_paid);
    });

    // Step 2: group cross-day payments by paid_at date
    // Only included if paid on a DIFFERENT day from the purchase —
    // same-day payments are already captured in amount_paid above
    payments.forEach((p) => {
      const paidKey = toDateKey(p.paid_at);
      const purchaseKey = toDateKey(
        expenses.find((e) => String(e.id) === String(p.expense_id))?.created_at
        || p.paid_at
      );

      if (paidKey !== purchaseKey) {
        ensureGroup(paidKey);
        groups[paidKey].balance_payments.push(p);
        groups[paidKey].total_balance_paid += safeNumber(p.amount);
      }
    });

    Object.values(groups).forEach((g) => {
      g.entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      g.balance_payments.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
    });

    return Object.values(groups).sort(
      (a, b) => new Date(b.date_key) - new Date(a.date_key)
    );
  }, [expenses, payments]);

  const toggleDate = (key) =>
    setExpandedDates((prev) => ({ ...prev, [key]: !prev[key] }));

  // -------------------------------------------------------
  // EXPENSE ENTRY ROW
  // -------------------------------------------------------

  const renderEntry = (entry) => {
    const statusColor = getExpenseStatusColor(entry, colors);

    return (
      <View
        key={entry.id}
        style={[styles.entryCard, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.entryTitle, { color: colors.text }]}>
            {entry.item_name}
          </Text>
          <Text style={{ color: statusColor, fontWeight: "600", fontSize: 12 }}>
            {"#" + entry.id}
          </Text>
        </View>

        <Text style={{ color: colors.tabBarInactive, marginTop: 4, fontSize: 13 }}>
          {"Qty: " + entry.quantity + "  •  Unit: KES " + formatKES(entry.unit_price)}
        </Text>

        <View style={styles.rowBetween}>
          <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>
            {"Total: KES " + formatKES(entry.total_price)}
          </Text>
          <Text style={{ color: COLORS.paid, fontWeight: "600", fontSize: 13, marginTop: 4 }}>
            {"Paid: KES " + formatKES(entry.amount_paid)}
          </Text>
        </View>

        <Text style={{
          color: safeNumber(entry.balance) > 0 ? COLORS.debt : COLORS.paid,
          fontWeight: "700",
          marginTop: 4,
        }}>
          {"Balance: KES " + formatKES(entry.balance)}
        </Text>

        {entry.supplier_name ? (
          <TouchableOpacity onPress={() => onSupplierPress?.(entry.supplier_name)}>
            <Text style={{ marginTop: 6, fontSize: 12 }}>
              <Text style={{ color: colors.tabBarInactive }}>Supplier: </Text>
              <Text style={{ color: colors.accent }}>{entry.supplier_name + " ›"}</Text>
            </Text>
          </TouchableOpacity>
        ) : null}

        {!entry.is_fully_paid && (
          <TouchableOpacity
            style={[styles.payBtn, { borderColor: colors.accent, backgroundColor: colors.accent + "15" }]}
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

  // -------------------------------------------------------
  // BALANCE PAYMENT ROW
  // -------------------------------------------------------

  const renderBalancePayment = (payment) => (
    <View
      key={"bp-" + payment.id}
      style={[styles.entryCard, { backgroundColor: COLORS.balanceBg, borderColor: COLORS.balanceText + "40" }]}
    >
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
            {payment.item_name + " (balance payment)"}
          </Text>
          {payment.supplier_name ? (
            <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
              {payment.supplier_name}
            </Text>
          ) : null}
          <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 2 }}>
            {"of KES " + formatKES(payment.expense_total) + " total expense"}
          </Text>
        </View>
        <Text style={{ color: COLORS.balanceText, fontWeight: "700", fontSize: 15 }}>
          {"KES " + formatKES(payment.amount)}
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------
  // DATE GROUP CARD
  // -------------------------------------------------------

  const renderGroup = ({ item }) => {
    const expanded = expandedDates[item.date_key];
    const hasBalancePayments = item.balance_payments.length > 0;

    // Outstanding = unpaid balances on purchases created this day
    const totalOutstanding = item.entries.reduce(
      (sum, e) => sum + safeNumber(e.balance), 0
    );
    const hasDebt = totalOutstanding > 0;

    // Daily total = actual cash that left the business this day:
    // payments made on day of purchase + cross-day balance payments made today
    const dailyTotal = item.total_same_day_paid + item.total_balance_paid;

    return (
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => toggleDate(item.date_key)}>
          <View style={styles.rowBetween}>

            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.groupTitle, { color: colors.text }]}>
                {formatDateHeader(item.date_key)}
              </Text>

              {/* Purchase count + same-day payments */}
              <Text style={{ color: colors.tabBarInactive, marginTop: 4, fontSize: 13 }}>
                {item.entries.length + " " + (item.entries.length === 1 ? "expense" : "expenses")}
                {"  •  Paid: KES " + formatKES(item.total_same_day_paid)}
              </Text>

              {/* Cross-day balance payments — only shown when they exist */}
              {hasBalancePayments && (
                <Text style={{ color: COLORS.balanceText, fontSize: 13, marginTop: 2 }}>
                  {"Balance payments: KES " + formatKES(item.total_balance_paid)}
                </Text>
              )}

              {/* Total cash out — always shown */}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
                  Total paid out
                </Text>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                  {"KES " + formatKES(dailyTotal)}
                </Text>
              </View>
            </View>

            {/* Outstanding pill */}
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <View style={[
                styles.balancePill,
                { backgroundColor: hasDebt ? COLORS.debtBg : COLORS.paidBg },
              ]}>
                <Text style={{
                  color: hasDebt ? COLORS.debt : COLORS.paid,
                  fontWeight: "700",
                  fontSize: 12,
                }}>
                  {"KES " + formatKES(totalOutstanding)}
                </Text>
              </View>
              <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
                {hasDebt ? "outstanding" : "✓ Settled"}
              </Text>
              <Text style={{ color: colors.tabBarInactive, fontSize: 16 }}>
                {expanded ? "▲" : "▼"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {expanded && (
          <View style={{ marginTop: 10 }}>
            {item.entries.map((entry) => renderEntry(entry))}

            {hasBalancePayments && (
              <>
                <View style={[styles.sectionDivider, { borderColor: colors.border }]}>
                  <Text style={{ color: COLORS.balanceText, fontSize: 12, fontWeight: "600" }}>
                    BALANCE PAYMENTS
                  </Text>
                </View>
                {item.balance_payments.map((p) => renderBalancePayment(p))}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

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

const styles = StyleSheet.create({
  groupCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  groupTitle: { fontSize: 16, fontWeight: "700" },
  balancePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  entryCard: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 8 },
  entryTitle: { fontSize: 14, fontWeight: "700" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  payBtn: { marginTop: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10, alignSelf: "flex-start" },
  sectionDivider: { borderTopWidth: 1, marginTop: 10, paddingTop: 8, marginBottom: 2 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, marginTop: 8, paddingTop: 6 },
});