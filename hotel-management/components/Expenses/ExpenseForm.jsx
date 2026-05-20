// components/Expenses/ExpenseForm.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useExpenses }  from "../../context/ExpensesContext";
import { useInventory } from "../../context/InventoryContext";
import { useTheme }     from "../../hooks/useTheme";
import { payBalanceService } from "../../services/expenseService";
import {
  addStockFromExpenseService,
  createProductWithStockService,
  suggestCategoryService,
} from "../../services/inventoryService";

const UNITS = ["kg", "g", "litres", "ml", "pcs", "bags", "boxes"];

export default function ExpenseForm({ onClose }) {
  const { createExpense, loadExpenses, notifyMenuOfNewProduct } = useExpenses();
  const { loadProducts, serverCategories, createCategory }      = useInventory();
  const { colors } = useTheme();

  const [form, setForm] = useState({
    supplier_name: "",
    item_name:     "",
    quantity:      "",
    unit_price:    "",
    amount_paid:   "",
    category_id:   null,   // now an FK id
    purchase_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // ── Category suggestion state ────────────────────────
  const [suggestionBanner, setSuggestionBanner] = useState(null);
  const [suggestLoading,   setSuggestLoading]   = useState(false);
  const suggestTimer = useRef(null);

  // ── New category modal ───────────────────────────────
  const [newCatModalVisible, setNewCatModalVisible] = useState(false);
  const [newCatName,         setNewCatName]         = useState("");
  const [newCatSaving,       setNewCatSaving]       = useState(false);

  // ── Unit picker state ────────────────────────────────
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [pendingUnitData,  setPendingUnitData]  = useState(null);
  const [customUnit,       setCustomUnit]       = useState("");
  const [showCustomInput,  setShowCustomInput]  = useState(false);

  // ── POS modal state ──────────────────────────────────
  const [posModalVisible, setPosModalVisible] = useState(false);
  const [pendingPosData,  setPendingPosData]  = useState(null);

  // ── Inventory confirm modal ──────────────────────────
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [pendingInventoryData,  setPendingInventoryData]  = useState(null);

  // ── New product confirm modal ────────────────────────
  const [newProductModalVisible, setNewProductModalVisible] = useState(false);
  const [pendingNewProductData,  setPendingNewProductData]  = useState(null);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const total         = Number(form.quantity || 0) * Number(form.unit_price || 0);
  const paid          = Number(form.amount_paid || 0);
  const balance       = Math.max(total - paid, 0);
  const isBalanceOwed = balance > 0 && total > 0;

  const totalDisplay = total.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const selectedCategory = serverCategories.find(
    (c) => c.id === form.category_id
  ) || null;

  // ── Auto-suggest category as item name is typed ──────
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);

    if (form.category_id || form.item_name.trim().length < 3) {
      setSuggestionBanner(null);
      return;
    }

    suggestTimer.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const result = await suggestCategoryService(form.item_name);
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
    }, 600);

    return () => clearTimeout(suggestTimer.current);
  }, [form.item_name]);

  const acceptSuggestion = () => {
    if (!suggestionBanner) return;
    set("category_id", suggestionBanner.categoryId);
    setSuggestionBanner(null);
  };

  // ── Create new category ───────────────────────────────
  const saveNewCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setNewCatSaving(true);
    try {
      const cat = await createCategory(name);
      set("category_id", cat.id);
      setNewCatModalVisible(false);
      setNewCatName("");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create category.");
    } finally {
      setNewCatSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // PROMPT CHAIN
  // ─────────────────────────────────────────────────────

  const promptAddToExistingStock = (matchedProduct, expenseId, quantity) => {
    setPendingInventoryData({ matchedProduct, expenseId, quantity });
    setInventoryModalVisible(true);
  };

  const confirmAddToExistingStock = async () => {
    setInventoryModalVisible(false);
    const { matchedProduct, expenseId, quantity } = pendingInventoryData;
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
  };

  const promptCreateNewProduct = (itemName, expenseId, quantity) => {
    setPendingNewProductData({ itemName, expenseId, quantity });
    setNewProductModalVisible(true);
  };

  const confirmCreateNewProduct = () => {
    setNewProductModalVisible(false);
    const { itemName, expenseId, quantity } = pendingNewProductData;
    promptPOSDeductible(itemName, expenseId, quantity);
  };

  const promptPOSDeductible = (itemName, expenseId, quantity) => {
    setPendingPosData({ itemName, expenseId, quantity });
    setPosModalVisible(true);
  };

  const confirmPOS = (autoDeduct) => {
    setPosModalVisible(false);
    const { itemName, expenseId, quantity } = pendingPosData;
    setPendingUnitData({ itemName, expenseId, quantity, autoDeduct });
    setUnitModalVisible(true);
  };

  const selectUnit = (unit) => {
    setUnitModalVisible(false);
    setShowCustomInput(false);
    setCustomUnit("");
    if (!pendingUnitData) return;
    const { itemName, expenseId, quantity, autoDeduct } = pendingUnitData;
    createAtomically(itemName, expenseId, quantity, unit, form.category_id, autoDeduct);
    setPendingUnitData(null);
  };

  const submitCustomUnit = () => {
    const trimmed = customUnit.trim().toLowerCase();
    if (!trimmed) return;
    selectUnit(trimmed);
  };

  const closeUnitModal = () => {
    setUnitModalVisible(false);
    setShowCustomInput(false);
    setCustomUnit("");
    onClose?.();
  };

  const createAtomically = async (
    itemName, expenseId, quantity, unit, category_id, autoDeduct,
  ) => {
    try {
      await createProductWithStockService({
        name:                itemName,
        unit,
        category_id,         // now an id
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
  // SUBMIT
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
    <>
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
          <Text style={[styles.totalLabel, { color: colors.tabBarInactive }]}>TOTAL AMOUNT</Text>
          <View style={styles.totalRow}>
            <Text style={[styles.totalCurrency, { color: colors.accent }]}>KES</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{totalDisplay}</Text>
          </View>
          {isBalanceOwed && (
            <Text style={[styles.balanceHint, { color: "#E67E22" }]}>
              Balance owed: KES {balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </Text>
          )}
        </View>

        {/* ── Category grid — from backend ── */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Category</Text>

        {/* Selected indicator */}
        {selectedCategory && (
          <View style={[styles.selectedCatRow, { backgroundColor: colors.accent + "15", borderColor: colors.accent }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13, flex: 1, marginLeft: 6 }}>
              {selectedCategory.name}
            </Text>
            <TouchableOpacity onPress={() => set("category_id", null)}>
              <Ionicons name="close-circle" size={18} color={colors.tabBarInactive} />
            </TouchableOpacity>
          </View>
        )}

        {/* Suggestion banner */}
        {suggestionBanner && (
          <View style={[styles.suggestionBanner, { backgroundColor: colors.accent + "15", borderColor: colors.accent }]}>
            <Ionicons name="bulb-outline" size={15} color={colors.accent} />
            <Text style={[styles.suggestionText, { color: colors.accent }]}>
              Similar to "{suggestionBanner.matchedName}" — use{" "}
              <Text style={{ fontWeight: "700" }}>{suggestionBanner.categoryName}</Text>?
            </Text>
            <TouchableOpacity onPress={acceptSuggestion} style={styles.suggestionAccept}>
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 12 }}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSuggestionBanner(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={14} color={colors.tabBarInactive} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.categoryGrid}>
          {serverCategories.map(cat => {
            const selected = form.category_id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => set("category_id", selected ? null : cat.id)}
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
                    name={selected ? "checkmark-circle" : "folder-outline"}
                    size={22}
                    color={selected ? colors.accent : colors.tabBarInactive}
                  />
                </View>
                <Text style={[styles.categoryLabel, { color: selected ? colors.accent : colors.text }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* New Category tile */}
          <TouchableOpacity
            style={[
              styles.categoryTile,
              styles.newCategoryTile,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={() => setNewCatModalVisible(true)}
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
          <Text style={[styles.cardSectionLabel, { color: colors.accent }]}>ITEM DETAILS</Text>

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
            {suggestLoading && (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
            )}
          </View>

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
          <Text style={[styles.receiptTitle, { color: colors.text }]}>Upload or Scan Receipt</Text>
          <Text style={[styles.receiptSub, { color: colors.tabBarInactive }]}>PDF, JPG, PNG up to 10MB</Text>
        </TouchableOpacity>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: submitting ? colors.border : colors.accent }]}
          onPress={submit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Ionicons
            name={submitting ? "hourglass-outline" : "checkmark-circle-outline"}
            size={20} color="#fff" style={{ marginRight: 8 }}
          />
          <Text style={styles.submitText}>{submitting ? "Saving..." : "Add Expense"}</Text>
        </TouchableOpacity>
      </ScrollView>

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

      {/* ══════════════════════════════════════════════════
          MODAL 1 — Add to existing inventory?
      ══════════════════════════════════════════════════ */}
      <Modal visible={inventoryModalVisible} transparent animationType="slide"
        onRequestClose={() => { setInventoryModalVisible(false); onClose?.(); }}>
        <TouchableWithoutFeedback onPress={() => { setInventoryModalVisible(false); onClose?.(); }}>
          <View style={modal.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[modal.sheet, { backgroundColor: colors.card }]}>
          <View style={modal.handleRow}><View style={[modal.handle, { backgroundColor: colors.border }]} /></View>
          <View style={[modal.iconCircle, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="cube-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[modal.title, { color: colors.text }]}>Add to Inventory?</Text>
          <Text style={[modal.body, { color: colors.tabBarInactive }]}>
            {`"${pendingInventoryData?.matchedProduct?.name}" already exists with ${pendingInventoryData?.matchedProduct?.current_stock} ${pendingInventoryData?.matchedProduct?.unit} in stock.\n\nAdd ${pendingInventoryData?.quantity} ${pendingInventoryData?.matchedProduct?.unit} from this expense?`}
          </Text>
          <TouchableOpacity style={[modal.primaryBtn, { backgroundColor: colors.accent }]} onPress={confirmAddToExistingStock}>
            <Text style={modal.primaryBtnText}>Yes, Add Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[modal.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => { setInventoryModalVisible(false); onClose?.(); }}>
            <Text style={[modal.secondaryBtnText, { color: colors.tabBarInactive }]}>No, Skip</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          MODAL 2 — Create new product?
      ══════════════════════════════════════════════════ */}
      <Modal visible={newProductModalVisible} transparent animationType="slide"
        onRequestClose={() => { setNewProductModalVisible(false); onClose?.(); }}>
        <TouchableWithoutFeedback onPress={() => { setNewProductModalVisible(false); onClose?.(); }}>
          <View style={modal.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[modal.sheet, { backgroundColor: colors.card }]}>
          <View style={modal.handleRow}><View style={[modal.handle, { backgroundColor: colors.border }]} /></View>
          <View style={[modal.iconCircle, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="add-circle-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[modal.title, { color: colors.text }]}>Not in Inventory</Text>
          <Text style={[modal.body, { color: colors.tabBarInactive }]}>
            {`"${pendingNewProductData?.itemName}" was not found in inventory.\n\nWould you like to add it as a new product?`}
          </Text>
          <TouchableOpacity style={[modal.primaryBtn, { backgroundColor: colors.accent }]} onPress={confirmCreateNewProduct}>
            <Text style={modal.primaryBtnText}>Yes, Create Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[modal.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => { setNewProductModalVisible(false); onClose?.(); }}>
            <Text style={[modal.secondaryBtnText, { color: colors.tabBarInactive }]}>No, Skip</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          MODAL 3 — POS item or ingredient?
      ══════════════════════════════════════════════════ */}
      <Modal visible={posModalVisible} transparent animationType="slide"
        onRequestClose={() => { setPosModalVisible(false); onClose?.(); }}>
        <TouchableWithoutFeedback onPress={() => { setPosModalVisible(false); onClose?.(); }}>
          <View style={modal.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[modal.sheet, { backgroundColor: colors.card }]}>
          <View style={modal.handleRow}><View style={[modal.handle, { backgroundColor: colors.border }]} /></View>
          <View style={[modal.iconCircle, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="storefront-outline" size={28} color={colors.accent} />
          </View>
          <Text style={[modal.title, { color: colors.text }]}>Sold at POS Counter?</Text>
          <Text style={[modal.body, { color: colors.tabBarInactive }]}>
            {`Will "${pendingPosData?.itemName}" be sold directly at the POS counter?\n\nEnable for items like water, snacks, etc. Stock will auto-deduct when sold.`}
          </Text>
          <TouchableOpacity style={[modal.primaryBtn, { backgroundColor: colors.accent }]} onPress={() => confirmPOS(true)}>
            <Text style={modal.primaryBtnText}>Yes — POS Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[modal.secondaryBtn, { borderColor: colors.border }]} onPress={() => confirmPOS(false)}>
            <Text style={[modal.secondaryBtnText, { color: colors.text }]}>No — Raw / Ingredient</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════
          MODAL 4 — Unit picker
      ══════════════════════════════════════════════════ */}
      <Modal visible={unitModalVisible} transparent animationType="slide" onRequestClose={closeUnitModal}>
        <TouchableWithoutFeedback onPress={closeUnitModal}>
          <View style={modal.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[modal.sheet, { backgroundColor: colors.card }]}>
          <View style={modal.handleRow}><View style={[modal.handle, { backgroundColor: colors.border }]} /></View>
          <Text style={[modal.title, { color: colors.text }]}>Select Unit of Measure</Text>
          <Text style={[modal.body, { color: colors.tabBarInactive }]}>
            {`What unit is "${pendingUnitData?.itemName}" measured in?`}
          </Text>
          <View style={unitPicker.grid}>
            {UNITS.map((unit) => (
              <TouchableOpacity key={unit} onPress={() => selectUnit(unit)}
                style={[unitPicker.btn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[unitPicker.btnText, { color: colors.text }]}>{unit}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowCustomInput(true)}
              style={[unitPicker.btn, {
                backgroundColor: showCustomInput ? colors.accent + "15" : colors.background,
                borderColor:     showCustomInput ? colors.accent : colors.border,
              }]}>
              <Text style={[unitPicker.btnText, { color: showCustomInput ? colors.accent : colors.tabBarInactive }]}>
                Other
              </Text>
            </TouchableOpacity>
          </View>
          {showCustomInput && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, marginBottom: 6, color: colors.tabBarInactive }}>Enter unit name</Text>
              <View style={[styles.fieldRow, { borderColor: colors.accent, backgroundColor: colors.background }]}>
                <Ionicons name="create-outline" size={16} color={colors.accent} style={styles.fieldIcon} />
                <TextInput
                  autoFocus
                  placeholder="e.g. crates, packets, rolls..."
                  placeholderTextColor={colors.tabBarInactive}
                  value={customUnit}
                  onChangeText={setCustomUnit}
                  style={[styles.fieldInput, { color: colors.text }]}
                  returnKeyType="done"
                  onSubmitEditing={submitCustomUnit}
                />
                {customUnit.trim().length > 0 && (
                  <TouchableOpacity onPress={submitCustomUnit} style={{ padding: 6 }}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          <TouchableOpacity style={[modal.secondaryBtn, { borderColor: colors.border }]} onPress={closeUnitModal}>
            <Text style={[modal.secondaryBtnText, { color: colors.tabBarInactive }]}>Cancel</Text>
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
  scroll:        { paddingTop: 25, paddingBottom: 40 },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: 8, paddingBottom: 16 },
  backBtn:       { padding: 4 },
  moreBtn:       { padding: 4 },
  headerTitle:   { fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },
  totalSection:  { alignItems: "center", paddingBottom: 20, marginBottom: 20, borderBottomWidth: 1, paddingHorizontal: 16 },
  totalLabel:    { fontSize: 11, letterSpacing: 1.5, marginBottom: 6, fontWeight: "600" },
  totalRow:      { flexDirection: "row", alignItems: "baseline", gap: 8 },
  totalCurrency: { fontSize: 22, fontWeight: "700" },
  totalValue:    { fontSize: 44, fontWeight: "300", letterSpacing: -1 },
  balanceHint:   { marginTop: 6, fontSize: 12, fontWeight: "600" },
  sectionLabel:  { fontSize: 16, fontWeight: "700", marginBottom: 12, paddingHorizontal: 4 },

  selectedCatRow:   { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  suggestionBanner: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
  suggestionText:   { flex: 1, fontSize: 12 },
  suggestionAccept: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },

  categoryGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  categoryTile:     { width: "30%", aspectRatio: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 6, padding: 8 },
  newCategoryTile:  { borderStyle: "dashed" },
  categoryIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  categoryLabel:    { fontSize: 11, fontWeight: "600", textAlign: "center", lineHeight: 15 },

  detailsCard:      { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 20, gap: 2 },
  cardSectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 12 },
  fieldLabel:       { fontSize: 12, marginTop: 10, marginBottom: 6 },
  optionalTag:      { fontSize: 11, fontStyle: "italic" },
  fieldRow:         { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, minHeight: 44 },
  fieldIcon:        { marginRight: 8 },
  fieldInput:       { flex: 1, fontSize: 14, paddingVertical: Platform.OS === "ios" ? 10 : 8 },
  twoCol:           { flexDirection: "row", alignItems: "flex-start" },
  twoColGap:        { width: 10 },

  receiptZone:     { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 28, marginBottom: 24, gap: 6 },
  receiptIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  receiptTitle:    { fontSize: 15, fontWeight: "600" },
  receiptSub:      { fontSize: 12 },

  submitBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 14, minHeight: 54 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },
});

const modal = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:           { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 40 },
  handleRow:       { alignItems: "center", paddingVertical: 12 },
  handle:          { width: 40, height: 4, borderRadius: 2 },
  iconCircle:      { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  title:           { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 10 },
  body:            { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  primaryBtn:      { padding: 15, borderRadius: 12, alignItems: "center", marginBottom: 10 },
  primaryBtnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn:    { padding: 15, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  secondaryBtnText:{ fontWeight: "600", fontSize: 15 },
});

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

const unitPicker = StyleSheet.create({
  grid:    { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  btn:     { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, minWidth: 80, alignItems: "center" },
  btnText: { fontSize: 15, fontWeight: "600" },
});