// components/Inventory/DeductStockModal.jsx

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";

import { useInventory } from "../../context/InventoryContext";
import { useTheme } from "../../hooks/useTheme";

const REASONS = ["SALE", "COOKING", "DAMAGED", "LOST", "ADJUSTMENT"];

export default function DeductStockModal({ visible, product, onClose }) {
  const { deductStock } = useInventory();
  const { colors } = useTheme();

  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("COOKING");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setQuantity("");
    setReason("COOKING");
    setNotes("");
    onClose?.();
  };

  const submit = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0)
      return Alert.alert("Validation", "Enter a valid quantity.");
    if (qty > product.current_stock)
      return Alert.alert(
        "Insufficient Stock",
        `Only ${product.current_stock} ${product.unit} available.`
      );

    try {
      setSubmitting(true);
      await deductStock(product.id, qty, reason, notes || null);
      handleClose();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to deduct stock.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Deduct Stock</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ color: colors.tabBarInactive, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Product info */}
          <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
              {product.name}
            </Text>
            <Text style={{ color: colors.tabBarInactive, marginTop: 4 }}>
              Available: {product.current_stock} {product.unit}
            </Text>
          </View>

          {/* Quantity */}
          <Text style={[styles.label, { color: colors.tabBarInactive }]}>Quantity to Deduct</Text>
          <TextInput
            keyboardType="numeric"
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            placeholder={`Max ${product.current_stock}`}
            placeholderTextColor={colors.tabBarInactive}
            value={quantity}
            onChangeText={setQuantity}
          />

          {/* Reason */}
          <Text style={[styles.label, { color: colors.tabBarInactive }]}>Reason</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setReason(r)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: reason === r ? colors.accent : colors.background,
                    borderColor: reason === r ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={{ color: reason === r ? "#fff" : colors.text, fontWeight: "600" }}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Notes */}
          <Text style={[styles.label, { color: colors.tabBarInactive }]}>
            Notes <Text style={{ fontSize: 11 }}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            placeholder="e.g. Used for lunch service"
            placeholderTextColor={colors.tabBarInactive}
            value={notes}
            onChangeText={setNotes}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: submitting ? colors.border : colors.accent }]}
            onPress={submit}
            disabled={submitting}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {submitting ? "Processing..." : "Confirm Deduction"}
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, maxHeight: "85%" },
  handleRow: { alignItems: "center", marginBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  infoBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 13, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  button: { marginTop: 20, padding: 13, borderRadius: 10, alignItems: "center" },
});