// app/recipes.jsx
// Full-screen Recipes manager — lists all menu items and lets the user
// edit each item's Bill of Materials (ingredients) via RecipeEditorSheet.

import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../hooks/useTheme";
import { MenuProvider, useMenu } from "../context/MenuContext";
import { InventoryProvider } from "../context/InventoryContext";
import { useAuth } from "../context/AuthContext";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import RecipeEditorSheet from "../components/POS/RecipeEditorSheet";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── RecipeItemRow ─────────────────────────────────────────
// One menu item row: emoji, name, price, recipe badge, edit button.

function RecipeItemRow({ item, colors, onEdit }) {
  const hasRecipe = item.is_recipe || (item.ingredients?.length ?? 0) > 0;
  const ingredientCount = item.ingredients?.length ?? 0;

  return (
    <TouchableOpacity
      style={[styles.itemRow, { borderBottomColor: colors.border }]}
      onPress={() => onEdit(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.itemEmoji}>{item.emoji || "🍽️"}</Text>

      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemPrice, { color: colors.tabBarInactive }]}>
            KES {formatKES(item.price)}
          </Text>
          {hasRecipe ? (
            <View style={[styles.recipeBadge, { backgroundColor: colors.accent + "20" }]}>
              <Ionicons name="nutrition-outline" size={11} color={colors.accent} />
              <Text style={[styles.recipeBadgeText, { color: colors.accent }]}>
                {ingredientCount} ingredient{ingredientCount !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : (
            <View style={[styles.noRecipeBadge, { backgroundColor: colors.border }]}>
              <Text style={[styles.noRecipeText, { color: colors.tabBarInactive }]}>
                No recipe
              </Text>
            </View>
          )}
        </View>
        {item.recipe_cost != null && hasRecipe && (
          <Text style={[styles.itemCost, { color: colors.tabBarInactive }]}>
            Cost: KES {formatKES(item.recipe_cost)}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.tabBarInactive} />
    </TouchableOpacity>
  );
}

// ── RecipesScreen ─────────────────────────────────────────

export default function RecipesScreen() {
  return (
    <MenuProvider>
      <InventoryProvider>
        <RecipesScreenContent />
      </InventoryProvider>
    </MenuProvider>
  );
}

function RecipesScreenContent() {
  const { colors } = useTheme();
  const { menuItems, menuCategories, loading, refreshMenu } = useMenu();
  const { permissions } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const canManageMenu = hasPermission(permissions, PERMISSIONS.POS_MANAGE_MENU);

  // Filter + group items by category
  const groupedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (menuItems ?? []).filter((item) => {
      if (!query) return true;
      return (
        item.name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      );
    });

    // Group by category
    const groups = {};
    filtered.forEach((item) => {
      const cat = item.category ?? "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    // Sort groups by category order, items by name
    return Object.entries(groups)
      .map(([key, items]) => ({
        key,
        name: menuCategories.find((c) => c.key === key)?.name ?? key,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItems, menuCategories, search]);

  const recipeCount = useMemo(
    () => (menuItems ?? []).filter((m) => m.is_recipe || (m.ingredients?.length ?? 0) > 0).length,
    [menuItems]
  );

  const handleEdit = useCallback((item) => {
    setSelectedItem(item);
    setShowEditor(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setSelectedItem(null);
  }, []);

  if (!canManageMenu) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Recipes</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.tabBarInactive} />
          <Text style={[styles.emptyText, { color: colors.tabBarInactive }]}>
            You don't have permission to manage recipes.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Recipes</Text>
          <Text style={[styles.headerSubtitle, { color: colors.tabBarInactive }]}>
            {recipeCount} of {(menuItems ?? []).length} items have recipes
          </Text>
        </View>
        <TouchableOpacity onPress={refreshMenu} style={styles.backBtn}>
          <Ionicons name="refresh-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.tabBarInactive} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search menu items..."
          placeholderTextColor={colors.tabBarInactive}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.tabBarInactive} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : groupedItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="nutrition-outline" size={48} color={colors.tabBarInactive} />
          <Text style={[styles.emptyText, { color: colors.tabBarInactive }]}>
            {search ? "No items match your search." : "No menu items yet. Add items in Menu Manager first."}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {groupedItems.map((group) => (
            <View key={group.key} style={styles.groupSection}>
              <Text style={[styles.groupTitle, { color: colors.tabBarInactive }]}>
                {group.name.toUpperCase()} ({group.items.length})
              </Text>
              <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {group.items.map((item, idx) => (
                  <RecipeItemRow
                    key={item.id}
                    item={item}
                    colors={colors}
                    onEdit={handleEdit}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Recipe Editor Sheet */}
      <RecipeEditorSheet
        visible={showEditor}
        item={selectedItem}
        onClose={handleCloseEditor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 2 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  scroll: { flex: 1 },

  groupSection: { marginBottom: 16 },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  groupCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  itemEmoji: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "600" },
  itemMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  itemPrice: { fontSize: 12, fontWeight: "600" },
  itemCost: { fontSize: 11, marginTop: 2 },

  recipeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  recipeBadgeText: { fontSize: 11, fontWeight: "600" },

  noRecipeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noRecipeText: { fontSize: 11, fontWeight: "500" },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
