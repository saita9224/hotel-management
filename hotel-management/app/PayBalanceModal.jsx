// app/PayBalanceModal.jsx
import React, { useState, useMemo } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useColorScheme } from "react-native";
import { Colors } from "./theme/colors";
import { useExpenses } from "./context/ExpensesContext";

export default function PayBalanceModal({ visible, onClose, groupId }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { getGroupBalance, payBalance, getExpensesByGroup } = useExpenses();
  const [amount, setAmount] = useState("");

  const balance = useMemo(() => (groupId ? getGroupBalance(groupId) : 0), [groupId, visible]);

  const handlePay = () => {
    const val = Number(amount || 0);
    if (!groupId || val <= 0) return;
    if (val > balance) {
      // allow overpayment? we warn and clamp
      // For now warn and reject
      alert("Amount is greater than outstanding balance. Enter a valid amount.");
      return;
    }
    payBalance(groupId, val);
    setAmount("");
    onClose();
  };

  if (!groupId) return null;

  const groupEntries = getExpensesByGroup(groupId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>Pay Balance</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: theme.accent, fontWeight: "600" }}>Close</Text></TouchableOpacity>
          </View>

          <Text style={{ color: theme.text, marginBottom: 8 }}>Group: {groupId}</Text>
          <Text style={{ color: theme.text, marginBottom: 12 }}>Outstanding: KES {balance.toFixed(2)}</Text>

          <TextInput
            placeholder="Amount to pay"
            placeholderTextColor={theme.tabBarInactive}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          />

          <TouchableOpacity onPress={handlePay} style={[styles.payBtn, { backgroundColor: theme.accent }]}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Submit Payment</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 12 }}>
            <Text style={{ color: theme.text, fontWeight: "600", marginBottom: 6 }}>Group Entries</Text>
            {groupEntries.map((e) => (
              <View key={e.id} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: theme.text, opacity: 0.85 }}>{e.description}</Text>
                <Text style={{ color: theme.text, opacity: 0.85 }}>{e.total_amount ? `Ksh ${e.total_amount}` : `Paid ${e.paid}`}</Text>
              </View>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12 },
  payBtn: { padding: 12, borderRadius: 8, alignItems: "center" },
});
