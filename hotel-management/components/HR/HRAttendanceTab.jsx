// components/HR/HRAttendanceTab.jsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useHR } from "../../context/HRContext";

const STATUS_COLORS = {
  PRESENT:  "#30D158",
  LATE:     "#FF9F0A",
  HALF_DAY: "#0A84FF",
  ABSENT:   "#FF453A",
};

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function HRAttendanceTab() {
  const { colors } = useTheme();
  const {
    todayAttendance,
    loadTodayAttendance,
    employeeAttendance,
    loadEmployeeAttendance,
    employees,
    loadEmployees,
    selfCheckIn,
    selfCheckOut,
    recordAttendance,
    loading,
    attendanceLoading,
  } = useHR();

  const now = new Date();
  const [viewMode, setViewMode]               = useState("today"); // today | monthly
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedYear, setSelectedYear]         = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth]       = useState(now.getMonth() + 1);
  const [showRecordModal, setShowRecordModal]   = useState(false);
  const [recordForm, setRecordForm]             = useState({
    employee_id:     "",
    attendance_date: now.toISOString().split("T")[0],
    status:          "PRESENT",
    time_in:         "09:00",
    time_out:        "",
    notes:           "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTodayAttendance();
    loadEmployees();
  }, []);

  useEffect(() => {
    if (viewMode === "monthly" && selectedEmployee) {
      loadEmployeeAttendance(selectedEmployee.id, selectedYear, selectedMonth);
    }
  }, [viewMode, selectedEmployee, selectedYear, selectedMonth]);

  const handleSelfCheckIn = async () => {
    try {
      await selfCheckIn();
      Alert.alert("Checked In", "You have successfully checked in.");
      loadTodayAttendance();
    } catch (err) {
      Alert.alert("Error", err?.message || "Check-in failed.");
    }
  };

  const handleSelfCheckOut = async () => {
    try {
      await selfCheckOut();
      Alert.alert("Checked Out", "You have successfully checked out.");
      loadTodayAttendance();
    } catch (err) {
      Alert.alert("Error", err?.message || "Check-out failed.");
    }
  };

  const handleRecordAttendance = async () => {
    if (!recordForm.employee_id)
      return Alert.alert("Validation", "Select an employee.");
    if (!recordForm.attendance_date)
      return Alert.alert("Validation", "Date is required.");

    try {
      setSaving(true);
      await recordAttendance({
        employee_id:     recordForm.employee_id,
        attendance_date: recordForm.attendance_date,
        status:          recordForm.status,
        time_in:         recordForm.time_in || null,
        time_out:        recordForm.time_out || null,
        notes:           recordForm.notes || null,
      });
      setShowRecordModal(false);
      loadTodayAttendance();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to record attendance.");
    } finally {
      setSaving(false);
    }
  };

  const renderAttendanceRow = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] ?? colors.tabBarInactive;
    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
            {item.employee_name ?? item.employee?.name ?? "—"}
          </Text>
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
            {item.time_in ? `In: ${item.time_in}` : "No check-in"}
            {item.time_out ? `  •  Out: ${item.time_out}` : ""}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text style={{ color: statusColor, fontWeight: "700", fontSize: 11 }}>
            {item.status}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>

      {/* ── Self check-in/out buttons ── */}
      <View style={[styles.selfRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.selfBtn, { backgroundColor: "#30D15820", borderColor: "#30D158" }]}
          onPress={handleSelfCheckIn}
        >
          <Ionicons name="log-in-outline" size={18} color="#30D158" />
          <Text style={{ color: "#30D158", fontWeight: "700", marginLeft: 6 }}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selfBtn, { backgroundColor: "#FF453A20", borderColor: "#FF453A" }]}
          onPress={handleSelfCheckOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#FF453A" />
          <Text style={{ color: "#FF453A", fontWeight: "700", marginLeft: 6 }}>Check Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── View mode toggle ── */}
      <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
        {["today", "monthly"].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.toggleBtn,
              viewMode === mode && { borderBottomWidth: 2, borderBottomColor: colors.accent },
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={{
              color:      viewMode === mode ? colors.accent : colors.tabBarInactive,
              fontWeight: viewMode === mode ? "700" : "400",
              fontSize:   14,
            }}>
              {mode === "today" ? "Today" : "Monthly"}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.recordBtn, { backgroundColor: colors.accent }]}
          onPress={() => setShowRecordModal(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12, marginLeft: 4 }}>
            Record
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Monthly controls ── */}
      {viewMode === "monthly" && (
        <View style={[styles.monthlyControls, { borderBottomColor: colors.border }]}>
          {/* Employee picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {employees.map((emp) => (
              <TouchableOpacity
                key={emp.id}
                style={[
                  styles.empPill,
                  {
                    backgroundColor: selectedEmployee?.id === emp.id ? colors.accent : colors.background,
                    borderColor:     selectedEmployee?.id === emp.id ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setSelectedEmployee(emp)}
              >
                <Text style={{ color: selectedEmployee?.id === emp.id ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>
                  {emp.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Month picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.monthPill,
                  {
                    backgroundColor: selectedMonth === i + 1 ? colors.accent : colors.background,
                    borderColor:     selectedMonth === i + 1 ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setSelectedMonth(i + 1)}
              >
                <Text style={{ color: selectedMonth === i + 1 ? "#fff" : colors.text, fontSize: 12 }}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── List ── */}
      {attendanceLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={viewMode === "today" ? todayAttendance : employeeAttendance}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderAttendanceRow}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={
            <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
              {viewMode === "today"
                ? "No attendance recorded today."
                : selectedEmployee
                  ? "No records for this period."
                  : "Select an employee to view attendance."}
            </Text>
          }
        />
      )}

      {/* ── Record Attendance Modal ── */}
      <Modal
        visible={showRecordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRecordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Record Attendance</Text>
              <TouchableOpacity onPress={() => setShowRecordModal(false)}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Employee */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Employee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {employees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: recordForm.employee_id === emp.id ? colors.accent : colors.background,
                        borderColor:     recordForm.employee_id === emp.id ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setRecordForm((p) => ({ ...p, employee_id: emp.id }))}
                  >
                    <Text style={{ color: recordForm.employee_id === emp.id ? "#fff" : colors.text, fontSize: 12 }}>
                      {emp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Date */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={recordForm.attendance_date}
                onChangeText={(v) => setRecordForm((p) => ({ ...p, attendance_date: v }))}
                placeholder="2026-03-20"
                placeholderTextColor={colors.tabBarInactive}
              />

              {/* Status */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Status</Text>
              <View style={styles.pillRow}>
                {["PRESENT", "ABSENT", "LATE", "HALF_DAY"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: recordForm.status === s ? STATUS_COLORS[s] : colors.background,
                        borderColor:     recordForm.status === s ? STATUS_COLORS[s] : colors.border,
                      },
                    ]}
                    onPress={() => setRecordForm((p) => ({ ...p, status: s }))}
                  >
                    <Text style={{ color: recordForm.status === s ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>
                      {s.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time In */}
              {recordForm.status !== "ABSENT" && (
                <>
                  <Text style={[styles.label, { color: colors.tabBarInactive }]}>Time In (HH:MM)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    value={recordForm.time_in}
                    onChangeText={(v) => setRecordForm((p) => ({ ...p, time_in: v }))}
                    placeholder="09:00"
                    placeholderTextColor={colors.tabBarInactive}
                  />

                  <Text style={[styles.label, { color: colors.tabBarInactive }]}>
                    Time Out (HH:MM) <Text style={{ fontSize: 11 }}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    value={recordForm.time_out}
                    onChangeText={(v) => setRecordForm((p) => ({ ...p, time_out: v }))}
                    placeholder="17:00"
                    placeholderTextColor={colors.tabBarInactive}
                  />
                </>
              )}

              {/* Notes */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>
                Notes <Text style={{ fontSize: 11 }}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, minHeight: 60, textAlignVertical: "top" }]}
                value={recordForm.notes}
                onChangeText={(v) => setRecordForm((p) => ({ ...p, notes: v }))}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.tabBarInactive}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
                onPress={handleRecordAttendance}
                disabled={saving}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  {saving ? "Saving..." : "Save Attendance"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selfRow:         { flexDirection: "row", gap: 12, padding: 16, borderBottomWidth: 1 },
  selfBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 10, borderWidth: 1 },
  toggleRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1 },
  toggleBtn:       { paddingVertical: 12, marginRight: 20 },
  recordBtn:       { flexDirection: "row", alignItems: "center", marginLeft: "auto", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  monthlyControls: { padding: 12, borderBottomWidth: 1 },
  empPill:         { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  monthPill:       { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  row:             { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  statusBadge:     { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  modalOverlay:    { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%" },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle:      { fontSize: 18, fontWeight: "700" },
  label:           { fontSize: 13, marginTop: 12, marginBottom: 4 },
  input:           { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  pillRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pill:            { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  saveBtn:         { marginTop: 24, padding: 13, borderRadius: 10, alignItems: "center", marginBottom: 32 },
});