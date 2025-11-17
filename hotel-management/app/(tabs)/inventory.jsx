import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Alert,
} from "react-native";
import { Colors } from "../theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useInventory } from "../context/InventoryContext";

export default function InventoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const { products, getProductTotal } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // 🔹 Auto-generate categories
  const categories = useMemo(() => {
    const unique = new Set(products.map((p) => p.category ?? ""));
    return ["All", ...unique];
  }, [products]);

  // 🔹 Build merged inventory list
  const inventoryList = useMemo(
    () =>
      products.map((item) => ({
        ...item,
        quantity: getProductTotal(item.id),
      })),
    [products, getProductTotal]
  );

  // 🔹 Filter by category ONLY
  const filteredItems = inventoryList.filter((item) => {
    const cat = (item.category ?? "").toLowerCase();
    const active = (selectedCategory ?? "").toLowerCase();

    const matchesCategory = active === "all" || cat === active;
    return matchesCategory;
  });

  // ➖ Deduct screen
  const handleDeduct = (item) => {
    if (item.quantity <= 0) {
      return Alert.alert("Out of Stock", `${item.name} has 0 quantity.`);
    }

    router.push({
      pathname: "/deduct-item",
      params: {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
      },
    });
  };

  const renderItem = ({ item }) => {
    const low = item.quantity < 10 && item.quantity > 0;
    const out = item.quantity === 0;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        onPress={() => handleDeduct(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.itemName, { color: theme.text }]}>
            {item.name}
          </Text>

          {low && <Text style={styles.lowStock}>Low Stock</Text>}
          {out && <Text style={styles.outStock}>Out of Stock</Text>}
        </View>

        <Text style={[styles.itemDetail, { color: theme.text }]}>
          Quantity: {item.quantity}
        </Text>

        <Text style={[styles.itemDetail, { color: theme.text }]}>
          Category: {item.category}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.accent }]}>Inventory</Text>

        {/* Search UI still exists but does NOT filter for now */}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Search (inactive)..."
          placeholderTextColor={theme.tabBarInactive}
        />

        {/* Category Filter */}
        <View
          style={[styles.categoryContainer, { backgroundColor: theme.card }]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category) => {
              const selected = category === selectedCategory;
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: selected ? theme.accent : theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: selected ? "#fff" : theme.text },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Inventory List */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text
              style={{
                color: theme.text,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              No items found.
            </Text>
          }
        />

        {/* Floating Add Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => router.push("/add-item")}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 15,
    fontSize: 14,
    marginBottom: 6,
  },
  categoryContainer: {
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryText: { fontSize: 14, fontWeight: "500" },
  listContainer: { paddingBottom: 100 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemName: { fontSize: 16, fontWeight: "600" },
  lowStock: { fontSize: 12, color: "#E67E22", fontWeight: "bold" },
  outStock: { fontSize: 12, color: "#D9534F", fontWeight: "bold" },
  itemDetail: { fontSize: 14, marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});
