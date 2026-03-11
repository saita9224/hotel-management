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
import { useInventory } from "../../context/InventoryContext";  // 👈 added
import { useTheme } from "../../hooks/useTheme";
import { payBalanceService } from "../../services/expenseService";
import {
  addStockFromExpenseService,
  createProductWithStockService,
} from "../../services/inventoryService";

export default function ExpenseForm({ onClose }) {
  const { createExpense, loadExpenses } = useExpenses();
  const { loadProducts } = useInventory();               // 👈 added
  const { colors } = useTheme();

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

  // =====================================================
  // MATCHED PRODUCT — atomic: links expense to existing stock
  // =====================================================

  const promptAddToExistingStock = (matchedProduct, expenseId, quantity) => {
    Alert.alert(
      "Add to Inventory?",
      `"${matchedProduct.name}" exists in inventory with ${matchedProduct.current_stock} ${matchedProduct.unit} in stock.\n\nAdd ${quantity} ${matchedProduct.unit} from this expense?`,
      [
        { text: "No", style: "cancel", onPress: () => onClose?.() },
        {
          text: "Yes, Add Stock",
          onPress: async () => {
            try {
              await addStockFromExpenseService({
                product_id: matchedProduct.id,
                quantity: Number(quantity),
                expense_item_id: expenseId,
              });
              await loadProducts();    // 👈 refresh inventory after stock added
            } catch (err) {
              Alert.alert(
                "Stock Error",
                err?.message || "Failed to add stock. You can add it manually from Inventory."
              );
            } finally {
              onClose?.();
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  // =====================================================
  // NEW PRODUCT — prompt chain → atomic create + stock
  // =====================================================

  const promptCreateNewProduct = (itemName, expenseId, quantity) => {
    Alert.alert(
      "Not in Inventory",
      `"${itemName}" was not found in inventory.\n\nWould you like to add it as a new product?`,
      [
        { text: "No", style: "cancel", onPress: () => onClose?.() },
        {
          text: "Yes, Create Product",
          onPress: () => promptUnit(itemName, expenseId, quantity),
        },
      ],
      { cancelable: false }
    );
  };

  const promptUnit = (itemName, expenseId, quantity) => {
    const units = ["kg", "g", "litres", "ml", "pcs", "bags", "boxes"];
    Alert.alert(
      "Select Unit",
      `What unit is "${itemName}" measured in?`,
      [
        ...units.map((unit) => ({
          text: unit,
          onPress: () => promptCategory(itemName, expenseId, quantity, unit),
        })),
        { text: "Cancel", style: "cancel", onPress: () => onClose?.() },
      ],
      { cancelable: false }
    );
  };

  const promptCategory = (itemName, expenseId, quantity, unit) => {
    const categories = ["dry goods", "vegetables", "dairy", "meat", "beverages", "other"];
    Alert.alert(
      "Select Category",
      `What category does "${itemName}" belong to?`,
      [
        ...categories.map((cat) => ({
          text: cat,
          onPress: () => createAtomically(itemName, expenseId, quantity, unit, cat),
        })),
        { text: "Cancel", style: "cancel", onPress: () => onClose?.() },
      ],
      { cancelable: false }
    );
  };

  const createAtomically = async (itemName, expenseId, quantity, unit, category) => {
    try {
      await createProductWithStockService({
        name: itemName,
        unit,
        category,
        quantity: Number(quantity),
        expense_item_id: expenseId,
      });
      await loadProducts();    // 👈 refresh inventory after new product created
    } catch (err) {
      Alert.alert(
        "Error",
        err?.message || "Failed to create product. You can add it manually from Inventory."
      );
    } finally {
      onClose?.();
    }
  };

  // =====================================================
  // SUBMIT
  // =====================================================

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
      const { expense, matchedProduct } = await createExpense({
        item_name: form.item_name.trim(),
        supplier_name: form.supplier_name.trim() || null,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
      });

      const expenseId = expense?.id;

      if (expenseId && paid > 0) {
        await payBalanceService(Number(expenseId), paid);
        await loadExpenses();
      }

      if (matchedProduct && expenseId) {
        promptAddToExistingStock(matchedProduct, expenseId, form.quantity);
      } else if (expenseId) {
        promptCreateNewProduct(form.item_name.trim(), expenseId, form.quantity);
      } else {
        onClose?.();
      }

    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create expense.");
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Add Expense</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.tabBarInactive }]}>✕</Text>
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