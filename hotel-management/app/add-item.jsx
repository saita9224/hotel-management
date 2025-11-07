import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from './theme/colors';


export default function AddItem() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSave = () => {
    console.log('Saving:', { name, category, quantity });
    router.back(); // Go back to inventory after saving
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.accent }]}>Add New Item</Text>

      {/* Item Name */}
      <Text style={[styles.label, { color: theme.text }]}>Item Name</Text>
      <TextInput
        placeholder="Enter item name"
        placeholderTextColor={colorScheme === 'dark' ? '#bbb' : '#777'}
        value={name}
        onChangeText={setName}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      {/* Category */}
      <Text style={[styles.label, { color: theme.text }]}>Category</Text>
      <TextInput
        placeholder="Enter category"
        placeholderTextColor={colorScheme === 'dark' ? '#bbb' : '#777'}
        value={category}
        onChangeText={setCategory}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      {/* Quantity */}
      <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
      <TextInput
        placeholder="Enter quantity (e.g., 10 kg)"
        placeholderTextColor={colorScheme === 'dark' ? '#bbb' : '#777'}
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.accent }]}
        onPress={handleSave}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save Item</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  saveButton: {
    marginTop: 10,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
});
