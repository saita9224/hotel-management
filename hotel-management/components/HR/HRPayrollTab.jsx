// components/HR/HRPayrollTab.jsx

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
  DRAFT:    "#8E8E93",
  APPROVED: "#0A84FF",
  PARTIAL:  "#FF9F0A",
  PAID:     "#30D158",
};

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MPESA"];
const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function HRPayrollTab() {
  const { colors } = useTheme();
  const {
    salaryRecords,
    loadSalaryRecords,
    employees,
    loadEmployees,
    generatePayslip,
    approvePayslip,
    addSalaryPayment,
    salaryPayments,
    loadSalaryPayments,
    loading,
    payrollLoading,
  } = useHR();

  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal]   = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [selectedRecord, setSelectedRecord]       = useState(null);
  const [generateForm, setGenerateForm]           = useState({
    employee_id: "",
    deductions:  "0",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount:         "",
    payment_method: "CASH",
    reference:      "",
    notes:          "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadSalaryRecords({ year: selectedYear, month: selectedMonth });
  }, [selectedYear, selectedMonth]);

  const handleGeneratePayslip = async () => {
    if (!generateForm.employee_id)
      return Alert.alert("Validation", "Select an employee.");

    try {
      setSaving(true);
      await generatePayslip({
        employee_id: generateForm.employee_id,
        year:        selectedYear,
        month:       selectedMonth,
        deductions:  Number(generateForm.deductions || 0),
      });
      setShowGenerateModal(false);
      loadSalaryRecords({ year: selectedYear, month: selectedMonth });
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to generate payslip.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePayslip = async (record) => {
    Alert.alert(
      "Approve Payslip",
      `Approve payslip for ${record.employee?.name}? Net: KES ${formatKES(record.net_amount)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await approvePayslip(record.id);
              loadSalaryRecords({ year: selectedYear, month: selectedMonth });
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to approve payslip.");
            }
          },
        },
      ]
    );
  };

  const handleAddPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0)
      return Alert.alert("Validation", "Enter a valid amount.");

    try {
      setSaving(true);
      await addSalaryPayment({
        salary_record_id: selectedRecord.id,
        amount:           Number(paymentForm.amount),
        payment_method:   paymentForm.payment_method,
        reference:        paymentForm.reference || null,
        notes:            paymentForm.notes || null,
      });
      setShowPaymentModal(false);
      loadSalaryRecords({ year: selectedYear, month: selectedMonth });
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const openPayments = async (record) => {
    setSelectedRecord(record);
    await loadSalaryPayments(record.id);
    setShowPaymentsModal(true);
  };

  const renderRecord = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] ?? colors.tabBarInactive;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Header row */}
        <View style={styles.rowBetween}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
            {item.employee?.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={{ color: statusColor, fontWeight: "700", fontSize: 11 }}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Amounts */}
        <View style={[styles.amountRow, { borderTopColor: colors.border, marginTop: 10 }]}>
          <View style={styles.amountCol}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>Gross</Text>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
              KES {formatKES(item.gross_amount)}
            </Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>Deductions</Text>
            <Text style={{ color: "#FF453A", fontWeight: "600", fontSize: 14 }}>
              KES {formatKES(item.deductions)}
            </Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>Net</Text>
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 14 }}>
              KES {formatKES(item.net_amount)}
            </Text>
          </View>
        </View>

        {/* Attendance summary */}
        <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 8 }}>
          {item.days_present}/{item.working_days} days present
          {Number(item.days_on_leave) > 0
            ? `  •  ${item.days_on_leave} leave days`
            : ""}
        </Text>

        {/* Balance */}
        {item.status !== "DRAFT" && (
          <View style={[styles.balanceRow, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
              Paid: KES {formatKES(item.total_paid)}
            </Text>
            <Text style={{
              color:      Number(item.balance) > 0 ? "#FF9F0A" : "#30D158",
              fontWeight: "700",
              fontSize:   13,
            }}>
              Balance: KES {formatKES(item.balance)}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {item.status === "DRAFT" && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#0A84FF20", borderColor: "#0A84FF" }]}
              onPress={() => handleApprovePayslip(item)}
            >
              <Text style={{ color: "#0A84FF", fontWeight: "600", fontSize: 12 }}>Approve</Text>
            </TouchableOpacity>
          )}

          {(item.status === "APPROVED" || item.status === "PARTIAL") && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#30D15820", borderColor: "#30D158" }]}
              onPress={() => {
                setSelectedRecord(item);
                setPaymentForm({ amount: "", payment_method: "CASH", reference: "", notes: "" });
                setShowPaymentModal(true);
              }}
            >
              <Text style={{ color: "#30D158", fontWeight: "600", fontSize: 12 }}>Add Payment</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => openPayments(item)}
          >
            <Text style={{ color: colors.tabBarInactive, fontWeight: "600", fontSize: 12 }}>
              Payments ({item.payments?.length ?? 0})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>

      {/* ── Month/Year selector ── */}
      <View style={[styles.periodRow, { borderBottomColor: colors.border }]}>
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
                {m} {selectedYear}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            setGenerateForm({ employee_id: "", deductions: "0" });
            setShowGenerateModal(true);
          }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12, marginLeft: 4 }}>
            Generate
          </Text>
        </TouchableOpacity>
      </View>

      {payrollLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={salaryRecords}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderRecord}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={
            <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
              No payslips for this period.
            </Text>
          }
        />
      )}

      {/* ── Generate Payslip Modal ── */}
      <Modal
        visible={showGenerateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Generate Payslip — {MONTHS[selectedMonth - 1]} {selectedYear}
              </Text>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Employee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {employees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: generateForm.employee_id === emp.id ? colors.accent : colors.background,
                        borderColor:     generateForm.employee_id === emp.id ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setGenerateForm((p) => ({ ...p, employee_id: emp.id }))}
                  >
                    <Text style={{ color: generateForm.employee_id === emp.id ? "#fff" : colors.text, fontSize: 12 }}>
                      {emp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: colors.tabBarInactive }]}>
                Deductions (KES) <Text style={{ fontSize: 11 }}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={generateForm.deductions}
                onChangeText={(v) => setGenerateForm((p) => ({ ...p, deductions: v }))}
                placeholder="0.00"
                placeholderTextColor={colors.tabBarInactive}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
                onPress={handleGeneratePayslip}
                disabled={saving}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  {saving ? "Generating..." : "Generate Payslip"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Payment Modal ── */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Add Payment
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            {selectedRecord && (
              <View style={[styles.balanceBanner, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {selectedRecord.employee?.name}
                </Text>
                <Text style={{ color: "#FF9F0A", fontWeight: "700", fontSize: 15, marginTop: 4 }}>
                  Balance: KES {formatKES(selectedRecord.balance)}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>Amount (KES)</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={paymentForm.amount}
              onChangeText={(v) => setPaymentForm((p) => ({ ...p, amount: v }))}
              placeholder="0.00"
              placeholderTextColor={colors.tabBarInactive}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>Payment Method</Text>
            <View style={styles.pillRow}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: paymentForm.payment_method === m ? colors.accent : colors.background,
                      borderColor:     paymentForm.payment_method === m ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setPaymentForm((p) => ({ ...p, payment_method: m }))}
                >
                  <Text style={{ color: paymentForm.payment_method === m ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>
                    {m.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>
              Reference <Text style={{ fontSize: 11 }}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={paymentForm.reference}
              onChangeText={(v) => setPaymentForm((p) => ({ ...p, reference: v }))}
              placeholder="M-Pesa code, cheque no..."
              placeholderTextColor={colors.tabBarInactive}
            />

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>
              Notes <Text style={{ fontSize: 11 }}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={paymentForm.notes}
              onChangeText={(v) => setPaymentForm((p) => ({ ...p, notes: v }))}
              placeholder="Any notes..."
              placeholderTextColor={colors.tabBarInactive}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
              onPress={handleAddPayment}
              disabled={saving}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {saving ? "Saving..." : "Record Payment"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── View Payments Modal ── */}
      <Modal
        visible={showPaymentsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Payment History
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentsModal(false)}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            {selectedRecord && (
              <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginBottom: 12 }}>
                {selectedRecord.employee?.name} • {selectedRecord.period_label}
              </Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {salaryPayments.length === 0 ? (
                <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 20 }}>
                  No payments recorded yet.
                </Text>
              ) : (
                salaryPayments.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.paymentRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                        KES {formatKES(p.amount)}
                      </Text>
                      <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                        {p.payment_method.replace("_", " ")}
                        {p.reference ? `  •  ${p.reference}` : ""}
                      </Text>
                      <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 2 }}>
                        {new Date(p.paid_at).toLocaleString("en-KE", {
                          day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {p.paid_by?.name ? `  •  ${p.paid_by.name}` : ""}
                      </Text>
                      {p.notes ? (
                        <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 2, fontStyle: "italic" }}>
                          {p.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  periodRow:    { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, gap: 8 },
  monthPill:    { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  generateBtn:  { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  card:         { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  rowBetween:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge:  { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  amountRow:    { flexDirection: "row", borderTopWidth: 1, paddingTop: 10 },
  amountCol:    { flex: 1, alignItems: "center" },
  balanceRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  actions:      { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn:    { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "92%" },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle:   { fontSize: 17, fontWeight: "700" },
  balanceBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  label:        { fontSize: 13, marginTop: 12, marginBottom: 4 },
  input:        { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  pillRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pill:         { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  saveBtn:      { marginTop: 24, padding: 13, borderRadius: 10, alignItems: "center", marginBottom: 32 },
  paymentRow:   { paddingVertical: 12, borderBottomWidth: 1 },
});