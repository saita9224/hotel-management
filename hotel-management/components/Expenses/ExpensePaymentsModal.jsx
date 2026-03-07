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

import { useColorScheme } from "react-native";
import { Colors, Fonts } from "../../constants/theme";
import { useExpenses } from "../../context/ExpensesContext";

export default function ExpensePaymentsModal({ visible, onClose, expenseId }) {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  const { expenses, payBalance } = useExpenses();

  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!visible) setAmount("");
  }, [visible]);

  /* ---------------- FIND EXPENSE ---------------- */

  const expense = useMemo(
    () => expenses.find((e) => e.id === expenseId),
    [expenseId, expenses],
  );

  if (!expense) return null;

  const balance = Number(expense.balance ?? 0);

  /* ---------------- HANDLE PAYMENT ---------------- */

  const handlePay = async () => {
    const value = Number(amount || 0);

    if (value <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid amount.");
      return;
    }

    if (value > balance) {
      Alert.alert("Payment too large", "Amount exceeds outstanding balance.");
      return;
    }

    try {
      await payBalance(expenseId, value);
      onClose();
    } catch (err) {
      Alert.alert("Payment Failed", err.message);
    }
  };

  /* ---------------- MOCK PAYMENT HISTORY ---------------- */
  /* If backend later returns payment records,
     replace this with expense.payments */

  const payments = expense.payments || [];

  const renderPayment = ({ item }) => (
    <View style={[styles.paymentRow, { borderBottomColor: theme.icon }]}>
      <Text style={{ color: theme.text }}>{item.date || "Payment"}</Text>

      <Text style={{ color: theme.tint }}>
        KES {Number(item.amount).toFixed(2)}
      </Text>
    </View>
  );

  /* ---------------- UI ---------------- */

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
            {
              backgroundColor: theme.background,
              borderColor: theme.icon,
            },
          ]}
        >
          {/* HEADER */}

          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: theme.text, fontFamily: Fonts.sans },
              ]}
            >
              Expense Payment
            </Text>

            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.tint }}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* EXPENSE DETAILS */}

          <View style={styles.summaryBox}>
            <Text style={{ color: theme.text }}>
              Product: {expense.product_name}
            </Text>

            <Text style={{ color: theme.text }}>
              Supplier: {expense.supplier_name || "N/A"}
            </Text>

            <Text style={{ color: theme.text }}>
              Quantity: {expense.quantity}
            </Text>

            <Text style={{ color: theme.text }}>
              Total: KES {expense.total_price.toFixed(2)}
            </Text>

            <Text style={{ color: "green" }}>
              Paid: KES {expense.amount_paid.toFixed(2)}
            </Text>

            <Text style={{ color: "red", fontWeight: "600" }}>
              Balance: KES {balance.toFixed(2)}
            </Text>
          </View>

          {/* PAYMENT HISTORY */}

          {payments.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Payment History
              </Text>

              <FlatList
                data={payments}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderPayment}
              />
            </>
          )}

          {/* PAYMENT INPUT */}

          <TextInput
            placeholder="Amount to pay"
            placeholderTextColor={theme.icon}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={[
              styles.input,
              {
                borderColor: theme.icon,
                color: theme.text,
                backgroundColor: theme.background,
              },
            ]}
          />

          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: theme.tint }]}
            onPress={handlePay}
          >
            <Text style={styles.payText}>Submit Payment</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    padding: 20,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1,
    maxHeight: "85%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  summaryBox: {
    marginBottom: 16,
    gap: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 12,
  },

  payBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  payText: {
    color: "#fff",
    fontWeight: "700",
  },
});
