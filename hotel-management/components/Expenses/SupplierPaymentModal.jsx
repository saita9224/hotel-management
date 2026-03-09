// components/Expenses/SupplierPaymentModal.jsx

import React, { useState, useMemo } from "react";
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  FlatList, Alert, ActivityIndicator,
} from "react-native";

import { useExpenses } from "../../context/ExpensesContext";
import { useTheme } from "../../hooks/useTheme";  // 👈 removed fonts
import { payBalanceService } from "../../services/expenseService";

export default function SupplierPaymentModal({ visible, onClose, supplierName, unpaidExpenses }) {
  const { loadExpenses } = useExpenses();
  const { colors } = useTheme();  // 👈 removed fonts

  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalOutstanding = useMemo(() =>
    unpaidExpenses.reduce((sum, e) => sum + Number(e.balance), 0),
    [unpaidExpenses]
  );

  const splitPreview = useMemo(() => {
    let remaining = Number(amount || 0);
    if (remaining <= 0) return [];
    const splits = [];
    for (const expense of unpaidExpenses) {
      if (remaining <= 0) break;
      const expenseBalance = Number(expense.balance);
      const toPay = Math.min(remaining, expenseBalance);
      splits.push({ id: expense.id, item_name: expense.item_name, balance: expenseBalance, toPay: parseFloat(toPay.toFixed(2)), created_at: expense.created_at });
      remaining = parseFloat((remaining - toPay).toFixed(2));
    }
    return splits;
  }, [amount, unpaidExpenses]);

  const handleClose = () => { setAmount(""); onClose(); };

  const handleSubmit = async () => {
    const value = Number(amount || 0);
    if (value <= 0) return Alert.alert("Invalid Amount", "Enter an amount greater than zero.");
    if (value > totalOutstanding) return Alert.alert("Exceeds Balance", `Maximum payable is KES ${totalOutstanding.toFixed(2)}.`);

    try {
      setSubmitting(true);
      for (const split of splitPreview) {
        if (split.toPay > 0) await payBalanceService(split.id, split.toPay);
      }
      await loadExpenses();
      handleClose();
    } catch (err) {
      Alert.alert("Payment Failed", err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Pay Supplier</Text>  {/* 👈 removed fontFamily */}
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ color: colors.accent, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{supplierName}</Text>
            <Text style={{ color: colors.tabBarInactive, marginTop: 4 }}>
              {unpaidExpenses.length} unpaid {unpaidExpenses.length === 1 ? "expense" : "expenses"}
            </Text>
            <Text style={{ color: "#FF453A", fontWeight: "700", marginTop: 4 }}>
              Total Outstanding: KES {totalOutstanding.toFixed(2)}
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.tabBarInactive }]}>Amount to Pay</Text>
          <TextInput
            keyboardType="numeric"
            placeholder={`Max KES ${totalOutstanding.toFixed(2)}`}
            placeholderTextColor={colors.tabBarInactive}
            value={amount}
            onChangeText={setAmount}
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
            editable={!submitting}
          />

          {splitPreview.length > 0 && (
            <>
              <Text style={[styles.label, { color: colors.tabBarInactive, marginTop: 14 }]}>Payment breakdown</Text>
              <FlatList
                data={splitPreview}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={[styles.splitRow, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "600" }}>{item.item_name}</Text>
                      <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
                        {new Date(item.created_at).toLocaleDateString()}{"  "}Balance: KES {item.balance.toFixed(2)}
                      </Text>
                    </View>
                    <Text style={{ color: colors.accent, fontWeight: "700" }}>KES {item.toPay.toFixed(2)}</Text>
                  </View>
                )}
              />
              {(() => {
                const leftover = parseFloat((Number(amount) - splitPreview.reduce((s, x) => s + x.toPay, 0)).toFixed(2));
                return leftover > 0 ? (
                  <Text style={{ color: "#FF453A", marginTop: 8, fontSize: 13 }}>
                    ⚠ KES {leftover.toFixed(2)} exceeds total outstanding
                  </Text>
                ) : null;
              })()}
            </>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: submitting ? colors.border : colors.accent }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Confirm Payment</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  summaryBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  splitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  submitBtn: { marginTop: 20, padding: 14, borderRadius: 10, alignItems: "center" },
});