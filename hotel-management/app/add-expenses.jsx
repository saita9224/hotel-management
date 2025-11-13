// app/add-expenses.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  useColorScheme,
} from "react-native";
import { Colors } from "./theme/colors";
import { useExpenses } from "./context/ExpensesContext";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function AddExpenses() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { addExpense } = useExpenses();

  // optionally passed if user is adding to an existing group
  const params = useLocalSearchParams();
  const presetGroup = params?.group_id ?? null;

  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paid, setPaid] = useState("");

  const handleSave = () => {
    const q = Number(quantity || 0);
    const up = Number(unitPrice || 0);
    const p = Number(paid || 0);

    if (!description.trim()) {
      Alert.alert("Missing Description", "Please add a product or item name.");
      return;
    }

    if (!supplier.trim()) {
      Alert.alert("Missing Supplier", "Please enter the supplier's name.");
      return;
    }

    if (q <= 0 && up <= 0 && p <= 0) {
      Alert.alert("Invalid Amount", "Enter quantity & unit price or a paid amount.");
      return;
    }

    const data = {
      group_id: presetGroup || undefined, // let addExpense auto-generate if none
      description,
      supplier,
      quantity: q,
      unit_price: up,
      paid: p,
    };

    const newGroupId = addExpense(data);
    Alert.alert("Saved", `Expense saved under group ${newGroupId}`);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.accent }]}>Add Expense</Text>

      <Text style={[styles.label, { color: theme.text }]}>Product / Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Sugar"
        placeholderTextColor={theme.tabBarInactive}
        style={[
          styles.input,
          { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
        ]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Supplier</Text>
      <TextInput
        value={supplier}
        onChangeText={setSupplier}
        placeholder="e.g. Mama John"
        placeholderTextColor={theme.tabBarInactive}
        style={[
          styles.input,
          { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
        ]}
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 10"
            keyboardType="numeric"
            placeholderTextColor={theme.tabBarInactive}
            style={[
              styles.input,
              { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
            ]}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.text }]}>Unit Price</Text>
          <TextInput
            value={unitPrice}
            onChangeText={setUnitPrice}
            placeholder="e.g. 500"
            keyboardType="numeric"
            placeholderTextColor={theme.tabBarInactive}
            style={[
              styles.input,
              { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
            ]}
          />
        </View>
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Amount Paid (optional)</Text>
      <TextInput
        value={paid}
        onChangeText={setPaid}
        placeholder="e.g. 2000"
        keyboardType="numeric"
        placeholderTextColor={theme.tabBarInactive}
        style={[
          styles.input,
          { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
        ]}
      />

      <TouchableOpacity
        onPress={handleSave}
        style={[styles.saveBtn, { backgroundColor: theme.accent }]}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Save Expense</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  row: { flexDirection: "row" },
  saveBtn: { marginTop: 12, padding: 12, borderRadius: 8, alignItems: "center" },
});
