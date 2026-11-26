// components/POS/RecipeEditorSheet.jsx
// Modal sheet for editing a menu item's recipe (BOM).
// Ingredients are raw materials deducted from inventory on sale.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";
import { useMenu } from "../../context/MenuContext";
import { useInventory } from "../../context/InventoryContext";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── IngredientRow ─────────────────────────────────────────
// A single ingredient line: product name, unit, quantity input, remove btn.

function IngredientRow({ ingredient, onQuantityChange, onRemove, colors }) {
  const [qtyText, setQtyText] = useState(String(ingredient.quantity));

  useEffect(() => {
    setQtyText(String(ingredient.quantity));
  }, [ingredient.quantity]);

  const handleQtyChange = (text) => {
    setQtyText(text);
    const num = parseFloat(text);
    if (!isNaN(num) && num > 0) {
      onQuantityChange(ingredient.product_id, num);
    }
  };

  return (
    <View style={[styles.ingredientRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
          {ingredient.product_name}
        </Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
          {ingredient.unit || "units"}
        </Text>
      </View>
      <View style={styles.qtyInputWrap}>
        <TextInput
          style={[styles.qtyInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
          placeholder="0.000"
          placeholderTextColor={colors.tabBarInactive}
          keyboardType="decimal-pad"
          value={qtyText}
          onChangeText={handleQtyChange}
          selectTextOnFocus
        />
        <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginLeft: 4 }}>
          {ingredient.unit || ""}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onRemove(ingredient.product_id)} style={styles.removeBtn}>
        <Ionicons name="close-circle" size={20} color="#FF453A" />
      </TouchableOpacity>
    </View>
  );
}

// ── ProductPicker ─────────────────────────────────────────
// Search input + dropdown results for selecting an ingredient product.

function ProductPicker({ onSelect, onClose, colors }) {
  const { searchProducts } = useInventory();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        // Search all products — auto_deduct_on_sale is for POS auto-deduction,
        // not recipe ingredient selection. Any product can be a recipe ingredient.
        const data = await searchProducts(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchProducts]);

  return (
    <View style={[styles.pickerBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.pickerHeader}>
        <Ionicons name="search-outline" size={16} color={colors.tabBarInactive} />
        <TextInput
          style={[styles.pickerInput, { color: colors.text }]}
          placeholder="Search products..."
          placeholderTextColor={colors.tabBarInactive}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={18} color={colors.tabBarInactive} />
        </TouchableOpacity>
      </View>

      {searching && <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />}

      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
        {results.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={[styles.pickerResult, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(product)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                {product.name}
              </Text>
              <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                {product.unit || "units"} · Stock: {product.current_stock ?? 0}
              </Text>
            </View>
            {product.cost_per_unit != null && (
              <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
                KES {formatKES(product.cost_per_unit)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
        {!searching && query.trim() && results.length === 0 && (
          <Text style={{ color: colors.tabBarInactive, textAlign: "center", paddingVertical: 16, fontSize: 13 }}>
            No products found
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── RecipeEditorSheet ─────────────────────────────────────

export default function RecipeEditorSheet({ visible, item, onClose }) {
  const { colors } = useTheme();
  const { getMenuItemRecipe, setMenuItemIngredients } = useMenu();
  const { products, searchProducts } = useInventory();

  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Load existing recipe when sheet opens
  // NOTE: products is intentionally excluded from deps to avoid resetting
  // the form when inventory data refreshes in the background.
  useEffect(() => {
    if (!visible || !item?.id) return;
    setLoading(true);
    getMenuItemRecipe(item.id)
      .then((recipe) => {
        // Match products from context to get cost_per_unit
        setIngredients(
          recipe.map((ing) => {
            const product = products.find((p) => String(p.id) === String(ing.product_id));
            return {
              product_id:    ing.product_id,
              product_name:  ing.product_name,
              unit:          ing.unit,
              quantity:      ing.quantity,
              cost_per_unit: product?.cost_per_unit ?? null,
            };
          })
        );
      })
      .catch((err) => {
        Alert.alert("Error", err?.message || "Failed to load recipe.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?.id]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!visible) {
      setIngredients([]);
      setShowPicker(false);
    }
  }, [visible]);

  const handleAddProduct = useCallback((product) => {
    setIngredients((prev) => {
      // Prevent duplicates
      if (prev.some((i) => String(i.product_id) === String(product.id))) {
        Alert.alert("Duplicate", "This product is already in the recipe.");
        return prev;
      }
      return [
        ...prev,
        {
          product_id:   product.id,
          product_name: product.name,
          unit:         product.unit || "",
          quantity:     0.001, // default small quantity
          cost_per_unit: product.cost_per_unit ?? null,
        },
      ];
    });
    setShowPicker(false);
  }, []);

  const handleQuantityChange = useCallback((productId, quantity) => {
    setIngredients((prev) =>
      prev.map((i) =>
        String(i.product_id) === String(productId) ? { ...i, quantity } : i
      )
    );
  }, []);

  const handleRemoveIngredient = useCallback((productId) => {
    setIngredients((prev) =>
      prev.filter((i) => String(i.product_id) !== String(productId))
    );
  }, []);

  // Calculate recipe cost from ingredients
  const recipeCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const cost = ing.cost_per_unit ?? 0;
      return sum + (ing.quantity * cost);
    }, 0);
  }, [ingredients]);

  const margin = item?.price ? item.price - recipeCost : 0;
  const marginPercent = item?.price ? (margin / item.price) * 100 : 0;

  const handleSave = async () => {
    // Validate
    if (ingredients.length === 0) {
      // Empty recipe = clear recipe
      try {
        setSaving(true);
        await setMenuItemIngredients({ item_id: item.id, ingredients: [] });
        onClose();
      } catch (err) {
        Alert.alert("Error", err?.message || "Failed to clear recipe.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validate all quantities
    for (const ing of ingredients) {
      if (!ing.quantity || ing.quantity <= 0) {
        Alert.alert("Invalid Quantity", `Please enter a valid quantity for ${ing.product_name}.`);
        return;
      }
      // Check max 3 decimals
      const decimals = (ing.quantity.toString().split(".")[1] || "").length;
      if (decimals > 3) {
        Alert.alert("Precision Error", `Quantity for ${ing.product_name} can have at most 3 decimal places.`);
        return;
      }
    }

    try {
      setSaving(true);
      await setMenuItemIngredients({
        item_id: item.id,
        ingredients: ingredients.map((i) => ({
          product_id: i.product_id,
          quantity:  i.quantity,
        })),
      });
      onClose();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearRecipe = () => {
    Alert.alert(
      "Clear Recipe",
      "Remove all ingredients? The item will revert to direct product deduction or no deduction.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await setMenuItemIngredients({ item_id: item.id, ingredients: [] });
              setIngredients([]);
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to clear recipe.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Recipe</Text>
              <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 2 }}>
                {item.emoji} {item.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.tabBarInactive} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Product link hint */}
              {item.product_id && (
                <View style={[styles.hintBox, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: 12, marginLeft: 8, flex: 1 }}>
                    This item has a direct product link. Recipe takes priority when ingredients are set.
                  </Text>
                </View>
              )}

              {/* Ingredients list */}
              <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>
                INGREDIENTS
              </Text>

              {ingredients.length === 0 && !showPicker && (
                <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginVertical: 20, fontSize: 13 }}>
                  No ingredients yet. Add products below.
                </Text>
              )}

              {ingredients.map((ing) => (
                <IngredientRow
                  key={ing.product_id}
                  ingredient={ing}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveIngredient}
                  colors={colors}
                />
              ))}

              {/* Add ingredient button / picker */}
              {!showPicker ? (
                <TouchableOpacity
                  style={[styles.addBtn, { borderColor: colors.accent, backgroundColor: colors.accent + "15" }]}
                  onPress={() => setShowPicker(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontWeight: "600", marginLeft: 8 }}>
                    Add Ingredient
                  </Text>
                </TouchableOpacity>
              ) : (
                <ProductPicker
                  onSelect={handleAddProduct}
                  onClose={() => setShowPicker(false)}
                  colors={colors}
                />
              )}

              {/* Cost & Margin summary */}
              {ingredients.length > 0 && (
                <View style={[styles.summaryBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={styles.summaryRow}>
                    <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Recipe Cost</Text>
                    <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
                      KES {formatKES(recipeCost)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Menu Price</Text>
                    <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
                      KES {formatKES(item.price)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>Margin</Text>
                    <Text style={{ color: margin >= 0 ? "#30D158" : "#FF453A", fontWeight: "700", fontSize: 14 }}>
                      KES {formatKES(margin)} ({marginPercent.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actions}>
                {ingredients.length > 0 && (
                  <TouchableOpacity
                    style={[styles.clearBtn, { borderColor: "#FF453A" }]}
                    onPress={handleClearRecipe}
                    disabled={saving}
                  >
                    <Text style={{ color: "#FF453A", fontWeight: "600", fontSize: 14 }}>
                      Clear Recipe
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                      {ingredients.length === 0 ? "Clear Recipe" : "Save Recipe"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, maxHeight: "90%" },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle:    { width: 40, height: 4, borderRadius: 2 },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: "700" },

  hintBox: {
    flexDirection: "row", alignItems: "center",
    padding: 10, borderRadius: 8, borderWidth: 1,
    marginBottom: 12,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1,
    marginBottom: 8,
  },

  ingredientRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  qtyInputWrap: { flexDirection: "row", alignItems: "center", marginRight: 8 },
  qtyInput: {
    width: 70, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, textAlign: "center",
  },
  removeBtn: { padding: 4 },

  pickerBox: {
    borderWidth: 1, borderRadius: 10, marginTop: 8, marginBottom: 12,
  },
  pickerHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(128,128,128,0.2)",
  },
  pickerInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  pickerResult: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1,
  },

  addBtn: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 10, borderWidth: 1,
    marginTop: 8, marginBottom: 12,
    justifyContent: "center",
  },

  summaryBox: {
    borderWidth: 1, borderRadius: 10,
    padding: 12, marginTop: 8, marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },

  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  clearBtn: {
    flex: 1, padding: 12, borderRadius: 10, borderWidth: 1,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1, padding: 12, borderRadius: 10,
    alignItems: "center",
  },
});
