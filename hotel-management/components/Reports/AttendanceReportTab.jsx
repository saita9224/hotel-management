// components/Reports/AttendanceReportTab.jsx

import React, { useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { useReports } from "../../context/ReportsContext";

export default function AttendanceReportTab({ year, month }) {
  const { colors } = useTheme();
  const { attendanceReport, attendanceLoading, loadAttendanceReport } = useReports();

  useEffect(() => {
    if (year && month) {
      loadAttendanceReport(year, month);
    }
  }, [year, month]);

  if (attendanceLoading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 60 }} />;
  }

  if (!attendanceReport?.per_employee?.length) {
    return (
      <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 60 }}>
        No attendance data for this period.
      </Text>
    );
  }

  const STAT_DEFS = [
    { key: "present",  label: "Present",  color: "#30D158" },
    { key: "late",     label: "Late",     color: "#FF9F0A" },
    { key: "half_day", label: "Half Day", color: "#0A84FF" },
    { key: "absent",   label: "Absent",   color: "#FF453A" },
    { key: "on_leave", label: "Leave",    color: "#BF5AF2" },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      {/* ── Legend ── */}
      <View style={styles.legend}>
        {STAT_DEFS.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Per employee cards ── */}
      {attendanceReport.per_employee.map((emp) => {
        const total = emp.total_working_days || 1;

        return (
          <View
            key={emp.employee_id}
            style={[styles.empCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14, marginBottom: 10 }}>
              {emp.employee_name}
            </Text>

            {/* Segmented bar */}
            <View style={styles.segmentTrack}>
              {STAT_DEFS.map((s) => {
                const val = emp[s.key] ?? 0;
                const pct = (val / total) * 100;
                if (pct === 0) return null;
                return (
                  <View
                    key={s.key}
                    style={[
                      styles.segment,
                      { width: `${pct}%`, backgroundColor: s.color },
                    ]}
                  />
                );
              })}
            </View>

            {/* Stat counts */}
            <View style={styles.statRow}>
              {STAT_DEFS.map((s) => {
                const val = emp[s.key] ?? 0;
                if (val === 0) return null;
                return (
                  <View key={s.key} style={styles.statItem}>
                    <Text style={{ color: s.color, fontWeight: "700", fontSize: 14 }}>
                      {val}
                    </Text>
                    <Text style={{ color: colors.tabBarInactive, fontSize: 10, marginTop: 2 }}>
                      {s.label}
                    </Text>
                  </View>
                );
              })}
              <View style={styles.statItem}>
                <Text style={{ color: colors.tabBarInactive, fontWeight: "700", fontSize: 14 }}>
                  {emp.total_working_days}
                </Text>
                <Text style={{ color: colors.tabBarInactive, fontSize: 10, marginTop: 2 }}>
                  Working
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  legend:       { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  legendItem:   { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  empCard:      { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  segmentTrack: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: "transparent", marginBottom: 10 },
  segment:      { height: 10 },
  statRow:      { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statItem:     { alignItems: "center" },
});