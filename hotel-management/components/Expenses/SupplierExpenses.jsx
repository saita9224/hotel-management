// components/Expenses/SupplierExpenses.jsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { useExpenses } from "../../context/ExpensesContext";
import { useTheme } from "../../hooks/useTheme";
import SupplierPaymentModal from "./SupplierPaymentModal";

export default function SupplierExpenses() {
  const { expenses } = useExpenses();
  const { colors, fonts } = useTheme();

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  /* ---------------- GROUP BY SUPPLIER ---------------- */

  const suppliers = useMemo(() => {
    const map = {};

    expenses.forEach((e) => {
      const key = e.supplier_id || e.supplier_name || "Unknown";

      if (!map[key]) {
        map[key] = {
          supplier_id: e.supplier_id,
          supplier_name: e.supplier_name || "Unknown Supplier",
          expenses: [],
          total: 0,
          paid: 0,
          balance: 0,
        };
      }

      map[key].expenses.push(e);
      map[key].total += e.total_price;
      map[key].paid += e.amount_paid;
      map[key].balance += e.balance;
    });

    return Object.values(map);
  }, [expenses]);

  /* ---------------- SELECTED SUPPLIER DATA ---------------- */

  const currentSupplier = useMemo(() => {
    if (!selectedSupplier) return null;
    return (
      suppliers.find(
        (s) =>
          s.supplier_id === selectedSupplier ||
          s.supplier_name === selectedSupplier,
      ) || null
    );
  }, [selectedSupplier, suppliers]);

  // All expenses sorted oldest first
  const supplierExpenses = useMemo(() => {
    if (!currentSupplier) return [];
    return [...currentSupplier.expenses].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
  }, [currentSupplier]);

  // Only unpaid ones — passed to modal for cascade
  const unpaidExpenses = useMemo(() => {
    return supplierExpenses.filter((e) => !e.is_fully_paid);
  }, [supplierExpenses]);

  const hasOutstanding = unpaidExpenses.length > 0;

  /* ---------------- SUPPLIER CARD ---------------- */

  const renderSupplier = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.supplierCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() =>
        setSelectedSupplier(item.supplier_id || item.supplier_name)
      }
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.sans,
          fontWeight: "700",
          fontSize: 16,
        }}
      >
        {item.supplier_name}
      </Text>

      <View style={styles.summaryRow}>
        <Text style={{ color: colors.text }}>
          Total: KES {item.total.toFixed(2)}
        </Text>
        <Text style={{ color: colors.text }}>
          Paid: KES {item.paid.toFixed(2)}
        </Text>
      </View>

      <View style={[styles.balancePill, { backgroundColor: "#FF3B3020" }]}>
        <Text style={{ color: "#FF3B30", fontWeight: "700", fontSize: 13 }}>
          Balance: KES {item.balance.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  /* ---------------- EXPENSE ROW ---------------- */

  const renderExpense = ({ item }) => {
    const isNextToPay = unpaidExpenses[0]?.id === item.id;

    return (
      <View
        style={[
          styles.expenseRow,
          {
            borderBottomColor: colors.border,
            backgroundColor: isNextToPay ? colors.accent + "18" : "transparent",
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {item.item_name}
          </Text>
          <Text
            style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}
          >
            {new Date(item.created_at).toLocaleDateString()}
            {isNextToPay ? (
              <Text style={{ color: colors.accent }}> ← next to pay</Text>
            ) : null}
          </Text>
        </View>

        <Text
          style={{
            color: colors.tabBarInactive,
            width: 60,
            textAlign: "right",
          }}
        >
          ×{item.quantity}
        </Text>

        <Text style={{ color: colors.text, width: 90, textAlign: "right" }}>
          KES {item.total_price.toFixed(2)}
        </Text>

        <Text
          style={{
            width: 90,
            textAlign: "right",
            fontWeight: "700",
            color: item.is_fully_paid ? "#34C759" : "#FF3B30",
          }}
        >
          {item.is_fully_paid ? "✓ Paid" : `KES ${item.balance.toFixed(2)}`}
        </Text>
      </View>
    );
  };

  /* ---------------- UI ---------------- */

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ---- SUPPLIER LIST ---- */}
      {!selectedSupplier && (
        <>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontFamily: fonts.sans },
            ]}
          >
            Supplier Ledger
          </Text>
          <FlatList
            data={suppliers}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderSupplier}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.tabBarInactive,
                  textAlign: "center",
                  marginTop: 40,
                }}
              >
                No suppliers found
              </Text>
            }
          />
        </>
      )}

      {/* ---- SUPPLIER DETAIL ---- */}
      {selectedSupplier && currentSupplier && (
        <>
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedSupplier(null)}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              ← Back to suppliers
            </Text>
          </TouchableOpacity>

          {/* Supplier summary header */}
          <View
            style={[
              styles.supplierHeader,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}
              >
                {currentSupplier.supplier_name}
              </Text>
              <Text
                style={{
                  color: colors.tabBarInactive,
                  marginTop: 4,
                  fontSize: 13,
                }}
              >
                Total: KES {currentSupplier.total.toFixed(2)}
                {"   "}Paid: KES {currentSupplier.paid.toFixed(2)}
              </Text>
              <Text
                style={{ color: "#FF3B30", fontWeight: "700", marginTop: 4 }}
              >
                Outstanding: KES {currentSupplier.balance.toFixed(2)}
              </Text>
            </View>

            {/* Pay Balance CTA */}
            <TouchableOpacity
              style={[
                styles.paySupplierBtn,
                {
                  backgroundColor: hasOutstanding
                    ? colors.accent
                    : colors.border,
                },
              ]}
              onPress={() => {
                if (!hasOutstanding) {
                  Alert.alert(
                    "All Paid",
                    "This supplier has no outstanding balance.",
                  );
                  return;
                }
                setShowPayModal(true);
              }}
              disabled={!hasOutstanding}
            >
              <Text
                style={{
                  color: hasOutstanding ? "#fff" : colors.tabBarInactive,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Pay Balance
              </Text>
            </TouchableOpacity>
          </View>

          {/* Column headers */}
          <View
            style={[styles.colHeaders, { borderBottomColor: colors.border }]}
          >
            <Text
              style={{
                color: colors.tabBarInactive,
                flex: 1,
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              ITEM
            </Text>
            <Text
              style={{
                color: colors.tabBarInactive,
                width: 60,
                textAlign: "right",
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              QTY
            </Text>
            <Text
              style={{
                color: colors.tabBarInactive,
                width: 90,
                textAlign: "right",
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              TOTAL
            </Text>
            <Text
              style={{
                color: colors.tabBarInactive,
                width: 90,
                textAlign: "right",
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              BALANCE
            </Text>
          </View>

          <FlatList
            data={supplierExpenses}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderExpense}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.tabBarInactive,
                  textAlign: "center",
                  marginTop: 20,
                }}
              >
                No expenses found
              </Text>
            }
          />
        </>
      )}

      {/* ---- SUPPLIER PAYMENT MODAL (cascading) ---- */}
      {currentSupplier && (
        <SupplierPaymentModal
          visible={showPayModal}
          onClose={() => setShowPayModal(false)}
          supplierName={currentSupplier.supplier_name}
          unpaidExpenses={unpaidExpenses}
        />
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  supplierCard: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  summaryRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balancePill: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  backBtn: {
    marginBottom: 12,
  },
  supplierHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  paySupplierBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
  colHeaders: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  expenseRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: "center",
  },
});
