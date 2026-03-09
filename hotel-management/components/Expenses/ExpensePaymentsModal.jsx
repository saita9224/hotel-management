// components/Expenses/ExpensePaymentsModal.jsx

import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
} from "react-native";

import { useTheme } from "../../hooks/useTheme";  // 👈 fixed import
import { useExpenses } from "../../context/ExpensesContext";

export default function ExpensePaymentsModal({ visible, onClose, expenseId }) {
  const { colors } = useTheme();  // 👈 no more Colors/Fonts imports
  const { expenses, payBalance } = useExpenses();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!visible) setAmount("");
  }, [visible]);

  const expense = useMemo(
    () => expenses.find((e) => e.id === expenseId),
    [expenseId, expenses]
  );

  if (!expense) return null;

  const balance = Number(expense.balance ?? 0);

  const handlePay = async () => {
    const value = Number(amount || 0);
    if (value <= 0) return Alert.alert("Invalid Amount", "Enter a valid amount.");
    if (value > balance) return Alert.alert("Payment too large", "Amount exceeds outstanding balance.");

    try {
      await payBalance(expenseId, value);
      onClose();
    } catch (err) {
      Alert.alert("Payment Failed", err.message);
    }
  };

  const payments = expense.payments || [];

  const renderPayment = ({ item }) => (
    <View style={[styles.paymentRow, { borderBottomColor: colors.border }]}>
      <Text style={{ color: colors.text }}>{item.date || "Payment"}</Text>
      <Text style={{ color: colors.accent }}>KES {Number(item.amount).toFixed(2)}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Expense Payment</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.accent }}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryBox}>
            <Text style={{ color: colors.text }}>Product: {expense.item_name}</Text>
            <Text style={{ color: colors.text }}>Supplier: {expense.supplier_name || "N/A"}</Text>
            <Text style={{ color: colors.text }}>Quantity: {expense.quantity}</Text>
            <Text style={{ color: colors.text }}>Total: KES {Number(expense.total_price).toFixed(2)}</Text>
            <Text style={{ color: "#30D158" }}>Paid: KES {Number(expense.amount_paid).toFixed(2)}</Text>
            <Text style={{ color: "#FF453A", fontWeight: "600" }}>Balance: KES {balance.toFixed(2)}</Text>
          </View>

          {payments.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>
              <FlatList
                data={payments}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderPayment}
              />
            </>
          )}

          <TextInput
            placeholder="Amount to pay"
            placeholderTextColor={colors.tabBarInactive}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          />

          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: colors.accent }]}
            onPress={handlePay}
          >
            <Text style={styles.payText}>Submit Payment</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { padding: 20, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1, maxHeight: "85%" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  summaryBox: { marginBottom: 16, gap: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 14, marginBottom: 12 },
  payBtn: { padding: 14, borderRadius: 10, alignItems: "center" },
  payText: { color: "#fff", fontWeight: "700" },
});