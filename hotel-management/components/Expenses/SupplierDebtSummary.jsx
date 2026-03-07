// components/Expenses/SupplierDebtSummarry.jsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "../../constants/theme";
import { useExpenses } from "../../context/ExpensesContext";

export default function SupplierDebtSummary() {
  const { expenses } = useExpenses();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const summary = useMemo(() => {
    const map = {};

    expenses.forEach((expense) => {
      const supplier = expense.supplier?.name || "Unknown";

      if (!map[supplier]) {
        map[supplier] = {
          supplier,
          total: 0,
          balance: 0,
        };
      }

      map[supplier].total += Number(expense.total_price || 0);
      map[supplier].balance += Number(expense.balance || 0);
    });

    return Object.values(map);
  }, [expenses]);

  const totalDebt = summary.reduce((sum, s) => sum + s.balance, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Supplier Debt Summary
      </Text>

      {summary.map((row) => (
        <View
          key={row.supplier}
          style={[styles.row, { borderBottomColor: theme.icon }]}
        >
          <Text style={[styles.supplier, { color: theme.text }]}>
            {row.supplier}
          </Text>

          <View style={styles.amounts}>
            <Text style={{ color: theme.text }}>
              Total: KES {row.total.toFixed(2)}
            </Text>

            <Text
              style={[
                styles.balance,
                { color: row.balance > 0 ? "#e63946" : "#2a9d8f" },
              ]}
            >
              Balance: KES {row.balance.toFixed(2)}
            </Text>
          </View>
        </View>
      ))}

      <View style={[styles.totalBox, { borderTopColor: theme.icon }]}>
        <Text style={[styles.totalLabel, { color: theme.text }]}>
          Total Outstanding Debt
        </Text>

        <Text style={[styles.totalValue]}>KES {totalDebt.toFixed(2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  supplier: {
    fontSize: 15,
    fontWeight: "600",
  },

  amounts: {
    marginTop: 4,
  },

  balance: {
    fontWeight: "700",
  },

  totalBox: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
  },

  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e63946",
    marginTop: 4,
  },
});
