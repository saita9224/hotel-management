// components/Reports/InventoryReportTab.jsx

import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { useReports } from "../../context/ReportsContext";
import StatCard from "./StatCard";

const STATUS_COLORS = {
  OK:  "#30D158",
  LOW: "#FF9F0A",
  OUT: "#FF453A",
};

export default function InventoryReportTab({ startDate, endDate }) {
  const { colors } = useTheme();
  const { stockReport, stockLoading, loadStockReport } = useReports();
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (startDate && endDate) {
      loadStockReport(startDate, endDate);
    }
  }, [startDate, endDate]);

  const okCount  = stockReport.filter((p) => p.status === "OK").length;
  const lowCount = stockReport.filter((p) => p.status === "LOW").length;
  const outCount = stockReport.filter((p) => p.status === "OUT").length;

  const filtered = filter === "ALL"
    ? stockReport
    : stockReport.filter((p) => p.status === filter);

  const maxStock = Math.max(...stockReport.map((p) => p.current_stock), 1);

  if (stockLoading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>

        {/* ── Stat cards ── */}
        <View style={styles.cardRow}>
          <StatCard label="OK"  value={okCount}  icon="checkmark-circle-outline" color="#30D158" />
          <StatCard label="Low" value={lowCount} icon="warning-outline"           color="#FF9F0A" />
          <StatCard label="Out" value={outCount} icon="close-circle-outline"      color="#FF453A" />
        </View>

        {/* ── Filter pills ── */}
        <View style={styles.filterRow}>
          {["ALL", "OK", "LOW", "OUT"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                {
                  backgroundColor: filter === f
                    ? (STATUS_COLORS[f] ?? colors.accent)
                    : colors.background,
                  borderColor: filter === f
                    ? (STATUS_COLORS[f] ?? colors.accent)
                    : colors.border,
                },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={{
                color:      filter === f ? "#fff" : colors.tabBarInactive,
                fontSize:   12,
                fontWeight: filter === f ? "700" : "400",
              }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Product list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
        ListEmptyComponent={
          <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
            No products found.
          </Text>
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status];
          const stockPct    = Math.min((item.current_stock / maxStock) * 100, 100);

          return (
            <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14, flex: 1 }} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
                  <Text style={{ color: statusColor, fontSize: 11, fontWeight: "700" }}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Stock bar */}
              <View style={[styles.barTrack, { backgroundColor: colors.border, marginTop: 10 }]}>
                <View style={[
                  styles.barFill,
                  { width: `${stockPct}%`, backgroundColor: statusColor },
                ]} />
              </View>

              <View style={styles.rowBetween}>
                <Text style={{ color: statusColor, fontWeight: "700", fontSize: 13, marginTop: 6 }}>
                  {item.current_stock} {item.unit}
                </Text>
                <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 6 }}>
                  +{item.total_in} in · -{item.total_out} out
                  {item.total_adjustments !== 0
                    ? ` · ${item.total_adjustments > 0 ? "+" : ""}${item.total_adjustments} adj`
                    : ""}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardRow:     { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterRow:   { flexDirection: "row", gap: 8 },
  filterPill:  { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  productCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowBetween:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill:  { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  barTrack:    { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill:     { height: 6, borderRadius: 3 },
});