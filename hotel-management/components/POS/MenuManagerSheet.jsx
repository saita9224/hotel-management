// components/POS/MenuManagerSheet.jsx

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";
import { useMenu } from "../../context/MenuContext";
import EmojiPicker from "./EmojiPicker";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });


// ── UNPRICED PRODUCT ROW ──────────────────────────────────
// Shown in the "Needs Pricing" section for inventory items
// that have auto_deduct_on_sale=True but no price yet.

function UnpricedProductRow({ product, onAdded, colors }) {
  const { createMenuItem } = useMenu();
  const [price, setPrice]           = useState("");
  const [emoji, setEmoji]           = useState("🛒");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]         = useState(false);

  const handleAdd = async () => {
    const value = Number(price);
    if (!price || isNaN(value) || value <= 0)
      return Alert.alert("Required", "Enter a valid price greater than 0.");

    try {
      setSaving(true);
      await createMenuItem({
        name:       product.product_name,
        emoji,
        price:      value,
        is_pinned:  false,
        product_id: product.product_id,
      });
      onAdded();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to add item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.unpricedRow, { borderBottomColor: colors.border }]}>

      {/* Emoji picker trigger */}
      <TouchableOpacity
        style={[styles.emojiSmall, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setShowPicker((v) => !v)}
      >
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </TouchableOpacity>

      {/* Name + unit + optional emoji picker */}
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
          {product.product_name}
        </Text>
        {product.unit ? (
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
            {product.unit}
          </Text>
        ) : null}
        {showPicker && (
          <View style={{ marginTop: 8 }}>
            <EmojiPicker
              selected={emoji}
              onSelect={(e) => { setEmoji(e); setShowPicker(false); }}
            />
          </View>
        )}
      </View>

      {/* Price input */}
      <TextInput
        style={[styles.priceInput, {
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.background,
        }]}
        placeholder="Price"
        placeholderTextColor={colors.tabBarInactive}
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      {/* Add button */}
      <TouchableOpacity
        style={[styles.addSmallBtn, {
          backgroundColor: saving ? colors.border : colors.accent,
        }]}
        onPress={handleAdd}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="checkmark" size={18} color="#fff" />
        }
      </TouchableOpacity>
    </View>
  );
}


// ── ADD ITEM FORM ─────────────────────────────────────────
// For adding completely new manual items (no inventory link).

function AddItemForm({ onDone, colors }) {
  const { createMenuItem } = useMenu();
  const [name, setName]             = useState("");
  const [emoji, setEmoji]           = useState("🛒");
  const [price, setPrice]           = useState("");
  const [isPinned, setIsPinned]     = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving]         = useState(false);

  const handleSave = async () => {
    if (!name.trim())
      return Alert.alert("Required", "Item name is required.");
    const value = Number(price);
    if (!price || isNaN(value) || value <= 0)
      return Alert.alert("Required", "Enter a valid price greater than 0.");

    try {
      setSaving(true);
      await createMenuItem({
        name: name.trim(),
        emoji,
        price: value,
        is_pinned: isPinned,
      });
      onDone();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.formBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Text style={[styles.formTitle, { color: colors.text }]}>Add Menu Item</Text>

      {/* Emoji */}
      <TouchableOpacity
        style={[styles.emojiSelector, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setShowEmojiPicker((v) => !v)}
      >
        <Text style={{ fontSize: 32 }}>{emoji}</Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 4 }}>
          {showEmojiPicker ? "Close" : "Change"}
        </Text>
      </TouchableOpacity>

      {showEmojiPicker && (
        <EmojiPicker
          selected={emoji}
          onSelect={(e) => { setEmoji(e); setShowEmojiPicker(false); }}
        />
      )}

      {/* Name */}
      <Text style={[styles.label, { color: colors.tabBarInactive }]}>Name</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
        placeholder="e.g. Espresso"
        placeholderTextColor={colors.tabBarInactive}
        value={name}
        onChangeText={setName}
      />

      {/* Price */}
      <Text style={[styles.label, { color: colors.tabBarInactive }]}>Price (KES)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
        placeholder="0.00"
        placeholderTextColor={colors.tabBarInactive}
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      {/* Pin toggle */}
      <View style={styles.switchRow}>
        <Text style={{ color: colors.text, fontSize: 14 }}>
          Pin to frequent items
        </Text>
        <Switch
          value={isPinned}
          onValueChange={setIsPinned}
          trackColor={{ true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              Add to Menu
            </Text>
        }
      </TouchableOpacity>
    </View>
  );
}


// ── MENU ITEM ROW ─────────────────────────────────────────

