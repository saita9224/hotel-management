// ExpensesScreen.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Text,
  useColorScheme,
  BackHandler,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../../theme/colors";
import { useExpenses } from "../../context/ExpensesContext";

import ExpenseTable from "../../components/Expenses/ExpenseTable";
import ExpenseForm from "../../components/Expenses/ExpenseForm";
import ExpensePaymentsModal from "../../components/Expenses/ExpensePaymentsModal";
import SupplierDebtSummary from "../../components/Expenses/SupplierDebtSummary";
import SupplierExpenses from "../../components/Expenses/SupplierExpenses";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82; // 82% of screen

export default function ExpensesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const { expenses } = useExpenses();

  const [activeTab, setActiveTab] = useState("table");
  const [showForm, setShowForm] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);
  const [showPayments, setShowPayments] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Animated value for sheet slide
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  /* ---------------- SHEET OPEN / CLOSE ---------------- */

  const openSheet = () => {
    setShowForm(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setShowForm(false));
  };

  /* ---------------- BACK HANDLER ---------------- */

  useEffect(() => {
    const onBackPress = () => {
      if (showForm) {
        closeSheet();
        return true;
      }
      if (showPayments) {
        setShowPayments(false);
        return true;
      }
      if (activeTab === "supplier") {
        setSelectedSupplier(null);
        setActiveTab("table");
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [showForm, showPayments, activeTab]);

  /* ---------------- PAY BALANCE ---------------- */

  const openPayments = (expenseId) => {
    setSelectedExpenseId(expenseId);
    setShowPayments(true);
  };

  /* ---------------- SUPPLIER VIEW ---------------- */

  const openSupplier = (supplierName) => {
    setSelectedSupplier(supplierName);
    setActiveTab("supplier");
  };

  const closeSupplier = () => {
    setSelectedSupplier(null);
    setActiveTab("table");
  };

  /* ---------------- RENDER CONTENT ---------------- */

  const renderContent = () => {
    if (activeTab === "table") {
      return (
        <ExpenseTable
          expenses={expenses}
          onPayBalance={openPayments}
          onSupplierPress={openSupplier}
        />
      );
    }
    if (activeTab === "summary") {
      return <SupplierDebtSummary />;
    }
    if (activeTab === "supplier") {
      return (
        <SupplierExpenses supplier={selectedSupplier} onClose={closeSupplier} />
      );
    }
    return null;
  };

  /* ---------------- TABS ---------------- */

  const Tab = ({ id, label }) => {
    const active = activeTab === id;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(id)}
        style={[
          styles.tab,
          { backgroundColor: active ? theme.tint : theme.card },
        ]}
      >
        <Text
          style={{ color: active ? "#fff" : theme.text, fontWeight: "600" }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  /* ---------------- RENDER ---------------- */

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* ---------------- TABS ---------------- */}
      <View style={styles.tabsRow}>
        <Tab id="table" label="Expenses" />
        <Tab id="summary" label="Supplier Debts" />
        <Tab id="supplier" label="Supplier Ledger" />
      </View>

      {/* ---------------- CONTENT ---------------- */}
      <FlatList
        data={[{ key: "content" }]}
        keyExtractor={(item) => item.key}
        renderItem={() => <View style={{ flex: 1 }}>{renderContent()}</View>}
        showsVerticalScrollIndicator={false}
      />

      {/* ---------------- FAB ---------------- */}
      {activeTab === "table" && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={openSheet}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ---------------- BOTTOM SHEET ---------------- */}
      {showForm && (
        <>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropAnim }]}
            />
          </TouchableWithoutFeedback>

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: theme.background },
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.dragHandleRow}>
              <View
                style={[styles.dragHandle, { backgroundColor: theme.border }]}
              />
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

      {/* ---------------- PAYMENTS MODAL ---------------- */}
      <ExpensePaymentsModal
        visible={showPayments}
        expenseId={selectedExpenseId}
        onClose={() => setShowPayments(false)}
      />
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabsRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
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

  // Bottom sheet backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },

  // Bottom sheet panel
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 11,
    elevation: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Drag handle
  dragHandleRow: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
