// components/Reports/PayrollReportTab.jsx

import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { useReports } from "../../context/ReportsContext";
import StatCard from "./StatCard";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const STATUS_COLORS = {
  DRAFT:    "#8E8E93",
  APPROVED: "#0A84FF",
  PARTIAL:  "#FF9F0A",
  PAID:     "#30D158",
};

export default function PayrollReportTab({ year, month }) {
  const { colors } = useTheme();
  const { payrollReport, payrollLoading, loadPayrollReport } = useReports();

  useEffect(() => {
    if (year && month) {
      loadPayrollReport(year, month);
    }
  }, [year, month]);

  if (payrollLoading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />;
  }

  if (!payrollReport) {
    return (
      <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 60 }}>
        No payroll data for this period.
      </Text>
    );
  }

  const maxNet = Math.max(
    ...payrollReport.per_employee.map((e) => e.net_amount),
    1,
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* ── Stat cards ── */}
      <View style={styles.cardRow}>
        <StatCard
          label="Total Net"
          value={`KES ${formatKES(payrollReport.total_net)}`}
          icon="cash-outline"
          color={colors.accent}
        />
        <StatCard
          label="Total Paid"
          value={`KES ${formatKES(payrollReport.total_paid)}`}
          icon="checkmark-circle-outline"
          color="#30D158"
        />
      </View>

      {payrollReport.total_outstanding > 0 && (
        <View style={[styles.callout, { backgroundColor: "#FF9F0A20", borderColor: "#FF9F0A" }]}>
          <Text style={{ color: "#FF9F0A", fontWeight: "700", fontSize: 13 }}>
            KES {formatKES(payrollReport.total_outstanding)} outstanding payroll
          </Text>
        </View>
      )}

      {/* ── Per employee bars ── */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>
        Per Employee
      </Text>

      {payrollReport.per_employee.map((emp) => {
        const statusColor = STATUS_COLORS[emp.status] ?? colors.tabBarInactive;
        const netPct      = (emp.net_amount / maxNet) * 100;
        const paidPct     = emp.net_amount > 0
          ? Math.min((emp.total_paid / emp.net_amount) * 100, 100)
          : 0;

        return (
          <View
            key={emp.employee_id}
            style={[styles.empCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                {emp.employee_name}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
                <Text style={{ color: statusColor, fontSize: 11, fontWeight: "700" }}>
                  {emp.status}
                </Text>
              </View>
            </View>

            {/* Net salary bar */}
            <View style={[styles.barTrack, { backgroundColor: colors.border, marginTop: 10 }]}>
              <View style={[styles.barFill, { width: `${netPct}%`, backgroundColor: colors.accent + "40" }]} />
            </View>

            {/* Paid bar overlaid */}
            <View style={[styles.barTrack, { backgroundColor: "transparent", marginTop: 2 }]}>
              <View style={[styles.barFill, { width: `${paidPct}%`, backgroundColor: "#30D158" }]} />
            </View>

            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
                Net: KES {formatKES(emp.net_amount)}
              </Text>
              <Text style={{ color: "#30D158", fontSize: 12, fontWeight: "600" }}>
                Paid: KES {formatKES(emp.total_paid)}
              </Text>
              {emp.balance > 0 && (
                <Text style={{ color: "#FF9F0A", fontSize: 12, fontWeight: "600" }}>
                  Due: KES {formatKES(emp.balance)}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardRow:      { flexDirection: "row", gap: 8 },
  callout:      { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  sectionLabel: { fontSize: 14, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  empCard:      { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  rowBetween:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill:   { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  barTrack:     { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill:      { height: 6, borderRadius: 3 },
});