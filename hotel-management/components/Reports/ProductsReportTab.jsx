// components/Reports/ProductsReportTab.jsx

import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { useReports } from "../../context/ReportsContext";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function ProductsReportTab({ startDate, endDate }) {
  const { colors } = useTheme();
  const { productReport, productLoading, loadProductReport } = useReports();
  const [sortBy, setSortBy] = useState("revenue");

  useEffect(() => {
    if (startDate && endDate) {
      loadProductReport(startDate, endDate, 20);
    }
  }, [startDate, endDate]);

  if (productLoading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />;
  }

  if (!productReport.length) {
    return (
      <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 60 }}>
        No product data for this period.
      </Text>
    );
  }

  const sorted = [...productReport].sort((a, b) =>
    sortBy === "revenue"
      ? b.revenue - a.revenue
      : b.units_sold - a.units_sold
  );

  const maxValue = Math.max(
    ...sorted.map((p) => sortBy === "revenue" ? p.revenue : p.units_sold),
    1,
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* ── Sort toggle ── */}
      <View style={[styles.sortRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {["revenue", "units_sold"].map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.sortBtn,
              sortBy === key && { backgroundColor: colors.accent },
            ]}
            onPress={() => setSortBy(key)}
          >
            <Text style={{
              color:      sortBy === key ? "#fff" : colors.tabBarInactive,
              fontWeight: sortBy === key ? "700" : "400",
              fontSize:   13,
            }}>
              {key === "revenue" ? "By Revenue" : "By Units Sold"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Product bars ── */}
      {sorted.map((product, idx) => {
        const value   = sortBy === "revenue" ? product.revenue : product.units_sold;
        const pct     = (value / maxValue) * 100;
        const barColor = idx < 3 ? RANK_COLORS[idx] : colors.accent;

        return (
          <View
            key={product.product_id}
            style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {/* Rank */}
            <View style={[styles.rank, { backgroundColor: barColor + "20" }]}>
              <Text style={{ color: barColor, fontWeight: "700", fontSize: 13 }}>
                #{idx + 1}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              {/* Name + stats */}
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13, flex: 1 }} numberOfLines={1}>
                  {product.product_name}
                </Text>
                <Text style={{ color: barColor, fontWeight: "700", fontSize: 13 }}>
                  {sortBy === "revenue"
                    ? `KES ${formatKES(product.revenue)}`
                    : `${product.units_sold} units`}
                </Text>
              </View>

              {/* Bar */}
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View style={[
                  styles.barFill,
                  { width: `${pct}%`, backgroundColor: barColor },
                ]} />
              </View>

              {/* Secondary stat */}
              <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 4 }}>
                {sortBy === "revenue"
                  ? `${product.units_sold} units sold · ${product.order_count} orders`
                  : `KES ${formatKES(product.revenue)} revenue · ${product.order_count} orders`}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sortRow:    {
    flexDirection:  "row",
    borderWidth:    1,
    borderRadius:   10,
    padding:        4,
    marginBottom:   16,
    gap:            4,
  },
  sortBtn:    {
    flex:           1,
    paddingVertical: 8,
    borderRadius:   8,
    alignItems:     "center",
  },
  productRow: {
    flexDirection:  "row",
    alignItems:     "center",
    borderWidth:    1,
    borderRadius:   10,
    padding:        12,
    marginBottom:   8,
    gap:            12,
  },
  rank:       {
    width:          40,
    height:         40,
    borderRadius:   10,
    justifyContent: "center",
    alignItems:     "center",
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barTrack:   { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill:    { height: 6, borderRadius: 3 },
});