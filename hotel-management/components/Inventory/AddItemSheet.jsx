import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { useInventory } from "../../context/InventoryContext";
import { useTheme } from "../../hooks/useTheme";

const UNITS = ["kg", "g", "litres", "ml", "pcs", "bags", "boxes"];
const REASONS = ["PURCHASE", "RETURN", "ADJUSTMENT"];

export default function AddItemSheet({ onClose }) {
  const { createProduct } = useInventory();
  const { colors } = useTheme();

  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "kg",
    quantity: "",
    reason: "PURCHASE",
    funded_by_business: true,
    auto_deduct_on_sale: false,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const categoryRef = useRef(null);
  const quantityRef = useRef(null);
  const notesRef    = useRef(null);

  const updateField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const hasQuantity = Number(form.quantity) > 0;

  const submit = async () => {
    if (!form.name.trim())
      return Alert.alert("Validation", "Item name is required.");
    if (!form.category.trim())
      return Alert.alert("Validation", "Category is required.");

    try {
      setSubmitting(true);
      await createProduct({
        name:                form.name.trim(),
        category:            form.category.trim().toLowerCase(),
        unit:                form.unit,
        quantity:            Number(form.quantity || 0),
        reason:              form.reason,
        funded_by_business:  form.funded_by_business,
        auto_deduct_on_sale: form.auto_deduct_on_sale,
        notes:               form.notes.trim() || null,
      });
      onClose?.();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to add item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.card }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Add Item</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── SECTION: Product Details ── */}
        <Text style={[styles.sectionLabel, { color: colors.accent }]}>PRODUCT DETAILS</Text>

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Item Name</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="e.g. Sugar, Rice, Flour"
          placeholderTextColor={colors.tabBarInactive}
          value={form.name}
          onChangeText={(v) => updateField("name", v)}
          returnKeyType="next"
          onSubmitEditing={() => categoryRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Category</Text>
        <TextInput
          ref={categoryRef}
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="e.g. dry goods, vegetables, dairy"
          placeholderTextColor={colors.tabBarInactive}
          value={form.category}
          onChangeText={(v) => updateField("category", v)}
          returnKeyType="next"
          onSubmitEditing={() => quantityRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Unit</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
          {UNITS.map((u) => (
            <TouchableOpacity
              key={u}
              onPress={() => updateField("unit", u)}
              style={[
                styles.pill,
                {
                  backgroundColor: form.unit === u ? colors.accent : colors.background,
                  borderColor:     form.unit === u ? colors.accent : colors.border,
                },
              ]}
            >
              <Text style={{ color: form.unit === u ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── POS Deductible toggle ── */}
        <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
              Sold at POS Counter
            </Text>
            <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
              Auto-deduct stock when sold. Enable for water, snacks, etc.
            </Text>
          </View>
          <Switch
            value={form.auto_deduct_on_sale}
            onValueChange={(v) => updateField("auto_deduct_on_sale", v)}
            trackColor={{ false: colors.border, true: colors.accent + "80" }}
            thumbColor={form.auto_deduct_on_sale ? colors.accent : colors.tabBarInactive}
          />
        </View>

        {/* ── SECTION: Initial Stock ── */}
        <Text style={[styles.sectionLabel, { color: colors.accent, marginTop: 8 }]}>
          INITIAL STOCK <Text style={{ fontSize: 10, color: colors.tabBarInactive }}>(OPTIONAL)</Text>
        </Text>

        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Quantity</Text>
        <TextInput
          ref={quantityRef}
          keyboardType="numeric"
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
          placeholder="0"
          placeholderTextColor={colors.tabBarInactive}
          value={form.quantity}
          onChangeText={(v) => updateField("quantity", v)}
          returnKeyType="next"
          onSubmitEditing={() => notesRef.current?.focus()}
          blurOnSubmit={false}
        />

        {/* Reason + funded_by_business + notes — only shown when quantity > 0 */}
        {hasQuantity && (
          <>
            <Text style={[styles.label, { color: colors.tabBarInactive }]}>Reason</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => updateField("reason", r)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: form.reason === r ? colors.accent : colors.background,
                      borderColor:     form.reason === r ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: form.reason === r ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                  Funded by Business
                </Text>
                <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                  Was this stock paid for by the business?
                </Text>
              </View>
              <Switch
                value={form.funded_by_business}
                onValueChange={(v) => updateField("funded_by_business", v)}
                trackColor={{ false: colors.border, true: colors.accent + "80" }}
                thumbColor={form.funded_by_business ? colors.accent : colors.tabBarInactive}
              />
            </View>

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>
              Notes <Text style={{ fontSize: 11 }}>(optional)</Text>
            </Text>
            <TextInput
              ref={notesRef}
              style={[
                styles.input,
                styles.textArea,
                { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
              ]}
              placeholder="e.g. Opening stock, delivered by supplier..."
              placeholderTextColor={colors.tabBarInactive}
              value={form.notes}
              onChangeText={(v) => updateField("notes", v)}
              multiline
              numberOfLines={3}
              returnKeyType="done"
              blurOnSubmit
            />
          </>
        )}

        {/* ── SUBMIT ── */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: submitting ? colors.border : colors.accent }]}
          onPress={submit}
          disabled={submitting}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            {submitting ? "Saving..." : "Add Item"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  pillRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
  button: {
    marginTop: 24,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },
});