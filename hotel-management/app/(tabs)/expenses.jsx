import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { Colors } from "../theme/colors";
import { useExpenses } from "../context/ExpensesContext";
import { router } from "expo-router";
import PayBalanceModal from "../PayBalanceModal";

export default function ExpensesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { expenses, getTodaySummary } = useExpenses();

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { totalExpense, totalPaid, totalOutstanding } = getTodaySummary();

  // Build list of groups (one row per group with computed balance)
  const groupsMap = expenses.reduce((map, e) => {
    map[e.group_id] = map[e.group_id] || {
      group_id: e.group_id,
      description: "",
      supplier: "",
      total: 0,
      paid: 0,
      quantity: 0,
      lastDate: e.date,
    };

    map[e.group_id].total += Number(e.total_amount || 0);
    map[e.group_id].paid += Number(e.paid || 0);
    map[e.group_id].quantity += Number(e.quantity || 0);
    map[e.group_id].lastDate = e.date;
    map[e.group_id].supplier = e.supplier || map[e.group_id].supplier || "";

    if (!map[e.group_id].description || map[e.group_id].description === "Expense") {
      map[e.group_id].description = e.description;
    }

    return map;
  }, {});

  const groups = Object.values(groupsMap);

  const handleOpenPay = (group_id) => {
    setSelectedGroup(group_id);
    setPayModalVisible(true);
  };

  const renderGroup = ({ item }) => {
    const balance = Math.max(item.total - item.paid, 0);
    const paidInFull = balance <= 0;

    return (
      <View
        style={[
          styles.groupCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text
            style={[styles.groupTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {item.description || item.group_id}
          </Text>
          <Text style={{ color: theme.accent, fontWeight: "600" }}>
            {item.group_id}
          </Text>
        </View>

        <Text style={{ color: theme.text, opacity: 0.7 }}>
          Supplier: {item.supplier || "N/A"}
        </Text>
        <Text style={{ color: theme.text, opacity: 0.6, fontSize: 12 }}>
          Last Updated: {item.lastDate}
        </Text>

        <Text style={{ color: theme.text, opacity: 0.8, marginTop: 4 }}>
          Total: KES {item.total.toFixed(2)}
        </Text>
        <Text style={{ color: theme.text, opacity: 0.8 }}>
          Quantity: {item.quantity}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: theme.text, opacity: 0.7 }}>
            Status: {paidInFull ? "Paid" : `Balance KES ${balance.toFixed(2)}`}
          </Text>

          {!paidInFull ? (
            <TouchableOpacity
              onPress={() => handleOpenPay(item.group_id)}
              style={[styles.payBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                Pay Balance
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: theme.accent, fontWeight: "600" }}>
              Completed
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text style={[styles.header, { color: theme.text }]}>Expenses</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View
          style={[
            styles.smallCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.smallLabel, { color: theme.text }]}>
            Today Expense
          </Text>
          <Text style={[styles.smallValue, { color: theme.text }]}>
            KES {totalExpense.toFixed(2)}
          </Text>
        </View>
        <View
          style={[
            styles.smallCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.smallLabel, { color: theme.text }]}>Paid</Text>
          <Text style={[styles.smallValue, { color: theme.text }]}>
            KES {totalPaid.toFixed(2)}
          </Text>
        </View>
        <View
          style={[
            styles.smallCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.smallLabel, { color: theme.text }]}>
            Outstanding
          </Text>
          <Text style={[styles.smallValue, { color: theme.text }]}>
            KES {totalOutstanding.toFixed(2)}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Expense Groups
      </Text>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.group_id}
        renderItem={renderGroup}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.text,
              opacity: 0.6,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            No expenses yet. Use + to add an expense.
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* FAB to add expense */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => router.push("/add-expenses")}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Pay Balance Modal */}
      <PayBalanceModal
        visible={payModalVisible}
        onClose={() => setPayModalVisible(false)}
        groupId={selectedGroup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  smallCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  smallLabel: { fontSize: 12, opacity: 0.8 },
  smallValue: { fontSize: 16, fontWeight: "700", marginTop: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 8,
  },
  groupCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  groupTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  payBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});
