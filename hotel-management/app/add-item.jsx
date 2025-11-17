import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from './theme/colors';
import { useInventory } from './context/InventoryContext';

export default function AddItem() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const { addProduct, addStock } = useInventory();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSave = () => {
    if (!name.trim() || !category.trim() || !quantity.trim()) {
      return Alert.alert("Missing Fields", "Please fill all fields before saving.");
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return Alert.alert("Invalid Quantity", "Quantity must be a positive number.");
    }

    const productId = Date.now().toString();

    // Normalize text to avoid crashes in filter
    const cleanName = name.trim();
    const cleanCategory = category.trim().toLowerCase();

    addProduct({
      id: productId,
      name: cleanName,
      category: cleanCategory
    });

    addStock(productId, qty);

    Alert.alert("Success", `${cleanName} added to inventory!`);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.accent }]}>Add New Item</Text>

      <Text style={[styles.label, { color: theme.text }]}>Item Name</Text>
      <TextInput
        placeholder="e.g. Sugar, Rice, Flour"
        placeholderTextColor={theme.tabBarInactive}
        value={name}
        onChangeText={setName}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Category</Text>
      <TextInput
        placeholder="e.g. dry goods, vegetables"
        placeholderTextColor={theme.tabBarInactive}
        value={category}
        onChangeText={setCategory}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
      <TextInput
        placeholder="e.g. 20"
        placeholderTextColor={theme.tabBarInactive}
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <TouchableOpacity
        onPress={handleSave}
        style={[styles.saveButton, { backgroundColor: theme.accent }]}
      >
        <Text style={styles.saveText}>Save Item</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
    borderColor: "#aaa"
  },
  saveButton: {
    marginTop: 10,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center'
  },
  saveText: { color: "#fff", fontWeight: "bold", fontSize: 16 }
});
