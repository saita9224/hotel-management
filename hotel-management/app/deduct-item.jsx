import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useInventory } from "./context/InventoryContext"; 
import { Colors } from "./theme/colors";

export default function DeductItem() {
  const router = useRouter();
  const { id, name, quantity } = useLocalSearchParams();
  const { deductStock } = useInventory(); // ✅ Correct context function
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [usedQuantity, setUsedQuantity] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    const used = parseFloat(usedQuantity);
    const available = parseFloat(quantity);

    if (!used || used <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity to deduct.");
      return;
    }
    if (used > available) {
      Alert.alert(
        "Not Enough Stock",
        `You cannot deduct more than available stock (${available}).`
      );
      return;
    }

    // ➖ Deduct stock
    const result = deductStock(id, used);

    if (!result.ok) {
      Alert.alert("Error", result.message);
      return;
    }

    Alert.alert(
      "Success",
      `${used} units deducted from ${name}.\nReason: ${reason || "N/A"}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.accent }]}>Deduct Stock</Text>

      <Text style={[styles.label, { color: theme.text }]}>Item</Text>
      <TextInput
        value={name}
        editable={false}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Current Quantity</Text>
      <TextInput
        value={String(quantity)}
        editable={false}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Used Quantity</Text>
      <TextInput
        placeholder="Enter used quantity"
        placeholderTextColor={theme.tabBarInactive}
        keyboardType="numeric"
        value={usedQuantity}
        onChangeText={setUsedQuantity}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Reason</Text>
      <TextInput
        placeholder="e.g. Customer meal, Kitchen use..."
        placeholderTextColor={theme.tabBarInactive}
        value={reason}
        onChangeText={setReason}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.btn, { backgroundColor: theme.accent }]}
      >
        <Text style={styles.btnText}>Deduct</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  label: { fontSize: 14, marginTop: 10, marginBottom: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    fontSize: 14,
  },
  btn: {
    marginTop: 25,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
