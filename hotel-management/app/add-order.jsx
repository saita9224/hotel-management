import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from './theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from './context/OrdersContext';
import uuid from 'react-native-uuid';

export default function AddOrder() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { addOrder } = useOrders();

  const [tableName, setTableName] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [items, setItems] = useState([]);

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handleAddItem = () => {
    if (!itemName || !quantity || !price) {
      Alert.alert('Missing Fields', 'Please fill all item details.');
      return;
    }

    const newItem = {
      id: uuid.v4(),
      name: itemName,
      quantity: Number(quantity),
      price: Number(price),
    };

    setItems((prev) => [...prev, newItem]);
    setItemName('');
    setQuantity('');
    setPrice('');
  };

  const handleSaveOrder = () => {
    if (!tableName || items.length === 0) {
      Alert.alert('Incomplete Order', 'Please add a table name and at least one item.');
      return;
    }

    const newOrder = {
      id: uuid.v4(),
      name: `Table ${tableName}`,
      items,
      total,
      completed: false,
      date: new Date().toLocaleDateString(),
    };

    addOrder(newOrder);
    Alert.alert('Success', 'Order added successfully!');
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.accent }]}>Add New Order</Text>

      {/* Table Name */}
      <Text style={[styles.label, { color: theme.text }]}>Table Name / Number</Text>
      <TextInput
        placeholder="Enter table number (e.g., Table 5)"
        placeholderTextColor={colorScheme === 'dark' ? '#bbb' : '#777'}
        value={tableName}
        onChangeText={setTableName}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      {/* Add Item Section */}
      <View style={styles.itemSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Add Items</Text>

        <View style={styles.itemRow}>
          <TextInput
            placeholder="Item name"
            placeholderTextColor={colorScheme === 'dark' ? '#bbb' : '#777'}
            value={itemName}
            onChangeText={setItemName}
            style={[
              styles.smallInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />
          <TextInput
            placeholder="Qty"
            placeholderTextColor={colorScheme === 'dark' ? '#bbb' : '#777'}
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
            style={[
              styles.smallInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />
          <TextInput
            placeholder="Price"
            placeholderTextColor={colorScheme === 'dark' ? '#bbb' : '#777'}
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
            style={[
              styles.smallInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.accent }]}
            onPress={handleAddItem}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.itemCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.itemDetail, { color: theme.text }]}>
              {item.quantity} × {item.price} = {item.quantity * item.price}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: theme.text, opacity: 0.5, textAlign: 'center', marginTop: 10 }}>
            No items added yet.
          </Text>
        }
      />

      {/* Total and Save Button */}
      <View style={styles.footer}>
        <Text style={[styles.total, { color: theme.text }]}>
          Total: KES {total.toFixed(2)}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.accent }]}
          onPress={handleSaveOrder}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  itemSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  addBtn: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
  },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemDetail: { fontSize: 13, opacity: 0.8 },
  footer: { marginTop: 'auto', marginBottom: 10 },
  total: { fontSize: 18, fontWeight: '700', textAlign: 'right', marginBottom: 10 },
  saveButton: { borderRadius: 10, padding: 14, alignItems: 'center' },
});
