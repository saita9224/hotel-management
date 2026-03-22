// components/Reports/SalesReportTab.jsx

import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Dimensions,
} from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { useTheme } from "../../hooks/useTheme";
import { useReports } from "../../context/ReportsContext";
import StatCard from "./StatCard";

const SCREEN_WIDTH = Dimensions.get("window").width;

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const METHOD_COLORS = {
  CASH:          "#30D158",
  MPESA:         "#0A84FF",
  CARD:          "#BF5AF2",
};

export default function SalesReportTab({ startDate, endDate }) {
  const { colors } = useTheme();
  const { salesReport, salesLoading, loadSalesReport } = useReports();

  useEffect(() => {
    if (startDate && endDate) {
      loadSalesReport(startDate, endDate);
    }
  }, [startDate, endDate]);

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo:   colors.card,
    decimalPlaces:          0,
    color:                  (opacity = 1) => colors.accent,
    labelColor:             (opacity = 1) => colors.tabBarInactive,
    propsForDots:           { r: "4", strokeWidth: "2", stroke: colors.accent },
    propsForBackgroundLines: { stroke: colors.border },
  };

  if (salesLoading) {
    return (
      <ActivityIndicator
        color={colors.accent}
        style={{ marginTop: 60 }}
      />
    );
  }

  if (!salesReport) {
    return (
      <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 60 }}>
        Select a date range to load the report.
      </Text>
    );
  }

  // ── Daily line chart data ──────────────────────────
  const dailyLabels = salesReport.daily_breakdown.map((d) => {
    const date = new Date(d.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  const dailyRevenue = salesReport.daily_breakdown.map((d) => d.revenue);

  // ── Payment bar chart data ─────────────────────────
  const paymentLabels = salesReport.payment_breakdown.map((p) => p.method);
  const paymentTotals = salesReport.payment_breakdown.map((p) => p.total);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* ── Stat cards ── */}
      <View style={styles.cardRow}>
        <StatCard
          label="Net Revenue"
          value={`KES ${formatKES(salesReport.net_revenue)}`}
          icon="cash-outline"
          color="#30D158"
        />
        <StatCard
          label="Orders"
          value={salesReport.order_count}
          icon="receipt-outline"
          color={colors.accent}
        />
      </View>
      <View style={[styles.cardRow, { marginTop: 8 }]}>
        <StatCard
          label="Avg Order"
          value={`KES ${formatKES(salesReport.avg_order_value)}`}
          icon="trending-up-outline"
          color="#0A84FF"
        />
        <StatCard
          label="Refunds"
          value={`KES ${formatKES(salesReport.refund_total)}`}
          icon="arrow-undo-outline"
          color="#FF453A"
        />
      </View>

      {/* ── Credit callout ── */}
      {salesReport.credit_total > 0 && (
        <View style={[styles.callout, { backgroundColor: "#BF5AF220", borderColor: "#BF5AF2" }]}>
          <Text style={{ color: "#BF5AF2", fontWeight: "700", fontSize: 13 }}>
            KES {formatKES(salesReport.credit_total)} in unsettled credit sales
          </Text>
        </View>
      )}

      {/* ── Daily revenue line chart ── */}
      {dailyRevenue.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Daily Revenue
          </Text>
          <LineChart
            data={{
              labels:   dailyLabels.length > 7
                ? dailyLabels.filter((_, i) => i % Math.ceil(dailyLabels.length / 7) === 0)
                : dailyLabels,
              datasets: [{ data: dailyRevenue.length > 0 ? dailyRevenue : [0] }],
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

      {/* ── Payment method breakdown ── */}
      {paymentTotals.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Payment Methods
          </Text>
          {salesReport.payment_breakdown.map((p) => {
            const pct = salesReport.total_revenue > 0
              ? (p.total / salesReport.total_revenue) * 100
              : 0;
            const barColor = METHOD_COLORS[p.method] ?? colors.accent;
            return (
              <View
                key={p.method}
                style={[styles.methodRow, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.methodLabelRow}>
                    <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
                      {p.method}
                    </Text>
                    <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
                      {p.count} txns · KES {formatKES(p.total)}
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View style={[
                      styles.barFill,
                      { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor },
                    ]} />
                  </View>
                </View>
                <Text style={{ color: barColor, fontWeight: "700", fontSize: 13, marginLeft: 12 }}>
                  {pct.toFixed(0)}%
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardRow:        { flexDirection: "row", gap: 8 },
  callout:        { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  sectionLabel:   { fontSize: 14, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  chart:          { borderRadius: 12, borderWidth: 1 },
  methodRow:      { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  methodLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  barTrack:       { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill:        { height: 6, borderRadius: 3 },
});