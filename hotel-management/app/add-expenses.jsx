import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../theme/colors";
import { useExpenses } from "../context/ExpensesContext";
import { useRouter } from "expo-router";

export default function AddExpenses() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { createExpense } = useExpenses();

  const [itemName, setItemName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(false);

  const q = parseFloat(quantity) || 0;
  const up = parseFloat(unitPrice) || 0;
  const paid = parseFloat(amountPaid) || 0;

  const total = useMemo(() => q * up, [q, up]);
  const balance = useMemo(() => total - paid, [total, paid]);

  const handleSave = async () => {
    if (!itemName.trim()) {
      Alert.alert("Validation", "Item name is required.");
      return;
    }

    if (!supplierName.trim()) {
      Alert.alert("Validation", "Supplier name is required.");
      return;
    }

    if (q <= 0) {
      Alert.alert("Validation", "Quantity must be greater than zero.");
      return;
    }

    if (up <= 0) {
      Alert.alert("Validation", "Unit price must be greater than zero.");
      return;
    }

    if (paid < 0) {
      Alert.alert("Validation", "Paid amount cannot be negative.");
      return;
    }

    if (paid > total) {
      Alert.alert("Validation", "Paid amount cannot exceed total.");
      return;
    }

    try {
      setLoading(true);

      await createExpense({
        supplier_name: supplierName.trim(),
        item_name: itemName.trim(),
        quantity: q,
        unit_price: up,
        amount_paid: paid,
      });
      
      Alert.alert("Success", "Expense created successfully.");
      router.back();
    } catch (e) {
      Alert.alert("Error", e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Text style={[styles.title, { color: theme.accent }]}>
          Add Expense
        </Text>

        <Text style={[styles.label, { color: theme.text }]}>Item Name</Text>
        <TextInput
          value={itemName}
          onChangeText={setItemName}
          placeholder="e.g. Sugar"
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.border}
        />

        <Text style={[styles.label, { color: theme.text }]}>Supplier Name</Text>
        <TextInput
          value={supplierName}
          onChangeText={setSupplierName}
          placeholder="e.g. Brookside Ltd"
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.border}
        />

        <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        />

        <Text style={[styles.label, { color: theme.text }]}>Unit Price</Text>
        <TextInput
          value={unitPrice}
          onChangeText={setUnitPrice}
          keyboardType="decimal-pad"
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        />

        <Text style={[styles.label, { color: theme.text }]}>
          Amount Paid (Optional)
        </Text>
        <TextInput
          value={amountPaid}
          onChangeText={setAmountPaid}
          keyboardType="decimal-pad"
          placeholder="0"
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.border}
        />

        {/* LIVE PREVIEW */}
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: theme.text }}>
            Total: KES {total.toFixed(2)}
          </Text>
          <Text style={{ color: theme.text }}>
            Remaining Balance: KES {balance.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={[
            styles.saveBtn,
            {
              backgroundColor: theme.accent,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          <Text style={styles.saveBtnText}>
            {loading ? "Saving..." : "Save Expense"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  saveBtn: {
    marginTop: 20,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});