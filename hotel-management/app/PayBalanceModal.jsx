// app/PayBalanceModal.jsx
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
  Alert,
} from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "../theme/colors";
import { useExpenses } from "../context/ExpensesContext";

export default function PayBalanceModal({ visible, onClose, expenseId }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

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

  const handlePay = () => {
    const val = Number(amount || 0);

    if (val <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid amount.");
      return;
    }

    if (val > balance) {
      Alert.alert("Too Much", "Amount exceeds outstanding balance.");
      return;
    }

    // Backend handles:
    // - creating new expense record
    // - timestamp
    // - payment_group_id linking
    payBalance(expenseId, val);

    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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
            <Text style={[styles.title, { color: theme.text }]}>
              Pay Balance
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.accent, fontWeight: "600" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ color: theme.text }}>
            Product: {expense.product_name}
          </Text>
          <Text style={{ color: theme.text }}>
            Supplier: {expense.supplier || "N/A"}
          </Text>

          <Text style={{ color: theme.text, marginVertical: 12 }}>
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
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Submit Payment
            </Text>
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
    marginBottom: 12,
  },
  payBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});