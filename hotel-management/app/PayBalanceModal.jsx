// app/PayBalanceModal.jsx
import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "./theme/colors";
import { useExpenses } from "./context/ExpensesContext";

export default function PayBalanceModal({ visible, onClose, expenseId }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const { expenses, payments, payBalance } = useExpenses();

  const [amount, setAmount] = useState("");

  // get full expense object
  const expense = useMemo(
    () => expenses.find((e) => e.id === expenseId),
    [expenseId, visible, expenses]
  );

  if (!expense) return null;

  // get payments for this expense
  const relatedPayments = useMemo(
    () => payments.filter((p) => p.expense_id === expenseId),
    [payments, expenseId]
  );

  // total paid = original + history
  const totalPaid = useMemo(() => {
    const p1 = Number(expense.paid || 0);
    const p2 = relatedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return p1 + p2;
  }, [expense, relatedPayments]);

  // total cost
  const totalAmount = Number(expense.total_amount || 0);

  // current balance
  const balance = Math.max(totalAmount - totalPaid, 0);

  const handlePay = () => {
    const val = Number(amount || 0);
    if (val <= 0) return;

    if (val > balance) {
      alert("Amount is greater than outstanding balance.");
      return;
    }

    // NEW RULE:
    // payBalance(expenseId, amount)
    // model layer adds timestamp + creates payment record
    payBalance(expenseId, val);

    setAmount("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>Pay Balance</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.accent, fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: theme.text }}>Product: {expense.product_name}</Text>
          <Text style={{ color: theme.text, marginBottom: 6 }}>
            Supplier: {expense.supplier || "N/A"}
          </Text>

          <Text style={{ color: theme.text, marginBottom: 12 }}>
            Outstanding: KES {balance.toFixed(2)}
          </Text>

          <TextInput
            placeholder="Amount to pay"
            placeholderTextColor={theme.tabBarInactive}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />

          <TouchableOpacity
            onPress={handlePay}
            style={[styles.payBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Submit Payment</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  payBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
