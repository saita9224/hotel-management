// components/Reports/ExpensesReportTab.jsx

import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Dimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "../../hooks/useTheme";
import { useReports } from "../../context/ReportsContext";
import StatCard from "./StatCard";

const SCREEN_WIDTH = Dimensions.get("window").width;

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const SUPPLIER_COLORS = [
  "#0A84FF", "#30D158", "#FF9F0A",
  "#BF5AF2", "#FF453A", "#64D2FF",
];

export default function ExpensesReportTab({ startDate, endDate }) {
  const { colors } = useTheme();
  const { expenseReport, expenseLoading, loadExpenseReport } = useReports();

  useEffect(() => {
    if (startDate && endDate) {
      loadExpenseReport(startDate, endDate);
    }
  }, [startDate, endDate]);

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo:   colors.card,
    decimalPlaces:          0,
    color:                  () => "#FF9F0A",
    labelColor:             () => colors.tabBarInactive,
    propsForDots:           { r: "4", strokeWidth: "2", stroke: "#FF9F0A" },
    propsForBackgroundLines: { stroke: colors.border },
  };

  if (expenseLoading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />;
  }

  if (!expenseReport) {
    return (
      <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 60 }}>
        Select a date range to load the report.
      </Text>
    );
  }

  const dailyLabels  = expenseReport.daily_breakdown.map((d) => {
    const date = new Date(d.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  const dailySpend   = expenseReport.daily_breakdown.map((d) => d.total_spent);
  const totalExpenses = expenseReport.total_expenses;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* ── Stat cards ── */}
      <View style={styles.cardRow}>
        <StatCard
          label="Total Spent"
          value={`KES ${formatKES(expenseReport.total_expenses)}`}
          icon="receipt-outline"
          color="#FF9F0A"
        />
        <StatCard
          label="Paid"
          value={`KES ${formatKES(expenseReport.total_paid)}`}
          icon="checkmark-circle-outline"
          color="#30D158"
        />
      </View>

      {expenseReport.total_outstanding > 0 && (
        <View style={[styles.callout, { backgroundColor: "#FF453A20", borderColor: "#FF453A" }]}>
          <Text style={{ color: "#FF453A", fontWeight: "700", fontSize: 13 }}>
            KES {formatKES(expenseReport.total_outstanding)} outstanding balance
          </Text>
        </View>
      )}

      {/* ── Daily spend line chart ── */}
      {dailySpend.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Daily Spend
          </Text>
          <LineChart
            data={{
              labels:   dailyLabels.length > 7
                ? dailyLabels.filter((_, i) => i % Math.ceil(dailyLabels.length / 7) === 0)
                : dailyLabels,
              datasets: [{ data: dailySpend.length > 0 ? dailySpend : [0] }],
            }}
            width={SCREEN_WIDTH - 32}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={[styles.chart, { borderColor: colors.border }]}
            withInnerLines={false}
          />
        </>
      )}

      {/* ── Supplier breakdown ── */}
      {expenseReport.supplier_breakdown.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            By Supplier
          </Text>
          {expenseReport.supplier_breakdown.map((s, idx) => {
            const pct      = totalExpenses > 0 ? (s.total_spent / totalExpenses) * 100 : 0;
            const barColor = SUPPLIER_COLORS[idx % SUPPLIER_COLORS.length];
            return (
              <View
                key={s.supplier_name}
                style={[styles.supplierRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.supplierDot, { backgroundColor: barColor }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
                      {s.supplier_name}
                    </Text>
                    <Text style={{ color: barColor, fontWeight: "700", fontSize: 13 }}>
                      KES {formatKES(s.total_spent)}
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[
                      styles.barFill,
                      { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor },
                    ]} />
                  </View>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 4 }}>
                    {s.item_count} items · {pct.toFixed(1)}% of total
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardRow:      { flexDirection: "row", gap: 8 },
  callout:      { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  sectionLabel: { fontSize: 14, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  chart:        { borderRadius: 12, borderWidth: 1 },
  supplierRow:  { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  supplierDot:  { width: 10, height: 10, borderRadius: 5 },
  rowBetween:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barTrack:     { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill:      { height: 6, borderRadius: 3 },
});