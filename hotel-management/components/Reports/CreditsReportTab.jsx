// components/Reports/CreditsReportTab.jsx

import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useReports } from "../../context/ReportsContext";
import StatCard from "./StatCard";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export default function CreditsReportTab() {
  const { colors } = useTheme();
  const { creditReport, creditLoading, loadCreditReport } = useReports();

  useEffect(() => {
    loadCreditReport();
  }, []);

  if (creditLoading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />;
  }

  if (!creditReport) {
    return (
      <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 60 }}>
        No credit data available.
      </Text>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <View style={styles.cardRow}>
          <StatCard
            label="Total Credit"
            value={`KES ${formatKES(creditReport.total_credit)}`}
            icon="card-outline"
            color="#BF5AF2"
          />
          <StatCard
            label="Overdue"
            value={`KES ${formatKES(creditReport.overdue_amount)}`}
            icon="alert-circle-outline"
            color="#FF453A"
            subtitle={creditReport.overdue_count > 0
              ? `${creditReport.overdue_count} account${creditReport.overdue_count > 1 ? "s" : ""}`
              : null}
          />
        </View>
      </View>

      <FlatList
        data={creditReport.accounts}
        keyExtractor={(item) => item.receipt_number}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
        ListEmptyComponent={
          <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
            No unsettled credit accounts.
          </Text>
        }
        renderItem={({ item }) => {
          const borderColor = item.is_overdue ? "#FF453A" : colors.border;
          const bgColor     = item.is_overdue ? "#FF453A08" : colors.card;

          return (
            <View style={[styles.creditCard, { backgroundColor: bgColor, borderColor }]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                    {item.customer_name}
                  </Text>
                  {item.customer_phone ? (
                    <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                      {item.customer_phone}
                    </Text>
                  ) : null}
                  <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                    {item.receipt_number}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                    KES {formatKES(item.credit_amount)}
                  </Text>
                  <View style={styles.dueDateRow}>
                    {item.is_overdue && (
                      <Ionicons name="alert-circle" size={12} color="#FF453A" />
                    )}
                    <Text style={{
                      color:     item.is_overdue ? "#FF453A" : colors.tabBarInactive,
                      fontSize:  12,
                      marginLeft: 4,
                      fontWeight: item.is_overdue ? "700" : "400",
                    }}>
                      {item.is_overdue ? "OVERDUE · " : "Due: "}
                      {item.due_date}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardRow:    { flexDirection: "row", gap: 8, marginBottom: 16 },
  creditCard: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  dueDateRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
});