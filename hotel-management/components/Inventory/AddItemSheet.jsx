// components/Inventory/AddItemSheet.jsx

import React, { useState, useRef, useEffect } from "react";
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
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useInventory } from "../../context/InventoryContext";
import { useTheme }     from "../../hooks/useTheme";
import { suggestCategoryService } from "../../services/inventoryService";

const UNITS   = ["kg", "g", "liters", "ml", "pcs", "bags", "boxes"];
const REASONS = ["PURCHASE", "RETURN", "ADJUSTMENT"];

export default function AddItemSheet({ onClose }) {
  const { createProduct, serverCategories, createCategory } = useInventory();
  const { colors } = useTheme();

  const [form, setForm] = useState({
    name:                "",
    supplier:            "",
    category_id:         null,   // FK id sent to backend
    unit:                "kg",
    quantity:            0,
    reason:              "PURCHASE",
    funded_by_business:  true,
    auto_deduct_on_sale: false,
    low_stock_alert:     true,
    alert_threshold:     10,
    cost_price:          "",
    notes:               "",
  });

  const [submitting,       setSubmitting]       = useState(false);
  const [suggestionBanner, setSuggestionBanner] = useState(null); // { categoryName, matchedName }
  const [suggestLoading,   setSuggestLoading]   = useState(false);

  // ── New category modal state ─────────────────────────
  const [newCatModalVisible, setNewCatModalVisible] = useState(false);
  const [newCatName,         setNewCatName]         = useState("");
  const [newCatSaving,       setNewCatSaving]       = useState(false);

  const nameRef      = useRef(null);
  const supplierRef  = useRef(null);
  const thresholdRef = useRef(null);
  const costRef      = useRef(null);
  const notesRef     = useRef(null);
  const suggestTimer = useRef(null);

  const update = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Auto-suggest category as user types ──────────────
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);

    // Only fire if no category is already selected
    if (form.category_id || form.name.trim().length < 3) {
      setSuggestionBanner(null);
      return;
    }

    suggestTimer.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const result = await suggestCategoryService(form.name);
        if (result && !form.category_id) {
          setSuggestionBanner({
            categoryId:   result.category.id,
            categoryName: result.category.name,
            matchedName:  result.matched_product_name,
          });
        } else {
          setSuggestionBanner(null);
        }
      } catch (_) {
        setSuggestionBanner(null);
      } finally {
        setSuggestLoading(false);
      }
    }, 600); // debounce 600ms

    return () => clearTimeout(suggestTimer.current);
  }, [form.name]);

  const acceptSuggestion = () => {
    if (!suggestionBanner) return;
    update("category_id", suggestionBanner.categoryId);
    setSuggestionBanner(null);
  };

  const dismissSuggestion = () => setSuggestionBanner(null);

  // ── Selected category object (for display) ───────────
  const selectedCategory = serverCategories.find(
    (c) => c.id === form.category_id
  ) || null;

  // ── Quantity stepper ──────────────────────────────────
  const incrementQty = () => update("quantity", form.quantity + 1);
  const decrementQty = () => update("quantity", Math.max(0, form.quantity - 1));

  // ── Create new category ───────────────────────────────
  const saveNewCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setNewCatSaving(true);
    try {
      const cat = await createCategory(name);
      update("category_id", cat.id);
      setNewCatModalVisible(false);
      setNewCatName("");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create category.");
    } finally {
      setNewCatSaving(false);
    }
  };

  // ── Submit ────────────────────────────────────────────
  const submit = async () => {
    if (!form.name.trim())
      return Alert.alert("Validation", "Item name is required.");
    if (!form.category_id)
      return Alert.alert("Validation", "Please select a category.");

    try {
      setSubmitting(true);
      await createProduct({
        name:                form.name.trim(),
        category_id:         form.category_id,
        unit:                form.unit,
        quantity:            form.quantity,
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

  const hasQuantity = form.quantity > 0;

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── HEADER ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Add Inventory Item
            </Text>
            <View style={{ width: 22 }} />
          </View>

          {/* ══════════════════════════════════════
              SECTION 1 — PRODUCT DETAILS
          ══════════════════════════════════════ */}
          <Text style={[styles.sectionHeader, { color: colors.accent }]}>Product Details</Text>

          {/* Item Name */}
          <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>Item Name</Text>
          <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="pricetag-outline" size={15} color={colors.tabBarInactive} style={styles.fieldIcon} />
            <TextInput
              ref={nameRef}
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder="e.g. Basmati Rice"
              placeholderTextColor={colors.tabBarInactive}
              value={form.name}
              onChangeText={(v) => update("name", v)}
              returnKeyType="next"
              onSubmitEditing={() => supplierRef.current?.focus()}
              blurOnSubmit={false}
            />
            {suggestLoading && (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
            )}
          </View>

          {/* Auto-suggest banner */}
          {suggestionBanner && (
            <View style={[styles.suggestionBanner, { backgroundColor: colors.accent + "15", borderColor: colors.accent }]}>
              <Ionicons name="bulb-outline" size={15} color={colors.accent} />
              <Text style={[styles.suggestionText, { color: colors.accent }]}>
                Similar to "{suggestionBanner.matchedName}" — use category{" "}
                <Text style={{ fontWeight: "700" }}>{suggestionBanner.categoryName}</Text>?
              </Text>
              <TouchableOpacity onPress={acceptSuggestion} style={styles.suggestionAccept}>
                <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 12 }}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={dismissSuggestion} style={{ padding: 4 }}>
                <Ionicons name="close" size={14} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>
          )}

          {/* Supplier */}
          <Text style={[styles.fieldLabel, { color: colors.tabBarInactive, marginTop: 12 }]}>
            Supplier <Text style={{ fontSize: 11, fontWeight: "400" }}>(optional)</Text>
          </Text>
          <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="business-outline" size={15} color={colors.tabBarInactive} style={styles.fieldIcon} />
            <TextInput
              ref={supplierRef}
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder="Supplier name"
              placeholderTextColor={colors.tabBarInactive}
              value={form.supplier}
              onChangeText={(v) => update("supplier", v)}
              returnKeyType="next"
              blurOnSubmit
            />
          </View>

          {/* Category */}
          <Text style={[styles.fieldLabel, { color: colors.tabBarInactive, marginTop: 12 }]}>Category</Text>

          {/* Selected category indicator */}
          {selectedCategory && (
            <View style={[styles.selectedCatRow, { backgroundColor: colors.accent + "15", borderColor: colors.accent }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
              <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13, flex: 1, marginLeft: 6 }}>
                {selectedCategory.name}
              </Text>
              <TouchableOpacity onPress={() => update("category_id", null)}>
                <Ionicons name="close-circle" size={18} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>
          )}

          {/* Category grid — from backend */}
          <View style={styles.categoryGrid}>
            {serverCategories.map((cat) => {
              const active = form.category_id === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => update("category_id", active ? null : cat.id)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: active ? colors.accent : colors.background,
                      borderColor:     active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={active ? "checkmark-circle" : "folder-outline"}
                    size={22}
                    color={active ? "#fff" : colors.tabBarInactive}
                  />
                  <Text style={[
                    styles.categoryCardLabel,
                    { color: active ? "#fff" : colors.text },
                  ]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Add new category tile */}
            <TouchableOpacity
              onPress={() => setNewCatModalVisible(true)}
              style={[
                styles.categoryCard,
                styles.newCatCard,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.tabBarInactive} />
              <Text style={[styles.categoryCardLabel, { color: colors.tabBarInactive }]}>
                New
              </Text>
            </TouchableOpacity>
          </View>

          {/* ══════════════════════════════════════
              SECTION 2 — INVENTORY SPECIFICS
          ══════════════════════════════════════ */}
          <Text style={[styles.sectionHeader, { color: colors.accent }]}>Inventory Specifics</Text>

          {/* Unit of Measure */}
          <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>Unit of Measure</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {UNITS.map((u) => {
              const active = form.unit === u;
              return (
                <TouchableOpacity
                  key={u}
                  onPress={() => update("unit", u)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? colors.accent : colors.background,
                      borderColor:     active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                    {u}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Low Stock Alert */}
          <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>Low Stock Alert</Text>
              <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                Notify when below threshold
              </Text>
            </View>
            <Switch
              value={form.low_stock_alert}
              onValueChange={(v) => update("low_stock_alert", v)}
              trackColor={{ false: colors.border, true: colors.accent + "80" }}
              thumbColor={form.low_stock_alert ? colors.accent : colors.tabBarInactive}
            />
          </View>

          {form.low_stock_alert && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.tabBarInactive, marginTop: 12 }]}>
                Alert Threshold
              </Text>
              <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="warning-outline" size={15} color={colors.tabBarInactive} style={styles.fieldIcon} />
                <TextInput
                  ref={thresholdRef}
                  keyboardType="numeric"
                  style={[styles.fieldInput, { color: colors.text }]}
                  placeholder="10"
                  placeholderTextColor={colors.tabBarInactive}
                  value={String(form.alert_threshold)}
                  onChangeText={(v) => update("alert_threshold", Number(v) || 0)}
                  returnKeyType="next"
                  blurOnSubmit
                />
              </View>
            </>
          )}

          {/* Track as POS Item */}
          <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background, marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>Track as POS Item</Text>
              <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                Auto-deduct stock on Point of Sale transactions
              </Text>
            </View>
            <Switch
              value={form.auto_deduct_on_sale}
              onValueChange={(v) => update("auto_deduct_on_sale", v)}
              trackColor={{ false: colors.border, true: colors.accent + "80" }}
              thumbColor={form.auto_deduct_on_sale ? colors.accent : colors.tabBarInactive}
            />
          </View>

          {/* ══════════════════════════════════════
              SECTION 3 — STOCK & COST
          ══════════════════════════════════════ */}
          <Text style={[styles.sectionHeader, { color: colors.accent }]}>Stock & Cost</Text>

          {/* Quantity Stepper */}
          <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>Current Stock Level</Text>
          <View style={[styles.stepper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={decrementQty} style={[styles.stepBtn, { borderRightColor: colors.border }]}>
              <Ionicons name="remove" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.stepValue, { color: colors.text }]}>{form.quantity}</Text>
            <TouchableOpacity onPress={incrementQty} style={[styles.stepBtn, { borderLeftColor: colors.border }]}>
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Cost Price */}
          <Text style={[styles.fieldLabel, { color: colors.tabBarInactive, marginTop: 12 }]}>
            Cost Price (per Unit) <Text style={{ fontSize: 11, fontWeight: "400" }}>(optional)</Text>
          </Text>
          <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.currencySymbol, { color: colors.tabBarInactive }]}>KES</Text>
            <TextInput
              ref={costRef}
              keyboardType="decimal-pad"
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.tabBarInactive}
              value={form.cost_price}
              onChangeText={(v) => update("cost_price", v)}
              returnKeyType="next"
              onSubmitEditing={() => notesRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Reason + Funded — only when quantity > 0 */}
          {hasQuantity && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.tabBarInactive, marginTop: 12 }]}>
                Reason for Stock
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                {REASONS.map((r) => {
                  const active = form.reason === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => update("reason", r)}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: active ? colors.accent : colors.background,
                          borderColor:     active ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.toggleRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>Funded by Business</Text>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                    Was this stock paid for by the business?
                  </Text>
                </View>
                <Switch
                  value={form.funded_by_business}
                  onValueChange={(v) => update("funded_by_business", v)}
                  trackColor={{ false: colors.border, true: colors.accent + "80" }}
                  thumbColor={form.funded_by_business ? colors.accent : colors.tabBarInactive}
                />
              </View>
            </>
          )}

          {/* Notes */}
          <Text style={[styles.fieldLabel, { color: colors.tabBarInactive, marginTop: 12 }]}>
            Notes <Text style={{ fontSize: 11, fontWeight: "400" }}>(optional)</Text>
          </Text>
          <TextInput
            ref={notesRef}
            style={[
              styles.fieldRow,
              styles.textArea,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
            ]}
            placeholder="e.g. Opening stock, delivered by supplier..."
            placeholderTextColor={colors.tabBarInactive}
            value={form.notes}
            onChangeText={(v) => update("notes", v)}
            multiline
            numberOfLines={3}
            returnKeyType="done"
            blurOnSubmit
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: submitting ? colors.border : colors.accent }]}
            onPress={submit}
            disabled={submitting}
          >
            <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.submitText}>
              {submitting ? "Saving..." : "Save Inventory Item"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════════════
          NEW CATEGORY MODAL
      ══════════════════════════════════════════════════ */}
      <Modal
        visible={newCatModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setNewCatModalVisible(false); setNewCatName(""); }}
      >
        <TouchableWithoutFeedback onPress={() => { setNewCatModalVisible(false); setNewCatName(""); }}>
          <View style={catModal.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[catModal.sheet, { backgroundColor: colors.card }]}>
          <View style={catModal.handleRow}>
            <View style={[catModal.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={[catModal.iconCircle, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="folder-open-outline" size={26} color={colors.accent} />
          </View>
          <Text style={[catModal.title, { color: colors.text }]}>New Category</Text>
          <Text style={[catModal.subtitle, { color: colors.tabBarInactive }]}>
            Give your new category a name. It will be available across all products.
          </Text>

          <View style={[styles.fieldRow, { borderColor: colors.accent, backgroundColor: colors.background, marginBottom: 20 }]}>
            <Ionicons name="folder-outline" size={15} color={colors.accent} style={styles.fieldIcon} />
            <TextInput
              autoFocus
              placeholder="e.g. Cleaning Supplies, Snacks..."
              placeholderTextColor={colors.tabBarInactive}
              value={newCatName}
              onChangeText={setNewCatName}
              style={[styles.fieldInput, { color: colors.text }]}
              returnKeyType="done"
              onSubmitEditing={saveNewCategory}
            />
          </View>

          <TouchableOpacity
            style={[catModal.primaryBtn, { backgroundColor: newCatSaving || !newCatName.trim() ? colors.border : colors.accent }]}
            onPress={saveNewCategory}
            disabled={newCatSaving || !newCatName.trim()}
          >
            {newCatSaving
              ? <ActivityIndicator color="#fff" />
              : <Text style={catModal.primaryBtnText}>Create Category</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[catModal.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => { setNewCatModalVisible(false); setNewCatName(""); }}
          >
            <Text style={[catModal.secondaryBtnText, { color: colors.tabBarInactive }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:        { paddingBottom: 48, flexGrow: 1 },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headerTitle:   { fontSize: 16, fontWeight: "700" },
  sectionHeader: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5, marginTop: 20, marginBottom: 12 },
  fieldLabel:    { fontSize: 13, marginBottom: 6, marginTop: 4 },

  fieldRow:  { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, minHeight: 44 },
  fieldIcon: { marginRight: 8 },
  fieldInput:{ flex: 1, fontSize: 14, paddingVertical: Platform.OS === "ios" ? 10 : 8 },
  textArea:  { minHeight: 80, textAlignVertical: "top", alignItems: "flex-start", paddingTop: 10 },

  currencySymbol: { fontSize: 13, fontWeight: "600", marginRight: 4 },

  // Suggestion banner
  suggestionBanner: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    borderWidth:    1,
    borderRadius:   8,
    padding:        10,
    marginTop:      6,
  },
  suggestionText:   { flex: 1, fontSize: 12 },
  suggestionAccept: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },

  // Selected category row
  selectedCatRow: {
    flexDirection:  "row",
    alignItems:     "center",
    borderWidth:    1,
    borderRadius:   8,
    padding:        10,
    marginBottom:   8,
  },

  // Category grid
  categoryGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  categoryCard:     { width: "47%", borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", gap: 6 },
  categoryCardLabel:{ fontSize: 12, fontWeight: "600", textAlign: "center" },
  newCatCard:       { borderStyle: "dashed" },

  // Pills
  pillRow: { marginVertical: 4 },
  pill:    { paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, marginRight: 8 },

  // Toggle
  toggleRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10, gap: 12 },

  // Stepper
  stepper:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, overflow: "hidden" },
  stepBtn:   { padding: 14, borderRightWidth: 0, borderLeftWidth: 0 },
  stepValue: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700" },

  // Submit
  submitBtn:  { marginTop: 24, padding: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

// New category modal styles
const catModal = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:           { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40 },
  handleRow:       { alignItems: "center", paddingVertical: 12 },
  handle:          { width: 40, height: 4, borderRadius: 2 },
  iconCircle:      { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 },
  title:           { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 6 },
  subtitle:        { fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  primaryBtn:      { padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 10 },
  primaryBtnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn:    { padding: 15, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  secondaryBtnText:{ fontWeight: "600", fontSize: 15 },
});