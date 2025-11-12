import React, { useState } from 'react';
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
} from 'react-native';
import { Colors } from '../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useInventory } from '../context/InventoryContext';

export default function InventoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { inventory, deleteItem } = useInventory();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Butchery', 'Vegetables', 'Kitchen', 'Drinks', 'Housekeeping'];

  // ✅ Filter data based on category + search
  const filteredItems = inventory.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ✅ Handle delete using context
  const handleDelete = (item) => {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteItem(item.id),
      },
    ]);
  };

  // ✅ Navigate to Deduct Screen
  const handleDeduct = (item) => {
    router.push({
      pathname: '/deduct-item',
      params: { id: item.id, name: item.name, quantity: item.quantity },
    });
  };

  // ✅ Render each item card
  const renderItem = ({ item }) => {
    const lowStock = item.quantity < 10;
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
          {lowStock && <Text style={styles.lowStock}>Low Stock</Text>}
        </View>

        <Text style={[styles.itemDetail, { color: theme.text }]}>Quantity: {item.quantity}</Text>
        <Text style={[styles.itemDetail, { color: theme.text }]}>Category: {item.category}</Text>
        <Text style={[styles.itemUpdated, { color: theme.tabBarInactive }]}>
          Last Updated: {item.updated}
        </Text>

        {/* ✅ Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            onPress={() => handleDeduct(item)}
          >
            <Ionicons name="remove-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Deduct</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#D9534F' }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: theme.accent }]}>Inventory</Text>
        </View>

        {/* Search Bar */}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchBar,
            { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
          ]}
          placeholder="Search inventory..."
          placeholderTextColor={theme.tabBarInactive}
        />

        {/* Category Filter */}
        <View style={[styles.categoryContainer, { backgroundColor: theme.card }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category) => {
              const isSelected = category === selectedCategory;
              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: isSelected ? '#fff' : theme.text },
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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: theme.text, textAlign: 'center', marginTop: 20 }}>
              No items found.
            </Text>
          }
        />

        {/* Floating Add Button */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/add-item')}
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
  headerContainer: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
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
  categoryText: { fontSize: 14, fontWeight: '500' },
  listContainer: { paddingBottom: 100 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '600' },
  lowStock: { fontSize: 12, color: '#D9534F', fontWeight: 'bold' },
  itemDetail: { fontSize: 14, marginTop: 4 },
  itemUpdated: { fontSize: 12, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});
