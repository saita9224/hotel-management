// components/HR/HREmployeesTab.jsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useHR } from "../../context/HRContext";

export default function HREmployeesTab() {
  const { colors } = useTheme();
  const {
    employees,
    loadEmployees,
    loading,
    createContract,
    updateContract,
  } = useHR();

  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee]   = useState(null);
  const [contractForm, setContractForm]           = useState({
    department:            "",
    position:              "",
    employment_type:       "FULL_TIME",
    date_hired:            "",
    base_monthly:          "",
    check_in_time:         "09:00",
    late_threshold_mins:   "15",
    working_days_per_week: "5",
    leave_pay_policy:      "FULL_PAY",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const updateField = (key, value) =>
    setContractForm((prev) => ({ ...prev, [key]: value }));

  const openContractModal = (employee) => {
    setSelectedEmployee(employee);
    // Pre-fill if contract exists
    if (employee.contract) {
      setContractForm({
        department:            employee.contract.department,
        position:              employee.contract.position,
        employment_type:       employee.contract.employment_type,
        date_hired:            employee.contract.date_hired,
        base_monthly:          String(employee.contract.base_monthly),
        check_in_time:         employee.contract.check_in_time,
        late_threshold_mins:   String(employee.contract.late_threshold_mins),
        working_days_per_week: String(employee.contract.working_days_per_week),
        leave_pay_policy:      employee.contract.leave_pay_policy,
      });
    } else {
      setContractForm({
        department:            "",
        position:              "",
        employment_type:       "FULL_TIME",
        date_hired:            "",
        base_monthly:          "",
        check_in_time:         "09:00",
        late_threshold_mins:   "15",
        working_days_per_week: "5",
        leave_pay_policy:      "FULL_PAY",
      });
    }
    setShowContractModal(true);
  };

  const saveContract = async () => {
    if (!contractForm.department.trim())
      return Alert.alert("Validation", "Department is required.");
    if (!contractForm.position.trim())
      return Alert.alert("Validation", "Position is required.");
    if (!contractForm.base_monthly || Number(contractForm.base_monthly) <= 0)
      return Alert.alert("Validation", "Base monthly salary is required.");
    if (!contractForm.date_hired.trim())
      return Alert.alert("Validation", "Date hired is required.");

    try {
      setSaving(true);
      if (selectedEmployee.contract) {
        await updateContract({
          contract_id:           selectedEmployee.contract.id,
          department:            contractForm.department,
          position:              contractForm.position,
          employment_type:       contractForm.employment_type,
          base_monthly:          Number(contractForm.base_monthly),
          check_in_time:         contractForm.check_in_time,
          late_threshold_mins:   Number(contractForm.late_threshold_mins),
          working_days_per_week: Number(contractForm.working_days_per_week),
          leave_pay_policy:      contractForm.leave_pay_policy,
        });
      } else {
        await createContract({
          employee_id:           selectedEmployee.id,
          department:            contractForm.department,
          position:              contractForm.position,
          employment_type:       contractForm.employment_type,
          date_hired:            contractForm.date_hired,
          base_monthly:          Number(contractForm.base_monthly),
          check_in_time:         contractForm.check_in_time,
          late_threshold_mins:   Number(contractForm.late_threshold_mins),
          working_days_per_week: Number(contractForm.working_days_per_week),
          leave_pay_policy:      contractForm.leave_pay_policy,
        });
      }
      setShowContractModal(false);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to save contract.");
    } finally {
      setSaving(false);
    }
  };

  const EMPLOYMENT_TYPES  = ["FULL_TIME", "PART_TIME", "CONTRACT"];
  const LEAVE_PAY_POLICIES = ["FULL_PAY", "HALF_PAY", "NO_PAY"];

  const renderEmployee = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 2 }}>
            {item.email}
          </Text>
          {item.contract ? (
            <Text style={{ color: colors.accent, fontSize: 12, marginTop: 4 }}>
              {item.contract.position} • {item.contract.department}
            </Text>
          ) : (
            <Text style={{ color: "#FF9F0A", fontSize: 12, marginTop: 4 }}>
              No contract
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.contractBtn, { borderColor: colors.accent }]}
          onPress={() => openContractModal(item)}
        >
          <Ionicons name="document-text-outline" size={16} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 12, marginLeft: 4, fontWeight: "600" }}>
            {item.contract ? "Edit" : "Add"} Contract
          </Text>
        </TouchableOpacity>
      </View>

      {item.contract && (
        <View style={[styles.contractSummary, { borderTopColor: colors.border }]}>
          <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
            Base: KES {Number(item.contract.base_monthly).toLocaleString()}
            {"  •  "}
            {item.contract.employment_type.replace("_", " ")}
            {"  •  "}
            Check-in: {item.contract.check_in_time}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderEmployee}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={
            <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
              No employees found.
            </Text>
          }
        />
      )}

      {/* ── Contract Modal ── */}
      <Modal
        visible={showContractModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContractModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedEmployee?.contract ? "Edit Contract" : "Create Contract"}
              </Text>
              <TouchableOpacity onPress={() => setShowContractModal(false)}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.employeeName, { color: colors.accent }]}>
                {selectedEmployee?.name}
              </Text>

              {/* Department */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Department</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g. Kitchen, Front Desk"
                placeholderTextColor={colors.tabBarInactive}
                value={contractForm.department}
                onChangeText={(v) => updateField("department", v)}
              />

              {/* Position */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Position</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g. Head Chef, Receptionist"
                placeholderTextColor={colors.tabBarInactive}
                value={contractForm.position}
                onChangeText={(v) => updateField("position", v)}
              />

              {/* Date Hired */}
              {!selectedEmployee?.contract && (
                <>
                  <Text style={[styles.label, { color: colors.tabBarInactive }]}>Date Hired (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    placeholder="2024-01-15"
                    placeholderTextColor={colors.tabBarInactive}
                    value={contractForm.date_hired}
                    onChangeText={(v) => updateField("date_hired", v)}
                  />
                </>
              )}

              {/* Base Monthly */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Base Monthly (KES)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="0.00"
                placeholderTextColor={colors.tabBarInactive}
                keyboardType="numeric"
                value={contractForm.base_monthly}
                onChangeText={(v) => updateField("base_monthly", v)}
              />

              {/* Check-in Time */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Check-in Time (HH:MM)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="09:00"
                placeholderTextColor={colors.tabBarInactive}
                value={contractForm.check_in_time}
                onChangeText={(v) => updateField("check_in_time", v)}
              />

              {/* Late Threshold */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Late Threshold (mins)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="15"
                placeholderTextColor={colors.tabBarInactive}
                keyboardType="numeric"
                value={contractForm.late_threshold_mins}
                onChangeText={(v) => updateField("late_threshold_mins", v)}
              />

              {/* Working Days Per Week */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Working Days / Week</Text>
              <View style={styles.pillRow}>
                {["5", "6"].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: contractForm.working_days_per_week === d ? colors.accent : colors.background,
                        borderColor:     contractForm.working_days_per_week === d ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => updateField("working_days_per_week", d)}
                  >
                    <Text style={{ color: contractForm.working_days_per_week === d ? "#fff" : colors.text, fontWeight: "600" }}>
                      {d} days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Employment Type */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Employment Type</Text>
              <View style={styles.pillRow}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: contractForm.employment_type === t ? colors.accent : colors.background,
                        borderColor:     contractForm.employment_type === t ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => updateField("employment_type", t)}
                  >
                    <Text style={{ color: contractForm.employment_type === t ? "#fff" : colors.text, fontWeight: "600", fontSize: 12 }}>
                      {t.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Leave Pay Policy */}
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Leave Pay Policy</Text>
              <View style={styles.pillRow}>
                {LEAVE_PAY_POLICIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: contractForm.leave_pay_policy === p ? colors.accent : colors.background,
                        borderColor:     contractForm.leave_pay_policy === p ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => updateField("leave_pay_policy", p)}
                  >
                    <Text style={{ color: contractForm.leave_pay_policy === p ? "#fff" : colors.text, fontWeight: "600", fontSize: 12 }}>
                      {p.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
                onPress={saveContract}
                disabled={saving}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  {saving ? "Saving..." : "Save Contract"}
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
  card:            { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  rowBetween:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name:            { fontSize: 15, fontWeight: "700" },
  contractBtn:     { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  contractSummary: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  modalOverlay:    { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "92%" },
  modalHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle:      { fontSize: 18, fontWeight: "700" },
  employeeName:    { fontSize: 15, fontWeight: "600", marginBottom: 16 },
  label:           { fontSize: 13, marginTop: 12, marginBottom: 4 },
  input:           { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  pillRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pill:            { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  saveBtn:         { marginTop: 24, padding: 13, borderRadius: 10, alignItems: "center", marginBottom: 32 },
});