function MenuItemRow({ item, colors }) {
  const { updateMenuItem, deleteMenuItem } = useMenu();

  const toggleAvailable = () =>
    updateMenuItem({ item_id: item.id, is_available: !item.is_available });

  const togglePinned = () =>
    updateMenuItem({ item_id: item.id, is_pinned: !item.is_pinned });

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      `Remove "${item.name}" from the menu?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMenuItem(item.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
      <Text style={{ fontSize: 26, marginRight: 10 }}>{item.emoji}</Text>

      <View style={{ flex: 1 }}>
        <Text style={{
          color: item.is_available ? colors.text : colors.tabBarInactive,
          fontWeight: "600",
          fontSize: 14,
        }}>
          {item.name}
        </Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
          KES {formatKES(item.price)}
          {item.has_inventory ? "  •  📦 inventory" : "  •  manual"}
          {item.is_pinned ? "  •  📌 pinned" : ""}
        </Text>
      </View>

      <View style={styles.rowControls}>
        <TouchableOpacity onPress={togglePinned} style={styles.iconBtn}>
          <Ionicons
            name={item.is_pinned ? "pin" : "pin-outline"}
            size={18}
            color={item.is_pinned ? colors.accent : colors.tabBarInactive}
          />
        </TouchableOpacity>

        <Switch
          value={item.is_available}
          onValueChange={toggleAvailable}
          trackColor={{ true: "#30D158", false: colors.border }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />

        {!item.has_inventory && (
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="#FF453A" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}


// ── MAIN SHEET ────────────────────────────────────────────

export default function MenuManagerSheet({ visible, onClose }) {
  const { colors } = useTheme();
  const { menuItems, unpricedItems, loading, refreshMenu } = useMenu();
  const [showAddForm, setShowAddForm] = useState(false);

  const inventoryItems = menuItems.filter((m) => m.has_inventory && m.price > 0);
  const manualItems    = menuItems.filter((m) => !m.has_inventory);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>

          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Menu</Text>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <TouchableOpacity onPress={refreshMenu}>
                <Ionicons name="refresh-outline" size={20} color={colors.tabBarInactive} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 60 }}
            >

              {/* ── NEEDS PRICING ── */}
              {unpricedItems.length > 0 && (
                <>
                  <View style={[styles.needsPricingBanner, {
                    backgroundColor: "#FF9F0A12",
                    borderColor: "#FF9F0A30",
                  }]}>
                    <Ionicons name="alert-circle-outline" size={16} color="#FF9F0A" />
                    <Text style={{ color: "#FF9F0A", fontWeight: "600", fontSize: 13, marginLeft: 6 }}>
                      {unpricedItems.length} inventory item
                      {unpricedItems.length > 1 ? "s need" : " needs"} pricing
                    </Text>
                  </View>

                  <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>
                    NEEDS PRICING
                  </Text>

                  {unpricedItems.map((product) => (
                    <UnpricedProductRow
                      key={product.product_id}
                      product={product}
                      colors={colors}
                      onAdded={refreshMenu}
                    />
                  ))}
                </>
              )}

              {/* ── ADD NEW MANUAL ITEM ── */}
              <TouchableOpacity
                style={[styles.addToggle, {
                  borderColor: colors.accent,
                  backgroundColor: colors.accent + "15",
                }]}
                onPress={() => setShowAddForm((v) => !v)}
              >
                <Ionicons
                  name={showAddForm ? "remove-circle-outline" : "add-circle-outline"}
                  size={18}
                  color={colors.accent}
                />
                <Text style={{ color: colors.accent, fontWeight: "600", marginLeft: 6 }}>
                  {showAddForm ? "Cancel" : "Add New Item"}
                </Text>
              </TouchableOpacity>

              {showAddForm && (
                <AddItemForm
                  colors={colors}
                  onDone={() => setShowAddForm(false)}
                />
              )}

              {/* ── INVENTORY ITEMS (priced) ── */}
              {inventoryItems.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>
                    FROM INVENTORY
                  </Text>
                  {inventoryItems.map((item) => (
                    <MenuItemRow key={item.id} item={item} colors={colors} />
                  ))}
                </>
              )}

              {/* ── MANUAL ITEMS ── */}
              {manualItems.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>
                    MANUAL ITEMS
                  </Text>
                  {manualItems.map((item) => (
                    <MenuItemRow key={item.id} item={item} colors={colors} />
                  ))}
                </>
              )}

              {menuItems.length === 0 && unpricedItems.length === 0 && (
                <Text style={{
                  color: colors.tabBarInactive,
                  textAlign: "center",
                  marginTop: 40,
                }}>
                  No menu items yet. Add one above.
                </Text>
              )}

            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, maxHeight: "92%" },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle:    { width: 40, height: 4, borderRadius: 2 },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: "700" },

  // Needs pricing banner
  needsPricingBanner: {
    flexDirection: "row", alignItems: "center",
    padding: 10, borderRadius: 8, borderWidth: 1,
    marginBottom: 8,
  },

  // Unpriced row
  unpricedRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  emojiSmall: {
    width: 40, height: 40, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  priceInput: {
    borderWidth: 1, borderRadius: 8,
    padding: 8, width: 80,
    fontSize: 14, textAlign: "right",
    marginRight: 8,
  },
  addSmallBtn: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },

  // Add item toggle
  addToggle: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 10, borderWidth: 1,
    marginBottom: 12, marginTop: 8,
  },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1,
    marginTop: 16, marginBottom: 8,
  },

  // Existing menu item row
  menuRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  rowControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn:     { padding: 4 },

  // Add item form
  formBox:      { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 8 },
  formTitle:    { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  emojiSelector: {
    alignSelf: "center", alignItems: "center",
    padding: 12, borderRadius: 12, borderWidth: 1,
    marginBottom: 14, width: 80,
  },
  label:     { fontSize: 13, marginBottom: 6, marginTop: 4 },
  input:     { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12 },
  switchRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16, paddingVertical: 4,
  },
  saveBtn: { padding: 13, borderRadius: 10, alignItems: "center" },
});