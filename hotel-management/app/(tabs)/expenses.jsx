// app/(tabs)/expenses.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, StyleSheet, TouchableOpacity, Text,
  BackHandler, Animated, Dimensions, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "expo-router";

import { useTheme } from "../../hooks/useTheme";  // 👈 replaced useColorScheme + Colors
import { useExpenses } from "../../context/ExpensesContext";

import ExpenseTable from "../../components/Expenses/ExpenseTable";
import ExpenseForm from "../../components/Expenses/ExpenseForm";
import ExpensePaymentsModal from "../../components/Expenses/ExpensePaymentsModal";
import SupplierDebtSummary from "../../components/Expenses/SupplierDebtSummary";
import SupplierExpenses from "../../components/Expenses/SupplierExpenses";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

const TABS = [
  { key: "table",    label: "Expenses"        },
  { key: "summary",  label: "Supplier Debts"  },
  { key: "supplier", label: "Supplier Ledger" },
];

function HeaderToggle({ activeTab, onPress, colors }) {
  return (
    <View style={[toggle.wrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {TABS.map((t) => {
        const active = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[toggle.btn, active && { backgroundColor: colors.accent }]}
            onPress={() => onPress(t.key)}
          >
            <Text style={{
              color:      active ? "#fff" : colors.tabBarInactive,
              fontWeight: "600",
              fontSize:   14,
            }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const toggle = StyleSheet.create({
  wrapper: { flexDirection: "row", borderRadius: 8, borderWidth: 1, padding: 3, gap: 3 },
  btn:     { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignItems: "center", justifyContent: "center" },
});

export default function ExpensesScreen() {
  const { colors } = useTheme();  // 👈 single source of truth
  const { expenses, loadExpenses, loadSuppliers } = useExpenses();
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState("table");
  const [showForm, setShowForm] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [showPayments, setShowPayments] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const focusRefreshRef = useRef({ loadExpenses, loadSuppliers });

  focusRefreshRef.current = { loadExpenses, loadSuppliers };

  useFocusEffect(
    useCallback(() => {
      focusRefreshRef.current.loadExpenses();
      focusRefreshRef.current.loadSuppliers();
    }, [])
  );

  const openSheet = () => {
    setShowForm(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setShowForm(false));
  };

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderToggle activeTab={activeTab} onPress={setActiveTab} colors={colors} />
      ),
      headerStyle: { backgroundColor: colors.background, height: 58 },
    });
  }, [activeTab, colors, navigation]);

  useEffect(() => {
    const onBackPress = () => {
      if (showForm) { closeSheet(); return true; }
      if (showPayments) { setShowPayments(false); return true; }
      if (activeTab === "supplier") { setSelectedSupplier(null); setActiveTab("table"); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [showForm, showPayments, activeTab]);

  const openPayments = (expenseId) => { setSelectedExpenseId(expenseId); setShowPayments(true); };
  const openSupplier = (supplierName) => { setSelectedSupplier(supplierName); setActiveTab("supplier"); };
  const closeSupplier = () => { setSelectedSupplier(null); setActiveTab("table"); };

  const renderContent = () => {
    if (activeTab === "table") return <ExpenseTable expenses={expenses} onPayBalance={openPayments} onSupplierPress={openSupplier} />;
    if (activeTab === "summary") return <SupplierDebtSummary />;
    if (activeTab === "supplier") return <SupplierExpenses supplier={selectedSupplier} onClose={closeSupplier} />;
    return null;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={{ flex: 1 }}>{renderContent()}</View>
      </SafeAreaView>

      {activeTab === "table" && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.accent }]} onPress={openSheet}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {showForm && (
        <>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.dragHandleRow}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <ExpenseForm onClose={closeSheet} />
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </>
      )}

      <ExpensePaymentsModal
        visible={showPayments}
        expenseId={selectedExpenseId}
        onClose={() => setShowPayments(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 16 },
  fab: { position: "absolute", bottom: 24, right: 16, width: 55, height: 55, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 5, zIndex: 5 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 10 },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT, borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 11, elevation: 16, paddingHorizontal: 16, paddingBottom: 16 },
  dragHandleRow: { alignItems: "center", paddingVertical: 10 },
  dragHandle: { width: 40, height: 4, borderRadius: 2 },
});
