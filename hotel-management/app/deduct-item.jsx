import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from './theme/colors'; // note: same level as inventory.jsx

export default function DeductItem() {
  const router = useRouter();
  const { id, name, quantity } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [usedQuantity, setUsedQuantity] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    console.log('Deducting:', { id, name, usedQuantity, reason });
    // TODO: connect to DB later
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.accent }]}>Deduct Stock</Text>

      <Text style={[styles.label, { color: theme.text }]}>Item</Text>
      <TextInput
        value={name}
        editable={false}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Current Quantity</Text>
      <TextInput
        value={quantity}
        editable={false}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Used Quantity</Text>
      <TextInput
        placeholder="Enter used quantity"
        placeholderTextColor={theme.tabBarInactive}
        keyboardType="numeric"
        value={usedQuantity}
        onChangeText={setUsedQuantity}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.text }]}>Reason</Text>
      <TextInput
        placeholder="e.g. Kitchen use, Customer meal..."
        placeholderTextColor={theme.tabBarInactive}
        value={reason}
        onChangeText={setReason}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.btn, { backgroundColor: theme.accent }]}
      >
        <Text style={styles.btnText}>Save</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, marginTop: 10, marginBottom: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    fontSize: 14,
  },
  btn: {
    marginTop: 25,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
