// app/(tabs)/inventory.jsx

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useInventory } from "../../context/InventoryContext";
import { useTheme } from "../../hooks/useTheme";

import AddItemSheet from "../../components/Inventory/AddItemSheet";
import DeductStockModal from "../../components/Inventory/DeductStockModal";
import StockHistorySheet from "../../components/Inventory/StockHistorySheet";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

const STOCK_COLORS = {
  ok: "#30D158",
  low: "#FF9F0A",
  out: "#FF453A",
};

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { products, categories, loading } = useInventory();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDeduct, setShowDeduct] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  /* ---------------- SHEET OPEN / CLOSE ---------------- */

  const openSheet = () => {
    setShowAddSheet(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setShowAddSheet(false));
  };

  /* ---------------- BACK HANDLER ---------------- */

  useEffect(() => {
    const onBackPress = () => {
      if (showAddSheet) { closeSheet(); return true; }
      if (showDeduct) { setShowDeduct(false); return true; }
      if (showHistory) { setShowHistory(false); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [showAddSheet, showDeduct, showHistory]);

  /* ---------------- FILTER + SEARCH ---------------- */

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "All" ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  /* ---------------- GROUP BY CATEGORY ---------------- */

  const categoryGroups = useMemo(() => {
    const groups = {};
    filteredProducts.forEach((p) => {
      const key = p.category || "Uncategorized";
      if (!groups[key]) groups[key] = { category: key, items: [] };
      groups[key].items.push(p);
    });
    return Object.values(groups).sort((a, b) =>
      a.category.localeCompare(b.category)
    );
  }, [filteredProducts]);

  /* ---------------- STOCK HELPERS ---------------- */

  const getStockColor = (qty) => {
    if (qty <= 0) return STOCK_COLORS.out;
    if (qty < 10) return STOCK_COLORS.low;
    return STOCK_COLORS.ok;
  };

  const getStockLabel = (qty) => {
    if (qty <= 0) return "Out of Stock";
    if (qty < 10) return "Low Stock";
    return null;
  };

  /* ---------------- PRODUCT CARD ---------------- */

  const renderProduct = (product) => {
    const stockColor = getStockColor(product.current_stock);
    const stockLabel = getStockLabel(product.current_stock);

    return (
      <View
        key={product.id}
        style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.rowBetween}>
          <Text style={[styles.productName, { color: colors.text }]}>
            {product.name}
          </Text>
          {stockLabel && (
            <View style={[styles.stockBadge, { backgroundColor: stockColor + "20" }]}>
              <Text style={{ color: stockColor, fontSize: 11, fontWeight: "700" }}>
                {stockLabel}
              </Text>
            </View>
          )}
        </View>

        <Text style={{ color: stockColor, fontWeight: "700", marginTop: 4 }}>
          {product.current_stock} {product.unit}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.accent, backgroundColor: colors.accent + "15" }]}
            onPress={() => { setSelectedProduct(product); setShowDeduct(true); }}
          >
            <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 12 }}>
              Deduct
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => { setSelectedProduct(product); setShowHistory(true); }}
          >
            <Text style={{ color: colors.tabBarInactive, fontWeight: "600", fontSize: 12 }}>
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ---------------- CATEGORY GROUP ---------------- */

  const renderGroup = ({ item }) => (
    <View style={styles.group}>
      <Text style={[styles.categoryLabel, { color: colors.tabBarInactive }]}>
        {item.category.toUpperCase()}
      </Text>
      {item.items.map((product) => renderProduct(product))}
    </View>
  );

  /* ---------------- UI ---------------- */

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={[styles.searchBar, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Search items..."
        placeholderTextColor={colors.tabBarInactive}
      />

      <View style={[styles.categoryContainer, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => {
            const selected = cat === selectedCategory;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: selected ? colors.accent : colors.background,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={{ color: selected ? "#fff" : colors.text, fontWeight: "500" }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={categoryGroups}
        keyExtractor={(item) => item.category}
        renderItem={renderGroup}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
            No items found.
          </Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={openSheet}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Item Bottom Sheet */}
      {showAddSheet && (
        <>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <AddItemSheet onClose={closeSheet} />
            </KeyboardAvoidingView>
          </Animated.View>
        </>
      )}

      <DeductStockModal
        visible={showDeduct}
        product={selectedProduct}
        onClose={() => setShowDeduct(false)}
      />

      <StockHistorySheet
        visible={showHistory}
        product={selectedProduct}
        onClose={() => setShowHistory(false)}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  searchBar: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 15, fontSize: 14, marginBottom: 6 },
  categoryContainer: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 10 },
  categoryPill: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  group: { marginBottom: 16 },
  categoryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  productCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  productName: { fontSize: 15, fontWeight: "600", flex: 1 },
  stockBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1 },
  fab: { position: "absolute", bottom: 10, right: 10, width: 55, height: 55, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 5 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 10 },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 11, elevation: 16, paddingHorizontal: 16, paddingBottom: 16 },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
});