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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useExpenses }  from "../../context/ExpensesContext";
import { useInventory } from "../../context/InventoryContext";
import { useTheme }     from "../../hooks/useTheme";
import { payBalanceService } from "../../services/expenseService";
import {
  addStockFromExpenseService,
  createProductWithStockService,
} from "../../services/inventoryService";

// ─────────────────────────────────────────────────────────
// CATEGORY CONFIG
// label   → shown in UI tile
// value   → sent to backend (matches existing Alert chain)
// icon    → Ionicons name
// ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "Dry Goods",     value: "dry goods",   icon: "cube-outline"        },
  { label: "Vegetables",    value: "vegetables",  icon: "leaf-outline"        },
  { label: "Meat & Dairy",  value: "meat",        icon: "restaurant-outline"  },
  { label: "Beverages",     value: "beverages",   icon: "wine-outline"        },
];

export default function ExpenseForm({ onClose }) {
  const { createExpense, loadExpenses, notifyMenuOfNewProduct } = useExpenses();
  const { loadProducts } = useInventory();
  const { colors }       = useTheme();

  const [form, setForm] = useState({
    supplier_name: "",
    item_name:     "",
    quantity:      "",
    unit_price:    "",
    amount_paid:   "",
    category:      "dry goods",   // default — first tile pre-selected
    purchase_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const total   = Number(form.quantity || 0) * Number(form.unit_price || 0);
  const paid    = Number(form.amount_paid || 0);
  const balance = Math.max(total - paid, 0);

  const isBalanceOwed = balance > 0 && total > 0;

  // ── Derived display ──────────────────────────────────
  const totalDisplay = total.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // ─────────────────────────────────────────────────────
  // INVENTORY PROMPT CHAIN — unchanged logic, same flow
  // ─────────────────────────────────────────────────────

  const promptAddToExistingStock = (matchedProduct, expenseId, quantity) => {
    Alert.alert(
      "Add to Inventory?",
      `"${matchedProduct.name}" exists in inventory with ${matchedProduct.current_stock} ${matchedProduct.unit} in stock.\n\nAdd ${quantity} ${matchedProduct.unit} from this expense?`,
      [
        { text: "No",  style: "cancel", onPress: () => onClose?.() },
        {
          text: "Yes, Add Stock",
          onPress: async () => {
            try {
              await addStockFromExpenseService({
                product_id:      matchedProduct.id,
                quantity:        Number(quantity),
                expense_item_id: expenseId,
              });
              await loadProducts();
            } catch (err) {
              Alert.alert("Stock Error", err?.message || "Failed to add stock.");
            } finally {
              onClose?.();
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const promptCreateNewProduct = (itemName, expenseId, quantity) => {
    Alert.alert(
      "Not in Inventory",
      `"${itemName}" was not found in inventory.\n\nWould you like to add it as a new product?`,
      [
        { text: "No", style: "cancel", onPress: () => onClose?.() },
        {
          text: "Yes, Create Product",
          onPress: () => promptPOSDeductible(itemName, expenseId, quantity),
        },
      ],
      { cancelable: false }
    );
  };

  const promptPOSDeductible = (itemName, expenseId, quantity) => {
    Alert.alert(
      "Sold at POS Counter?",
      `Will "${itemName}" be sold directly at the POS counter?\n\nEnable this for items like water, snacks, etc. Stock will auto-deduct when sold.`,
      [
        { text: "No — Raw/Ingredient", onPress: () => promptUnit(itemName, expenseId, quantity, false) },
        { text: "Yes — POS Item",      onPress: () => promptUnit(itemName, expenseId, quantity, true)  },
      ],
      { cancelable: false }
    );
  };

  const promptUnit = (itemName, expenseId, quantity, autoDeduct) => {
    const units = ["kg", "g", "litres", "ml", "pcs", "bags", "boxes"];
    Alert.alert(
      "Select Unit",
      `What unit is "${itemName}" measured in?`,
      [
        ...units.map(unit => ({
          text:    unit,
          onPress: () => createAtomically(
            itemName, expenseId, quantity,
            unit, form.category, autoDeduct  // ← use the tile-selected category
          ),
        })),
        { text: "Cancel", style: "cancel", onPress: () => onClose?.() },
      ],
      { cancelable: false }
    );
  };

  // NOTE: promptCategory Alert is REMOVED — category is now
  // selected via the tile grid before submission. The value
  // in form.category is passed directly to createAtomically.

  const createAtomically = async (
    itemName, expenseId, quantity, unit, category, autoDeduct,
  ) => {
    try {
      await createProductWithStockService({
        name:                itemName,
        unit,
        category,
        quantity:            Number(quantity),
        expense_item_id:     expenseId,
        auto_deduct_on_sale: autoDeduct,
      });
      await loadProducts();
      await notifyMenuOfNewProduct(autoDeduct);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create product.");
    } finally {
      onClose?.();
    }
  };

  // ─────────────────────────────────────────────────────
  // SUBMIT — identical to original
  // ─────────────────────────────────────────────────────

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
        item_name:     form.item_name.trim(),
        supplier_name: form.supplier_name.trim() || null,
        quantity:      Number(form.quantity),
        unit_price:    Number(form.unit_price),
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

  // ─────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Expense</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Live total ── */}
      <View style={[styles.totalSection, { borderBottomColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.tabBarInactive }]}>
          TOTAL AMOUNT
        </Text>
        <View style={styles.totalRow}>
          <Text style={[styles.totalCurrency, { color: colors.accent }]}>KES</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {totalDisplay}
          </Text>
        </View>
        {isBalanceOwed && (
          <Text style={[styles.balanceHint, { color: "#E67E22" }]}>
            Balance owed: KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </Text>
        )}
      </View>

      {/* ── Category grid ── */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map(cat => {
          const selected = form.category === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              onPress={() => set("category", cat.value)}
              style={[
                styles.categoryTile,
                {
                  backgroundColor: selected ? "transparent" : colors.card,
                  borderColor:     selected ? colors.accent : colors.border,
                  borderWidth:     selected ? 1.5 : 1,
                },
              ]}
            >
              <View style={[
                styles.categoryIconWrap,
                { backgroundColor: selected ? colors.accent + "22" : colors.background },
              ]}>
                <Ionicons
                  name={cat.icon}
                  size={22}
                  color={selected ? colors.accent : colors.tabBarInactive}
                />
              </View>
              <Text style={[
                styles.categoryLabel,
                { color: selected ? colors.accent : colors.text },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* New Category tile — placeholder */}
        <TouchableOpacity
          style={[
            styles.categoryTile,
            styles.newCategoryTile,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          onPress={() => Alert.alert("Coming soon", "Custom categories will be available in a future update.")}
        >
          <View style={[styles.categoryIconWrap, { backgroundColor: colors.background }]}>
            <Ionicons name="add-outline" size={22} color={colors.tabBarInactive} />
          </View>
          <Text style={[styles.categoryLabel, { color: colors.tabBarInactive }]}>
            New{"\n"}Category
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Item details card ── */}
      <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardSectionLabel, { color: colors.accent }]}>
          ITEM DETAILS
        </Text>

        {/* Item name */}
        <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>
          Specific Good / Item Name
        </Text>
        <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="pricetag-outline" size={16} color={colors.tabBarInactive} style={styles.fieldIcon} />
          <TextInput
            placeholder="e.g. Basmati Rice, Organic Tomatoes"
            placeholderTextColor={colors.tabBarInactive}
            value={form.item_name}
            onChangeText={v => set("item_name", v)}
            style={[styles.fieldInput, { color: colors.text }]}
            returnKeyType="next"
          />
        </View>

        {/* Supplier */}
        <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>
          Supplier  <Text style={styles.optionalTag}>(optional)</Text>
        </Text>
        <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="business-outline" size={16} color={colors.tabBarInactive} style={styles.fieldIcon} />
          <TextInput
            placeholder="Supplier name"
            placeholderTextColor={colors.tabBarInactive}
            value={form.supplier_name}
            onChangeText={v => set("supplier_name", v)}
            style={[styles.fieldInput, { color: colors.text }]}
            returnKeyType="next"
          />
        </View>

        {/* Qty + Unit price side by side */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>Quantity</Text>
            <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="layers-outline" size={16} color={colors.tabBarInactive} style={styles.fieldIcon} />
              <TextInput
                placeholder="0"
                placeholderTextColor={colors.tabBarInactive}
                keyboardType="numeric"
                value={form.quantity}
                onChangeText={v => set("quantity", v)}
                style={[styles.fieldInput, { color: colors.text }]}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.twoColGap} />

          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>Unit Price</Text>
            <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="cash-outline" size={16} color={colors.tabBarInactive} style={styles.fieldIcon} />
              <TextInput
                placeholder="0.00"
                placeholderTextColor={colors.tabBarInactive}
                keyboardType="numeric"
                value={form.unit_price}
                onChangeText={v => set("unit_price", v)}
                style={[styles.fieldInput, { color: colors.text }]}
                returnKeyType="next"
              />
            </View>
          </View>
        </View>

        {/* Amount paid */}
        <Text style={[styles.fieldLabel, { color: colors.tabBarInactive }]}>
          Amount Paid  <Text style={styles.optionalTag}>(optional)</Text>
        </Text>
        <View style={[styles.fieldRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="wallet-outline" size={16} color={colors.tabBarInactive} style={styles.fieldIcon} />
          <TextInput
            placeholder="0.00"
            placeholderTextColor={colors.tabBarInactive}
            keyboardType="numeric"
            value={form.amount_paid}
            onChangeText={v => set("amount_paid", v)}
            style={[styles.fieldInput, { color: colors.text }]}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </View>
      </View>

      {/* ── Receipt capture ── */}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>Receipt Capture</Text>
      <TouchableOpacity
        style={[styles.receiptZone, { borderColor: colors.border }]}
        onPress={() => Alert.alert("Coming soon", "Receipt scanning will be available in a future update.")}
        activeOpacity={0.7}
      >
        <View style={[styles.receiptIconWrap, { backgroundColor: colors.card }]}>
          <Ionicons name="receipt-outline" size={28} color={colors.tabBarInactive} />
        </View>
        <Text style={[styles.receiptTitle, { color: colors.text }]}>
          Upload or Scan Receipt
        </Text>
        <Text style={[styles.receiptSub, { color: colors.tabBarInactive }]}>
          PDF, JPG, PNG up to 10MB
        </Text>
      </TouchableOpacity>

      {/* ── CTA ── */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: submitting ? colors.border : colors.accent },
        ]}
        onPress={submit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        <Ionicons
          name={submitting ? "hourglass-outline" : "checkmark-circle-outline"}
          size={20}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.submitText}>
          {submitting ? "Saving..." : "Add Expense"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop:  8,
    paddingBottom: 16,
  },
  backBtn:     { padding: 4 },
  moreBtn:     { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },

  // Total
  totalSection: {
    alignItems:    "center",
    paddingBottom: 20,
    marginBottom:  20,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  totalLabel: {
    fontSize:      11,
    letterSpacing: 1.5,
    marginBottom:  6,
    fontWeight:    "600",
  },
  totalRow: {
    flexDirection: "row",
    alignItems:    "baseline",
    gap:           8,
  },
  totalCurrency: {
    fontSize:   22,
    fontWeight: "700",
  },
  totalValue: {
    fontSize:      44,
    fontWeight:    "300",
    letterSpacing: -1,
  },
  balanceHint: {
    marginTop:  6,
    fontSize:   12,
    fontWeight: "600",
  },

  // Section label
  sectionLabel: {
    fontSize:      16,
    fontWeight:    "700",
    marginBottom:  12,
    paddingHorizontal: 4,
  },

  // Category grid
  categoryGrid: {
    flexDirection:  "row",
    flexWrap:       "wrap",
    gap:            10,
    marginBottom:   20,
  },
  categoryTile: {
    width:          "30%",        // 3-column grid
    aspectRatio:    1,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    gap:            6,
    padding:        8,
  },
  newCategoryTile: {
    borderStyle: "dashed",
  },
  categoryIconWrap: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize:   11,
    fontWeight: "600",
    textAlign:  "center",
    lineHeight: 15,
  },

  // Details card
  detailsCard: {
    borderRadius:  12,
    borderWidth:   1,
    padding:       16,
    marginBottom:  20,
    gap:           2,
  },
  cardSectionLabel: {
    fontSize:      11,
    fontWeight:    "700",
    letterSpacing: 1.2,
    marginBottom:  12,
  },
  fieldLabel: {
    fontSize:     12,
    marginTop:    10,
    marginBottom: 6,
  },
  optionalTag: {
    fontSize:   11,
    fontStyle:  "italic",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems:    "center",
    borderWidth:   1,
    borderRadius:  8,
    paddingHorizontal: 10,
    minHeight:     44,
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldInput: {
    flex:     1,
    fontSize: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },

  // Two-col layout for qty + price
  twoCol: {
    flexDirection: "row",
    alignItems:    "flex-start",
  },
  twoColGap: { width: 10 },

  // Receipt zone
  receiptZone: {
    borderWidth:    1.5,
    borderStyle:    "dashed",
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    paddingVertical:28,
    marginBottom:   24,
    gap:            6,
  },
  receiptIconWrap: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   4,
  },
  receiptTitle: {
    fontSize:   15,
    fontWeight: "600",
  },
  receiptSub: {
    fontSize: 12,
  },

  // Submit
  submitBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    padding:        16,
    borderRadius:   14,
    marginHorizontal: 0,
    minHeight:      54,
  },
  submitText: {
    color:      "#fff",
    fontWeight: "700",
    fontSize:   16,
    letterSpacing: 0.3,
  },
});