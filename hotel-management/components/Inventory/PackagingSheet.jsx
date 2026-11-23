// components/Inventory/PackagingSheet.jsx

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
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useInventory } from "../../context/InventoryContext";
import { useTheme } from "../../hooks/useTheme";

export default function PackagingSheet({ visible, product, onClose }) {
  const { createPackaging, deletePackaging } = useInventory();
  const { colors } = useTheme();

  const [label, setLabel]             = useState("");
  const [quantityInBase, setQuantityInBase] = useState("");
  const [isPurchase, setIsPurchase]   = useState(true);
  const [isSale, setIsSale]           = useState(true);
  const [saving, setSaving]           = useState(false);
  const [deletingId, setDeletingId]   = useState(null);

  const packagings = product?.packagings || [];

  const resetForm = () => {
    setLabel("");
    setQuantityInBase("");
    setIsPurchase(true);
    setIsSale(true);
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const submit = async () => {
    const trimmed = label.trim();
    const qty = Number(quantityInBase);

    if (!trimmed) return Alert.alert("Validation", "Packaging label is required (e.g. crate, bale).");
    if (!qty || qty <= 0) return Alert.alert("Validation", "Quantity in base units must be greater than zero.");
    if (product?.unit && trimmed.toLowerCase() === String(product.unit).toLowerCase()) {
      return Alert.alert("Validation", `Packaging label can't be the same as the base unit (${product.unit}).`);
    }
    if (!isPurchase && !isSale) {
      return Alert.alert("Validation", "Enable at least one of Purchase or Sale unit.");
    }

    try {
      setSaving(true);
      await createPackaging(product.id, {
        label: trimmed,
        quantity_in_base: qty,
        is_purchase_unit: isPurchase,
        is_sale_unit: isSale,
      });
      resetForm();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to save packaging.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (pk) => {
    Alert.alert(
      "Delete Packaging",
      `Remove "${pk.label}" (${pk.quantity_in_base} ${product.unit})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(pk.id);
              await deletePackaging(pk.id);
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to delete packaging.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
        >
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {/* Handle */}
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Units & Packaging</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={{ color: colors.tabBarInactive, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Product info */}
            <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{product.name}</Text>
              <Text style={{ color: colors.tabBarInactive, marginTop: 4, fontSize: 13 }}>
                Base unit: {product.unit} • Stock: {product.current_stock} {product.unit}
              </Text>
            </View>

            {/* Existing packagings */}
            {packagings.length === 0 ? (
              <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginBottom: 12 }}>
                No packagings yet. Add units like "crate" or "bale" to buy/sell in bulk.
              </Text>
            ) : (
              packagings.map((pk) => (
                <View
                  key={pk.id}
                  style={[styles.pkRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{pk.label}</Text>
                    <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                      = {pk.quantity_in_base} {product.unit}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                      {pk.is_purchase_unit && (
                        <View style={[styles.flag, { backgroundColor: colors.accent + "20" }]}>
                          <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "700" }}>PURCHASE</Text>
                        </View>
                      )}
                      {pk.is_sale_unit && (
                        <View style={[styles.flag, { backgroundColor: colors.accent + "20" }]}>
                          <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "700" }}>SALE</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(pk)}
                    disabled={deletingId === pk.id}
                    style={{ padding: 8 }}
                  >
                    {deletingId === pk.id
                      ? <ActivityIndicator size="small" color={colors.tabBarInactive} />
                      : <Ionicons name="trash-outline" size={18} color="#E74C3C" />}
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Add form */}
            <Text style={[styles.label, { color: colors.tabBarInactive, marginTop: 14 }]}>Add / Update Packaging</Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder='Label (e.g. "crate", "bale")'
                placeholderTextColor={colors.tabBarInactive}
                value={label}
                onChangeText={setLabel}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, { width: 110, borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder={`= ? ${product.unit}`}
                placeholderTextColor={colors.tabBarInactive}
                keyboardType="decimal-pad"
                value={quantityInBase}
                onChangeText={setQuantityInBase}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>Purchase unit</Text>
              <Switch
                value={isPurchase}
                onValueChange={setIsPurchase}
                trackColor={{ false: colors.border, true: colors.accent + "80" }}
                thumbColor={isPurchase ? colors.accent : colors.tabBarInactive}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>Sale unit</Text>
              <Switch
                value={isSale}
                onValueChange={setIsSale}
                trackColor={{ false: colors.border, true: colors.accent + "80" }}
                thumbColor={isSale ? colors.accent : colors.tabBarInactive}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: saving ? colors.border : colors.accent }]}
              onPress={submit}
              disabled={saving}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {saving ? "Saving..." : "Save Packaging"}
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
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
  infoBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  pkRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  flag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  button: { marginTop: 18, padding: 13, borderRadius: 10, alignItems: "center" },
});
