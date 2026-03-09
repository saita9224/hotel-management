// components/Expenses/ExpenseForm.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useExpenses } from "../../context/ExpensesContext";
import { useTheme } from "../../hooks/useTheme";
import { createExpenseService, payBalanceService } from "../../services/expenseService";

export default function ExpenseForm({ onClose }) {
  const { loadExpenses } = useExpenses();
  const { colors } = useTheme();  // 👈 removed fonts

  const [form, setForm] = useState({
    supplier_name: "",
    item_name: "",
    quantity: "",
    unit_price: "",
    amount_paid: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const total = Number(form.quantity || 0) * Number(form.unit_price || 0);
  const paid = Number(form.amount_paid || 0);
  const balance = total - paid;

  const submit = async () => {
    if (!form.item_name.trim())
      return Alert.alert("Validation", "Item name is required.");
    if (!form.quantity || Number(form.quantity) <= 0)
      return Alert.alert("Validation", "Quantity must be greater than zero.");
    if (!form.unit_price || Number(form.unit_price) <= 0)
      return Alert.alert("Validation", "Unit price must be greater than zero.");
    if (paid < 0)
      return Alert.alert("Validation", "Amount paid cannot be negative.");
    if (paid > total)
      return Alert.alert("Validation", "Amount paid cannot exceed total price.");

    setSubmitting(true);
    try {
      const result = await createExpenseService({
        item_name: form.item_name.trim(),
        supplier_name: form.supplier_name.trim() || null,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
      });

      const expenseId = result?.createExpense?.id;

      if (expenseId && paid > 0) {
        await payBalanceService(Number(expenseId), paid);
      }

      await loadExpenses();
      onClose?.();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create expense.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.card }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>  {/* 👈 removed fontFamily */}
            Add Expense
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.tabBarInactive }]}>✕</Text>  {/* 👈 icon → tabBarInactive */}
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Supplier</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="Supplier name"
          placeholderTextColor={colors.tabBarInactive}
          value={form.supplier_name}
          onChangeText={(v) => updateField("supplier_name", v)}
          returnKeyType="next"
        />

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Item</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="Item name"
          placeholderTextColor={colors.tabBarInactive}
          value={form.item_name}
          onChangeText={(v) => updateField("item_name", v)}
          returnKeyType="next"
        />

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Quantity</Text>
        <TextInput
          keyboardType="numeric"
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="0"
          placeholderTextColor={colors.tabBarInactive}
          value={form.quantity}
          onChangeText={(v) => updateField("quantity", v)}
          returnKeyType="next"
        />

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Unit Price</Text>
        <TextInput
          keyboardType="numeric"
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="0"
          placeholderTextColor={colors.tabBarInactive}
          value={form.unit_price}
          onChangeText={(v) => updateField("unit_price", v)}
          returnKeyType="next"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            KES {total.toFixed(2)}
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>
          Amount Paid <Text style={{ fontSize: 11 }}>(optional)</Text>
        </Text>
        <TextInput
          keyboardType="numeric"
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="0.00"
          placeholderTextColor={colors.tabBarInactive}
          value={form.amount_paid}
          onChangeText={(v) => updateField("amount_paid", v)}
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        <View style={styles.row}>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>Balance</Text>
          <Text style={[styles.summaryValue, { color: balance > 0 ? "#E67E22" : colors.accent }]}>
            KES {Math.max(balance, 0).toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: submitting ? colors.border : colors.accent }]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Saving..." : "Create Expense"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40, borderRadius: 12, flexGrow: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "700" },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18, fontWeight: "600" },
  label: { marginTop: 12, marginBottom: 4, fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  divider: { height: 1, marginVertical: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 15, fontWeight: "700" },
  button: { marginTop: 20, padding: 13, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});