// app/(tabs)/expenses.jsx

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, StyleSheet, TouchableOpacity, FlatList, Text,
  BackHandler, Animated, Dimensions, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";
import { useExpenses } from "../../context/ExpensesContext";

import ExpenseTable from "../../components/Expenses/ExpenseTable";
import ExpenseForm from "../../components/Expenses/ExpenseForm";
import ExpensePaymentsModal from "../../components/Expenses/ExpensePaymentsModal";
import SupplierDebtSummary from "../../components/Expenses/SupplierDebtSummary";
import SupplierExpenses from "../../components/Expenses/SupplierExpenses";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const {
    expenses,
    getPaymentsByDate,
    getTodayTotal,
  } = useExpenses();

  const [activeTab, setActiveTab] = useState("table");
  const [showForm, setShowForm] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [showPayments, setShowPayments] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

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
    const onBackPress = () => {
      if (showForm) { closeSheet(); return true; }
      if (showPayments) { setShowPayments(false); return true; }
      if (activeTab === "supplier") { setSelectedSupplier(null); setActiveTab("table"); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [showForm, showPayments, activeTab]);

  const openPayments = (expenseId) => {
    setSelectedExpenseId(expenseId);
    setShowPayments(true);
  };

  const openSupplier = (supplierName) => {
    setSelectedSupplier(supplierName);
    setActiveTab("supplier");
  };

  const closeSupplier = () => {
    setSelectedSupplier(null);
    setActiveTab("table");
  };

  // -------------------------------------------------------
  // DAILY PAYMENTS VIEW
  // Groups payments by paid_at — balance payments appear
  // on the day they were actually paid, not the purchase day
  // -------------------------------------------------------

  const renderDailyPayments = () => (
    <FlatList
      data={getPaymentsByDate}
      keyExtractor={(item) => item.dateString}
      contentContainerStyle={{ paddingBottom: 120 }}
      ListEmptyComponent={
        <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
          No payments recorded yet
        </Text>
      }
      ListHeaderComponent={
        <View style={[styles.todayBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>
            Today's Total Paid Out
          </Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 2 }}>
            KES {getTodayTotal.toFixed(2)}
          </Text>
        </View>
      }
      renderItem={({ item: dayGroup }) => {
        const isToday = dayGroup.dateString === new Date().toDateString();
        const label = isToday
          ? "Today"
          : dayGroup.date.toLocaleDateString("en-KE", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            });

        return (
          <View style={{ marginBottom: 16 }}>
            {/* Day header */}
            <View style={styles.dayHeader}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                {label}
              </Text>
              <Text style={{ color: "#FF453A", fontWeight: "700" }}>
                KES {dayGroup.total.toFixed(2)}
              </Text>
            </View>

            {/* Payments in this day */}
            {dayGroup.payments.map((p) => (
              <View
                key={p.id}
                style={[styles.paymentRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {p.item_name}
                  </Text>
                  {p.supplier_name ? (
                    <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                      {p.supplier_name}
                    </Text>
                  ) : null}
                  <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 1 }}>
                    {"of KES " + p.expense_total.toFixed(2) + " total"}
                  </Text>
                </View>
                <Text style={{ color: "#FF453A", fontWeight: "700", fontSize: 15 }}>
                  {"KES " + p.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        );
      }}
    />
  );

  const renderContent = () => {
    if (activeTab === "table") return (
      <ExpenseTable
        expenses={expenses}
        onPayBalance={openPayments}
        onSupplierPress={openSupplier}
      />
    );
    if (activeTab === "daily") return renderDailyPayments();
    if (activeTab === "summary") return <SupplierDebtSummary />;
    if (activeTab === "supplier") return (
      <SupplierExpenses supplier={selectedSupplier} onClose={closeSupplier} />
    );
    return null;
  };

  const Tab = ({ id, label }) => {
    const active = activeTab === id;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(id)}
        style={[styles.tab, { backgroundColor: active ? colors.accent : colors.card }]}
      >
        <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.tabsRow}
      >
        <Tab id="table" label="Expenses" />
        <Tab id="daily" label="Daily Payments" />
        <Tab id="summary" label="Supplier Debts" />
        <Tab id="supplier" label="Supplier Ledger" />
      </ScrollView>

      <FlatList
        data={[{ key: "content" }]}
        keyExtractor={(item) => item.key}
        renderItem={() => <View style={{ flex: 1 }}>{renderContent()}</View>}
        showsVerticalScrollIndicator={false}
      />

      {activeTab === "table" && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={openSheet}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {showForm && (
        <>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.dragHandleRow}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                contentContainerStyle={{ paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  tabsRow: { flexDirection: "row", marginBottom: 12, gap: 8, paddingRight: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  fab: {
    position: "absolute", bottom: 10, right: 10,
    width: 55, height: 55, borderRadius: 28,
    justifyContent: "center", alignItems: "center", elevation: 5,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)", zIndex: 10,
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    zIndex: 11, elevation: 16, paddingHorizontal: 16, paddingBottom: 16,
  },
  dragHandleRow: { alignItems: "center", paddingVertical: 10 },
  dragHandle: { width: 40, height: 4, borderRadius: 2 },
  todayBanner: {
    padding: 16, borderRadius: 12, borderWidth: 1,
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8, paddingHorizontal: 2,
  },
  paymentRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6,
  },
});