// components/POS/ReceiptDetailSheet.jsx

import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";

const STATUS_COLORS = {
  OPEN:     "#FF9F0A",
  PAID:     "#30D158",
  CREDIT:   "#0A84FF",
  REFUNDED: "#FF453A",
};

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ReceiptDetailSheet({ visible, receipt, onClose }) {
  const { colors } = useTheme();

  if (!receipt) return null;

  const statusColor = STATUS_COLORS[receipt.status] ?? colors.tabBarInactive;
  const allItems = receipt.orders?.flatMap((o) => o.items ?? []) ?? [];
  const payments = receipt.payments ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>

          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.receiptNumber, { color: colors.text }]}>
                {receipt.receipt_number}
              </Text>
              <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 2 }}>
                {new Date(receipt.created_at).toLocaleString("en-KE", {
                  hour: "2-digit", minute: "2-digit",
                  day: "numeric", month: "short", year: "numeric",
                })}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                <Text style={{ color: statusColor, fontWeight: "700", fontSize: 12 }}>
                  {receipt.status}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* Items */}
            <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>ITEMS</Text>
            {allItems.map((item) => (
              <View
                key={item.id}
                style={[styles.itemRow, { borderBottomColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                    {item.product_name}
                  </Text>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                    {`${item.quantity} × KES ${formatKES(item.final_price)}`}
                    {item.price_overridden ? "  •  Price override" : ""}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                  KES {formatKES(item.line_total)}
                </Text>
              </View>
            ))}

            {/* Totals */}
            <View style={[styles.totalsBox, { borderColor: colors.border }]}>
              <View style={styles.totalRow}>
                <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Subtotal</Text>
                <Text style={{ color: colors.text }}>KES {formatKES(receipt.subtotal)}</Text>
              </View>
              {receipt.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Discount</Text>
                  <Text style={{ color: "#FF453A" }}>- KES {formatKES(receipt.discount)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>Total</Text>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                  KES {formatKES(receipt.total)}
                </Text>
              </View>
              {receipt.status === "OPEN" && (
                <View style={styles.totalRow}>
                  <Text style={{ color: "#FF9F0A", fontWeight: "600" }}>Balance Due</Text>
                  <Text style={{ color: "#FF9F0A", fontWeight: "700" }}>
                    KES {formatKES(receipt.balance)}
                  </Text>
                </View>
              )}
            </View>

            {/* Payments */}
            {payments.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>PAYMENTS</Text>
                {payments.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.itemRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "600" }}>{p.method}</Text>
                      <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                        {new Date(p.created_at).toLocaleString("en-KE", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text style={{ color: "#30D158", fontWeight: "700" }}>
                      KES {formatKES(p.amount)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Credit info */}
            {receipt.credit && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>CREDIT</Text>
                <View style={[styles.creditBox, { backgroundColor: "#0A84FF10", borderColor: "#0A84FF30" }]}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {receipt.credit.customer_name}
                  </Text>
                  {receipt.credit.customer_phone ? (
                    <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 4 }}>
                      {receipt.credit.customer_phone}
                    </Text>
                  ) : null}
                  <Text style={{ color: "#0A84FF", marginTop: 4, fontSize: 13 }}>
                    Due: {receipt.credit.due_date}
                  </Text>
                  <Text style={{ color: receipt.credit.is_settled ? "#30D158" : "#FF453A", fontWeight: "600", marginTop: 4 }}>
                    {receipt.credit.is_settled ? "✓ Settled" : "Unsettled"}
                  </Text>
                </View>
              </>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, maxHeight: "90%" },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  receiptNumber: { fontSize: 18, fontWeight: "700" },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  totalsBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 16, gap: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  creditBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 8 },
});