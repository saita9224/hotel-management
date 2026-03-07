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
import {
  createExpenseService,
  payBalanceService,
} from "../../services/expenseService";

export default function ExpenseForm({ onClose }) {
  const { loadExpenses } = useExpenses();
  const { colors, fonts } = useTheme();

  const [form, setForm] = useState({
    supplier_name: "",
    item_name: "",
    quantity: "",
    unit_price: "",
    amount_paid: "",
  });

  const [submitting, setSubmitting] = useState(false);

  /* ---------------- INPUT HANDLER ---------------- */

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ---------------- DERIVED VALUES ---------------- */

  const total = Number(form.quantity || 0) * Number(form.unit_price || 0);
  const paid = Number(form.amount_paid || 0);
  const balance = total - paid;

  /* ---------------- SUBMIT ---------------- */

  const submit = async () => {
    try {
      if (!form.item_name.trim())
        return Alert.alert("Validation", "Item name is required.");

      if (!form.quantity || Number(form.quantity) <= 0)
        return Alert.alert("Validation", "Quantity must be greater than zero.");

      if (!form.unit_price || Number(form.unit_price) <= 0)
        return Alert.alert(
          "Validation",
          "Unit price must be greater than zero.",
        );

      if (paid < 0)
        return Alert.alert("Validation", "Amount paid cannot be negative.");

      if (paid > total)
        return Alert.alert(
          "Validation",
          "Amount paid cannot exceed total price.",
        );

      setSubmitting(true);

      // Step 1: Create expense
      const result = await createExpenseService({
        item_name: form.item_name.trim(),
        supplier_name: form.supplier_name.trim() || null,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
      });

      const expenseId = result?.createExpense?.id;

      // Step 2: Record payment if amount_paid > 0
      if (expenseId && paid > 0) {
        await payBalanceService(Number(expenseId), paid);
      }

      // Step 3: Refresh list
      await loadExpenses();

      onClose?.();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create expense.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontFamily: fonts.sans },
            ]}
          >
            Add Expense
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.icon }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Supplier */}
        <Text style={[styles.label, { color: colors.icon }]}>Supplier</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.icon, color: colors.text },
          ]}
          placeholder="Supplier name"
          placeholderTextColor={colors.icon}
          value={form.supplier_name}
          onChangeText={(v) => updateField("supplier_name", v)}
          returnKeyType="next"
        />

        {/* Item */}
        <Text style={[styles.label, { color: colors.icon }]}>Item</Text>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.icon, color: colors.text },
          ]}
          placeholder="Item name"
          placeholderTextColor={colors.icon}
          value={form.item_name}
          onChangeText={(v) => updateField("item_name", v)}
          returnKeyType="next"
        />

        {/* Quantity */}
        <Text style={[styles.label, { color: colors.icon }]}>Quantity</Text>
        <TextInput
          keyboardType="numeric"
          style={[
            styles.input,
            { borderColor: colors.icon, color: colors.text },
          ]}
          placeholder="0"
          placeholderTextColor={colors.icon}
          value={form.quantity}
          onChangeText={(v) => updateField("quantity", v)}
          returnKeyType="next"
        />

        {/* Unit Price */}
        <Text style={[styles.label, { color: colors.icon }]}>Unit Price</Text>
        <TextInput
          keyboardType="numeric"
          style={[
            styles.input,
            { borderColor: colors.icon, color: colors.text },
          ]}
          placeholder="0"
          placeholderTextColor={colors.icon}
          value={form.unit_price}
          onChangeText={(v) => updateField("unit_price", v)}
          returnKeyType="next"
        />

        {/* Divider */}
        <View
          style={[styles.divider, { backgroundColor: colors.icon + "30" }]}
        />

        {/* Total */}
        <View style={styles.row}>
          <Text style={[styles.summaryLabel, { color: colors.icon }]}>
            Total
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            KES {total.toFixed(2)}
          </Text>
        </View>

        {/* Amount Paid */}
        <Text style={[styles.label, { color: colors.icon }]}>
          Amount Paid <Text style={{ fontSize: 11 }}>(optional)</Text>
        </Text>
        <TextInput
          keyboardType="numeric"
          style={[
            styles.input,
            { borderColor: colors.icon, color: colors.text },
          ]}
          placeholder="0.00"
          placeholderTextColor={colors.icon}
          value={form.amount_paid}
          onChangeText={(v) => updateField("amount_paid", v)}
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        {/* Balance */}
        <View style={styles.row}>
          <Text style={[styles.summaryLabel, { color: colors.icon }]}>
            Balance
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: balance > 0 ? "#E67E22" : colors.tint },
            ]}
          >
            KES {Math.max(balance, 0).toFixed(2)}
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: submitting ? colors.icon : colors.tint },
          ]}
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

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    borderRadius: 12,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: "600",
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  button: {
    marginTop: 20,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
