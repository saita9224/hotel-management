// components/Expenses/SupplierDebtSummary.jsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import { useTheme } from "../../hooks/useTheme";
import { useExpenses } from "../../context/ExpensesContext";

const formatKES = (value) =>
  Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SupplierDebtSummary() {
  const { expenses } = useExpenses();
  const { colors } = useTheme();

  const summary = useMemo(() => {
    const map = {};
    expenses.forEach((expense) => {
      const supplier = expense.supplier_name || "Unknown";
      if (!map[supplier]) map[supplier] = { supplier, total: 0, balance: 0 };
      map[supplier].total += Number(expense.total_price || 0);
      map[supplier].balance += Number(expense.balance || 0);
    });
    return Object.values(map);
  }, [expenses]);

  const totalDebt = summary.reduce((sum, s) => sum + s.balance, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Supplier Debt Summary</Text>

      {summary.map((row) => (
        <View key={row.supplier} style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.supplier, { color: colors.text }]}>{row.supplier}</Text>
          <View style={styles.amounts}>
            <Text style={{ color: colors.tabBarInactive }}>
              {"Total: KES " + formatKES(row.total)}
            </Text>
            <Text style={[styles.balance, { color: row.balance > 0 ? "#FF453A" : "#30D158" }]}>
              {"Balance: KES " + formatKES(row.balance)}
            </Text>
          </View>
        </View>
      ))}

      <View style={[styles.totalBox, { borderTopColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.text }]}>Total Outstanding Debt</Text>
        <Text style={[styles.totalValue, { color: "#FF453A" }]}>
          {"KES " + formatKES(totalDebt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  row: { paddingVertical: 10, borderBottomWidth: 1 },
  supplier: { fontSize: 15, fontWeight: "600" },
  amounts: { marginTop: 4 },
  balance: { fontWeight: "700" },
  totalBox: { marginTop: 16, paddingTop: 10, borderTopWidth: 1 },
  totalLabel: { fontSize: 16, fontWeight: "600" },
  totalValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
});