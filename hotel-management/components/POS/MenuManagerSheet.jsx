// components/POS/MenuManagerSheet.jsx

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
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

const CATEGORY_ICONS = {
  food:   "restaurant-outline",
  drinks: "cafe-outline",
  snacks: "fast-food-outline",
  other:  "apps-outline",
};

// ── CategoryPicker ────────────────────────────────────────
// Rendered inside forms wherever category needs to be set.

function CategoryPicker({ selected, onSelect, categories, colors }) {
  const { createMenuCategory } = useMenu();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddCategory = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Required", "Category name is required.");

    try {
      setSaving(true);
      const category = await createMenuCategory(trimmed);
      setName("");
      setAdding(false);
      onSelect(category.key);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <View style={styles.categoryPickerRow}>
      {(categories ?? []).map((cat) => {
        const active = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              {
                backgroundColor: active ? colors.accent : colors.card,
                borderColor:     active ? colors.accent : colors.border,
              },
            ]}
            onPress={() => onSelect(cat.key)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={CATEGORY_ICONS[cat.key] ?? "pricetag-outline"}
              size={13}
              color={active ? "#fff" : colors.tabBarInactive}
            />
            <Text style={[
              styles.categoryChipText,
              { color: active ? "#fff" : colors.text },
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
        <TouchableOpacity
          style={[styles.categoryChip, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setAdding((v) => !v)}
          activeOpacity={0.75}
        >
          <Ionicons name={adding ? "remove-circle-outline" : "add-circle-outline"} size={13} color={colors.accent} />
          <Text style={[styles.categoryChipText, { color: colors.accent }]}>
            Category
          </Text>
        </TouchableOpacity>
      </View>

      {adding && (
        <View style={styles.categoryAddRow}>
          <TextInput
            style={[styles.categoryAddInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="Category name"
            placeholderTextColor={colors.tabBarInactive}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.categoryAddBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
            onPress={handleAddCategory}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="checkmark" size={16} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


// ── UNPRICED PRODUCT ROW ──────────────────────────────────
// Shown in "Needs Pricing". Staff set emoji, price, and
// category before adding an inventory item to the menu.

function UnpricedProductRow({ product, onAdded, categories, colors }) {
  const { createMenuItem } = useMenu();
  const [price, setPrice]       = useState("");
  const [emoji, setEmoji]       = useState("🛒");
  const [category, setCategory] = useState("other");
  const [showPicker, setShowPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving]     = useState(false);

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
        category,
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
    <View style={[styles.unpricedCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
      {/* Collapsed header row */}
      <TouchableOpacity
        style={styles.unpricedHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <Text style={{ fontSize: 22, marginRight: 10 }}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
            {product.product_name}
          </Text>
          {product.unit ? (
            <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 1 }}>
              {product.unit}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.tabBarInactive}
        />
      </TouchableOpacity>

      {/* Expanded form */}
      {expanded && (
        <View style={{ paddingTop: 12 }}>

          {/* Emoji picker trigger */}
          <Text style={[styles.label, { color: colors.tabBarInactive }]}>Emoji</Text>
          <TouchableOpacity
            style={[styles.emojiSelector, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowPicker((v) => !v)}
          >
            <Text style={{ fontSize: 28 }}>{emoji}</Text>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 3 }}>
              {showPicker ? "Close" : "Change"}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <EmojiPicker
              selected={emoji}
              onSelect={(e) => { setEmoji(e); setShowPicker(false); }}
            />
          )}

          {/* Price */}
          <Text style={[styles.label, { color: colors.tabBarInactive }]}>Price (KES)</Text>
          <TextInput
            style={[styles.input, {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.card,
            }]}
            placeholder="0.00"
            placeholderTextColor={colors.tabBarInactive}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />

          {/* Category */}
          <Text style={[styles.label, { color: colors.tabBarInactive }]}>Category</Text>
          <CategoryPicker
            selected={category}
            onSelect={setCategory}
            categories={categories}
            colors={colors}
          />

          {/* Add button */}
          <TouchableOpacity
            style={[styles.saveBtn, {
              backgroundColor: saving ? colors.border : colors.accent,
              marginTop: 12,
            }]}
            onPress={handleAdd}
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
      )}
    </View>
  );
}


// ── ADD ITEM FORM ─────────────────────────────────────────
// For completely new manual items (no inventory link).

function AddItemForm({ onDone, categories, colors }) {
  const { createMenuItem } = useMenu();
  const [name, setName]         = useState("");
  const [emoji, setEmoji]       = useState("🛒");
  const [price, setPrice]       = useState("");
  const [category, setCategory] = useState("other");
  const [isPinned, setIsPinned] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!name.trim())
      return Alert.alert("Required", "Item name is required.");
    const value = Number(price);
    if (!price || isNaN(value) || value <= 0)
      return Alert.alert("Required", "Enter a valid price greater than 0.");

    try {
      setSaving(true);
      await createMenuItem({
        name:      name.trim(),
        emoji,
        price:     value,
        category,
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
      <Text style={[styles.label, { color: colors.tabBarInactive }]}>Emoji</Text>
      <TouchableOpacity
        style={[styles.emojiSelector, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setShowEmojiPicker((v) => !v)}
      >
        <Text style={{ fontSize: 28 }}>{emoji}</Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 3 }}>
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

      {/* Category */}
      <Text style={[styles.label, { color: colors.tabBarInactive }]}>Category</Text>
      <CategoryPicker
        selected={category}
        onSelect={setCategory}
        categories={categories}
        colors={colors}
      />

      {/* Pin toggle */}
      <View style={[styles.switchRow, { marginTop: 14 }]}>
        <Text style={{ color: colors.text, fontSize: 14 }}>Pin to frequent items</Text>
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
          : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Add to Menu</Text>
        }
      </TouchableOpacity>
    </View>
  );
}


// ── MENU ITEM ROW ─────────────────────────────────────────
// Normal view: shows name, price, category badge, toggles.
// Edit view: inline form to update emoji, price, category, pin.

function MenuItemRow({ item, categories, colors }) {
  const { updateMenuItem, deleteMenuItem } = useMenu();

  const [editing, setEditing]       = useState(false);
  const [emoji, setEmoji]           = useState(item.emoji);
  const [price, setPrice]           = useState(String(item.price));
  const [category, setCategory]     = useState(item.category ?? "other");
  const [isPinned, setIsPinned]     = useState(item.is_pinned);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saving, setSaving]         = useState(false);

  const categoryLabel =
    categories.find((c) => c.key === (item.category ?? "other"))?.name ??
    item.category ??
    "Other";

  const toggleAvailable = () =>
    updateMenuItem({ item_id: item.id, is_available: !item.is_available });

  const handleDelete = () =>
    Alert.alert(
      "Delete Item",
      `Remove "${item.name}" from the menu?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMenuItem(item.id) },
      ]
    );

  const handleSaveEdit = async () => {
    const value = Number(price);
    if (!price || isNaN(value) || value <= 0)
      return Alert.alert("Required", "Enter a valid price greater than 0.");

    try {
      setSaving(true);
      await updateMenuItem({
        item_id:   item.id,
        emoji,
        price:     value,
        category,
        is_pinned: isPinned,
      });
      setEditing(false);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to update item.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset local state back to item values on cancel
    setEmoji(item.emoji);
    setPrice(String(item.price));
    setCategory(item.category ?? "other");
    setIsPinned(item.is_pinned);
    setShowEmojiPicker(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={[styles.editCard, { borderColor: colors.accent, backgroundColor: colors.background }]}>
        <Text style={[styles.formTitle, { color: colors.text, marginBottom: 12 }]}>
          Edit: {item.name}
        </Text>

        {/* Emoji */}
        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Emoji</Text>
        <TouchableOpacity
          style={[styles.emojiSelector, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setShowEmojiPicker((v) => !v)}
        >
          <Text style={{ fontSize: 28 }}>{emoji}</Text>
          <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 3 }}>
            {showEmojiPicker ? "Close" : "Change"}
          </Text>
        </TouchableOpacity>

        {showEmojiPicker && (
          <EmojiPicker
            selected={emoji}
            onSelect={(e) => { setEmoji(e); setShowEmojiPicker(false); }}
          />
        )}

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

        {/* Category */}
        <Text style={[styles.label, { color: colors.tabBarInactive }]}>Category</Text>
        <CategoryPicker
          selected={category}
          onSelect={setCategory}
          categories={categories}
          colors={colors}
        />

        {/* Pin toggle */}
        <View style={[styles.switchRow, { marginTop: 14 }]}>
          <Text style={{ color: colors.text, fontSize: 14 }}>Pin to frequent items</Text>
          <Switch
            value={isPinned}
            onValueChange={setIsPinned}
            trackColor={{ true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        {/* Action buttons */}
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.editCancelBtn, { borderColor: colors.border }]}
            onPress={handleCancelEdit}
          >
            <Text style={{ color: colors.tabBarInactive, fontWeight: "600", fontSize: 14 }}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editSaveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
            onPress={handleSaveEdit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Save</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Normal (collapsed) row ──
  return (
    <View style={[styles.menuRow, { borderBottomColor: colors.border }]}>
      <Text style={{ fontSize: 24, marginRight: 10 }}>{item.emoji}</Text>

      <View style={{ flex: 1 }}>
        <Text style={{
          color: item.is_available ? colors.text : colors.tabBarInactive,
          fontWeight: "600",
          fontSize: 14,
        }}>
          {item.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
          <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
            KES {formatKES(item.price)}
          </Text>
          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: colors.accent + "18" }]}>
            <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "700" }}>
              {categoryLabel}
            </Text>
          </View>
          {item.has_inventory && (
            <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
              <Text style={{ color: colors.tabBarInactive, fontSize: 10, fontWeight: "600" }}>
                📦 inv
              </Text>
            </View>
          )}
          {item.is_pinned && (
            <Ionicons name="pin" size={11} color={colors.accent} />
          )}
        </View>
      </View>

      <View style={styles.rowControls}>
        {/* Edit button */}
        <TouchableOpacity onPress={() => setEditing(true)} style={styles.iconBtn}>
          <Ionicons name="pencil-outline" size={17} color={colors.tabBarInactive} />
        </TouchableOpacity>

        {/* Available toggle */}
        <Switch
          value={item.is_available}
          onValueChange={toggleAvailable}
          trackColor={{ true: "#30D158", false: colors.border }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />

        {/* Delete — manual items only */}
        {!item.has_inventory && (
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={17} color="#FF453A" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}


// ── MAIN SHEET ────────────────────────────────────────────

export default function MenuManagerSheet({ visible, onClose }) {
  const { colors } = useTheme();
  const { menuItems, unpricedItems, menuCategories, loading, refreshMenu } = useMenu();
  const [showAddForm, setShowAddForm] = useState(false);

  const inventoryItems = (menuItems ?? []).filter((m) => m.has_inventory && m.price > 0);
  const manualItems    = (menuItems ?? []).filter((m) => !m.has_inventory);
  const categories     = menuCategories ?? [];

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
            <Text style={[styles.title, { color: colors.text }]}>Menu Manager</Text>
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
              {(unpricedItems ?? []).length > 0 && (
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
                      categories={categories}
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
                  categories={categories}
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
                    <MenuItemRow key={item.id} item={item} categories={categories} colors={colors} />
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
                    <MenuItemRow key={item.id} item={item} categories={categories} colors={colors} />
                  ))}
                </>
              )}

              {(menuItems ?? []).length === 0 && (unpricedItems ?? []).length === 0 && (
                <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
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


// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, maxHeight: "92%" },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle:    { width: 40, height: 4, borderRadius: 2 },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: "700" },

  needsPricingBanner: {
    flexDirection: "row", alignItems: "center",
    padding: 10, borderRadius: 8, borderWidth: 1,
    marginBottom: 8,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1,
    marginTop: 16, marginBottom: 8,
  },

  // Unpriced card — expands to show form
  unpricedCard:   { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  unpricedHeader: { flexDirection: "row", alignItems: "center" },

  // Add toggle
  addToggle: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 10, borderWidth: 1,
    marginBottom: 12, marginTop: 8,
  },

  // Existing menu item row
  menuRow:     { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  rowControls: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn:     { padding: 5 },

  // Category badge on row
  categoryBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6,
  },

  // Edit card
  editCard: { borderWidth: 1.5, borderRadius: 12, padding: 16, marginBottom: 8 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  editCancelBtn: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1,
    alignItems: "center",
  },
  editSaveBtn: {
    flex: 1, padding: 12, borderRadius: 10,
    alignItems: "center",
  },

  // Add item form
  formBox:   { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 8 },
  formTitle: { fontSize: 16, fontWeight: "700" },

  emojiSelector: {
    alignSelf: "flex-start", alignItems: "center",
    padding: 10, borderRadius: 10, borderWidth: 1,
    marginBottom: 12, minWidth: 64,
  },

  label:     { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 4 },
  input:     { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 4 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  saveBtn:   { padding: 13, borderRadius: 10, alignItems: "center", marginTop: 4 },

  // Category picker
  categoryPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1,
  },
  categoryChipText: { fontSize: 12, fontWeight: "700" },
  categoryAddRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  categoryAddInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  categoryAddBtn: {
    width: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
