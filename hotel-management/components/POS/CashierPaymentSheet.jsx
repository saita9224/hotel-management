// components/POS/CashierPaymentSheet.jsx

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";
import { usePOS } from "../../context/POSContext";

const STATUS_COLORS = {
  DRAFT:    "#8E8E93",
  PENDING:  "#FF9F0A",
  OPEN:     "#0A84FF",
  PAID:     "#30D158",
  CREDIT:   "#BF5AF2",
  REFUNDED: "#FF453A",
};

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const METHODS = ["CASH", "MPESA", "CARD"];

// ── SECTION LABEL ─────────────────────────────────────────

function SectionLabel({ label, colors }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>
      {label}
    </Text>
  );
}

// ── PAYMENT TAB ───────────────────────────────────────────

function PaymentTab({ receipt, onDone, colors }) {
  const { acceptPayment } = usePOS();
  const [method, setMethod]   = useState("CASH");
  const [amount, setAmount]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const balance = Number(receipt?.balance ?? receipt?.total ?? 0);

  const handlePay = async () => {
    const value = Number(amount || 0);
    if (value <= 0) return Alert.alert("Invalid", "Enter a valid amount.");
    if (value > balance + 0.001)
      return Alert.alert("Invalid", "Amount exceeds remaining balance.");

    try {
      setSubmitting(true);
      await acceptPayment({
        receipt_id: receipt.id,
        amount: value,
        method,
      });
      if (value >= balance - 0.001) {
        onDone("paid");
      } else {
        Alert.alert(
          "Partial Payment Recorded",
          `KES ${formatKES(value)} received. Remaining: KES ${formatKES(balance - value)}.`
        );
        setAmount("");
      }
    } catch (err) {
      Alert.alert("Error", err?.message || "Payment failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Balance due */}
      <View style={[styles.balanceBox, { backgroundColor: "#FF9F0A12", borderColor: "#FF9F0A30" }]}>
        <Text style={{ color: "#FF9F0A", fontSize: 13 }}>Balance Due</Text>
        <Text style={{ color: "#FF9F0A", fontWeight: "700", fontSize: 28, marginTop: 4 }}>
          KES {formatKES(balance)}
        </Text>
      </View>

      {/* Method selector */}
      <SectionLabel label="PAYMENT METHOD" colors={colors} />
      <View style={styles.methodRow}>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.methodBtn,
              {
                borderColor: method === m ? colors.accent : colors.border,
                backgroundColor: method === m ? colors.accent + "18" : colors.background,
              },
            ]}
            onPress={() => setMethod(m)}
          >
            <Ionicons
              name={
                m === "CASH"  ? "cash-outline"  :
                m === "MPESA" ? "phone-portrait-outline" :
                                "card-outline"
              }
              size={18}
              color={method === m ? colors.accent : colors.tabBarInactive}
            />
            <Text style={{
              color: method === m ? colors.accent : colors.tabBarInactive,
              fontWeight: "600",
              fontSize: 13,
              marginTop: 4,
            }}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount */}
      <SectionLabel label="AMOUNT (KES)" colors={colors} />
      <TextInput
        style={[styles.input, {
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.background,
        }]}
        placeholder={formatKES(balance)}
        placeholderTextColor={colors.tabBarInactive}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Quick-fill full amount */}
      <TouchableOpacity
        style={styles.quickFill}
        onPress={() => setAmount(String(balance))}
      >
        <Text style={{ color: colors.accent, fontSize: 13 }}>
          Fill full amount  KES {formatKES(balance)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, {
          backgroundColor: submitting ? colors.border : "#30D158",
        }]}
        onPress={handlePay}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Record Payment
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

// ── CREDIT TAB ────────────────────────────────────────────

function CreditTab({ receipt, onDone, colors }) {
  const { createCredit } = usePOS();
  const [customerName,  setCustomerName]  = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dueDate,       setDueDate]       = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  const handleCredit = async () => {
    if (!customerName.trim())
      return Alert.alert("Required", "Customer name is required.");
    if (!dueDate.trim())
      return Alert.alert("Required", "Due date is required (YYYY-MM-DD).");

    // Basic date format check
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()))
      return Alert.alert("Invalid", "Date must be in YYYY-MM-DD format.");

    try {
      setSubmitting(true);
      await createCredit({
        receipt_id:     receipt.id,
        customer_name:  customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        due_date:       dueDate.trim(),
      });
      onDone("credit");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create credit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <View style={[styles.balanceBox, { backgroundColor: "#BF5AF212", borderColor: "#BF5AF230" }]}>
        <Text style={{ color: "#BF5AF2", fontSize: 13 }}>Credit Amount</Text>
        <Text style={{ color: "#BF5AF2", fontWeight: "700", fontSize: 28, marginTop: 4 }}>
          KES {formatKES(receipt?.total ?? 0)}
        </Text>
      </View>

      <SectionLabel label="CUSTOMER NAME" colors={colors} />
      <TextInput
        style={[styles.input, {
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.background,
        }]}
        placeholder="Full name"
        placeholderTextColor={colors.tabBarInactive}
        value={customerName}
        onChangeText={setCustomerName}
      />

      <SectionLabel label="PHONE (OPTIONAL)" colors={colors} />
      <TextInput
        style={[styles.input, {
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.background,
        }]}
        placeholder="07XX XXX XXX"
        placeholderTextColor={colors.tabBarInactive}
        keyboardType="phone-pad"
        value={customerPhone}
        onChangeText={setCustomerPhone}
      />

      <SectionLabel label="DUE DATE" colors={colors} />
      <TextInput
        style={[styles.input, {
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.background,
        }]}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.tabBarInactive}
        value={dueDate}
        onChangeText={setDueDate}
      />

      <TouchableOpacity
        style={[styles.actionBtn, {
          backgroundColor: submitting ? colors.border : "#BF5AF2",
        }]}
        onPress={handleCredit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="person-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Create Credit
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

// ── SETTLE CREDIT TAB ─────────────────────────────────────
// Used when cashier taps a credit account directly from the Credit sub-tab

function SettleCreditTab({ credit, onDone, colors }) {
  const { settleCredit } = usePOS();
  const [method,     setMethod]     = useState("CASH");
  const [amount,     setAmount]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  const outstanding = Number(credit?.credit_amount ?? 0);

  const handleSettle = async () => {
    const value = Number(amount || 0);
    if (value <= 0) return Alert.alert("Invalid", "Enter a valid amount.");
    if (value > outstanding + 0.001)
      return Alert.alert("Invalid", "Amount exceeds outstanding balance.");

    try {
      setSubmitting(true);
      await settleCredit({
        credit_id: credit.id,
        amount: value,
        method,
      });
      onDone("settled");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to settle credit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Customer info */}
      <View style={[styles.balanceBox, { backgroundColor: "#BF5AF212", borderColor: "#BF5AF230" }]}>
        <Text style={{ color: "#BF5AF2", fontSize: 13 }}>Outstanding Credit</Text>
        <Text style={{ color: "#BF5AF2", fontWeight: "700", fontSize: 28, marginTop: 4 }}>
          KES {formatKES(outstanding)}
        </Text>
        <Text style={{ color: "#BF5AF2", fontSize: 13, marginTop: 6 }}>
          {credit?.customer_name}
          {credit?.customer_phone ? `  •  ${credit.customer_phone}` : ""}
        </Text>
        <Text style={{
          color: new Date(credit?.due_date) < new Date() ? "#FF453A" : "#BF5AF2",
          fontSize: 12, marginTop: 4,
        }}>
          Due: {credit?.due_date}
        </Text>
      </View>

      <SectionLabel label="PAYMENT METHOD" colors={colors} />
      <View style={styles.methodRow}>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.methodBtn,
              {
                borderColor: method === m ? colors.accent : colors.border,
                backgroundColor: method === m ? colors.accent + "18" : colors.background,
              },
            ]}
            onPress={() => setMethod(m)}
          >
            <Ionicons
              name={
                m === "CASH"  ? "cash-outline"  :
                m === "MPESA" ? "phone-portrait-outline" :
                                "card-outline"
              }
              size={18}
              color={method === m ? colors.accent : colors.tabBarInactive}
            />
            <Text style={{
              color: method === m ? colors.accent : colors.tabBarInactive,
              fontWeight: "600", fontSize: 13, marginTop: 4,
            }}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel label="AMOUNT (KES)" colors={colors} />
      <TextInput
        style={[styles.input, {
          borderColor: colors.border,
          color: colors.text,
          backgroundColor: colors.background,
        }]}
        placeholder={formatKES(outstanding)}
        placeholderTextColor={colors.tabBarInactive}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TouchableOpacity
        style={styles.quickFill}
        onPress={() => setAmount(String(outstanding))}
      >
        <Text style={{ color: colors.accent, fontSize: 13 }}>
          Fill full amount  KES {formatKES(outstanding)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionBtn, {
          backgroundColor: submitting ? colors.border : "#30D158",
        }]}
        onPress={handleSettle}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Settle Credit
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

// ── SUCCESS OVERLAY ───────────────────────────────────────

function SuccessOverlay({ type, onClose, colors }) {
  const config = {
    paid:    { icon: "checkmark-circle",  color: "#30D158", title: "Payment Complete",  sub: "Receipt marked as paid." },
    credit:  { icon: "person-circle",     color: "#BF5AF2", title: "Credit Created",    sub: "Cashier has logged the credit." },
    settled: { icon: "checkmark-circle",  color: "#30D158", title: "Credit Settled",    sub: "Credit account has been settled." },
  }[type] ?? { icon: "checkmark-circle", color: "#30D158", title: "Done", sub: "" };

  return (
    <View style={[styles.successOverlay, { backgroundColor: colors.card }]}>
      <Ionicons name={config.icon} size={64} color={config.color} />
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 20, marginTop: 16 }}>
        {config.title}
      </Text>
      <Text style={{ color: colors.tabBarInactive, fontSize: 14, marginTop: 8, textAlign: "center" }}>
        {config.sub}
      </Text>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: colors.accent, marginTop: 32 }]}
        onPress={onClose}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── MAIN SHEET ────────────────────────────────────────────

export default function CashierPaymentSheet({ visible, receipt, onClose }) {
  const { colors } = useTheme();

  // receipt can be a normal receipt OR { _creditSettlement: true, credit: {...} }
  const isCreditSettlement = receipt?._creditSettlement === true;
  const credit             = receipt?.credit ?? null;

  const [tab,     setTab]     = useState("payment"); // "payment" | "credit"
  const [done,    setDone]    = useState(null);      // null | "paid" | "credit" | "settled"

  // Reset state whenever sheet opens for a new receipt
  useEffect(() => {
    if (visible) {
      setDone(null);
      setTab(isCreditSettlement ? "settle" : "payment");
    }
  }, [visible, receipt?.id]);

  if (!receipt) return null;

  const normalReceipt = isCreditSettlement ? null : receipt;
  const statusColor   = normalReceipt
    ? (STATUS_COLORS[normalReceipt.status] ?? colors.tabBarInactive)
    : "#BF5AF2";

  const allItems = normalReceipt?.orders?.flatMap((o) => o.items ?? []) ?? [];
  const payments = normalReceipt?.payments ?? [];

  const handleDone = (type) => setDone(type);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>

          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Success overlay takes over content area */}
          {done ? (
            <SuccessOverlay type={done} onClose={onClose} colors={colors} />
          ) : (
            <>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.receiptNumber, { color: colors.text }]}>
                    {isCreditSettlement
                      ? credit?.customer_name
                      : normalReceipt.receipt_number}
                  </Text>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 2 }}>
                    {isCreditSettlement
                      ? `Credit  •  Due: ${credit?.due_date}`
                      : new Date(normalReceipt.created_at).toLocaleString("en-KE", {
                          hour: "2-digit", minute: "2-digit",
                          day: "numeric", month: "short",
                        })}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={{ color: statusColor, fontWeight: "700", fontSize: 12 }}>
                      {isCreditSettlement ? "CREDIT" : normalReceipt.status}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={22} color={colors.tabBarInactive} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 48 }}
              >
                {/* ── Items list (only for normal receipts) ── */}
                {!isCreditSettlement && allItems.length > 0 && (
                  <>
                    <SectionLabel label="ITEMS" colors={colors} />
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
                            {item.quantity} × KES {formatKES(item.final_price)}
                            {item.price_overridden ? "  •  override" : ""}
                          </Text>
                        </View>
                        <Text style={{ color: colors.text, fontWeight: "700" }}>
                          KES {formatKES(item.line_total)}
                        </Text>
                      </View>
                    ))}

                    {/* Totals */}
                    <View style={[styles.totalsBox, { borderColor: colors.border }]}>
                      <View style={styles.totalRow}>
                        <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Subtotal</Text>
                        <Text style={{ color: colors.text }}>
                          KES {formatKES(normalReceipt.subtotal)}
                        </Text>
                      </View>
                      {normalReceipt.discount > 0 && (
                        <View style={styles.totalRow}>
                          <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Discount</Text>
                          <Text style={{ color: "#FF453A" }}>
                            − KES {formatKES(normalReceipt.discount)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.totalRow}>
                        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                          Total
                        </Text>
                        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                          KES {formatKES(normalReceipt.total)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* ── Previous payments ── */}
                {!isCreditSettlement && payments.length > 0 && (
                  <>
                    <SectionLabel label="PAYMENTS RECEIVED" colors={colors} />
                    {payments.map((p) => (
                      <View
                        key={p.id}
                        style={[styles.itemRow, { borderBottomColor: colors.border }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: "600" }}>
                            {p.method}
                          </Text>
                          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                            {new Date(p.created_at).toLocaleTimeString("en-KE", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                            {p.received_by?.name ? `  •  ${p.received_by.name}` : ""}
                          </Text>
                        </View>
                        <Text style={{ color: "#30D158", fontWeight: "700" }}>
                          KES {formatKES(p.amount)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {/* ── Action tabs ── */}
                {!isCreditSettlement && (
                  <>
                    {/* Tab switcher — only show if receipt is not already finalized */}
                    {["PENDING", "OPEN"].includes(normalReceipt.status) && (
                      <>
                        <View style={[styles.tabRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                          {[
                            { key: "payment", label: "Payment" },
                            { key: "credit",  label: "Credit"  },
                          ].map((t) => (
                            <TouchableOpacity
                              key={t.key}
                              style={[
                                styles.tabBtn,
                                tab === t.key && { backgroundColor: colors.accent },
                              ]}
                              onPress={() => setTab(t.key)}
                            >
                              <Text style={{
                                color: tab === t.key ? "#fff" : colors.tabBarInactive,
                                fontWeight: "600",
                                fontSize: 13,
                              }}>
                                {t.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {tab === "payment" ? (
                          <PaymentTab
                            receipt={normalReceipt}
                            onDone={handleDone}
                            colors={colors}
                          />
                        ) : (
                          <CreditTab
                            receipt={normalReceipt}
                            onDone={handleDone}
                            colors={colors}
                          />
                        )}
                      </>
                    )}

                    {/* Already paid / refunded — read-only */}
                    {["PAID", "CREDIT", "REFUNDED"].includes(normalReceipt.status) && (
                      <View style={[styles.readOnlyBox, { backgroundColor: statusColor + "12", borderColor: statusColor + "30" }]}>
                        <Ionicons
                          name={
                            normalReceipt.status === "PAID"     ? "checkmark-circle" :
                            normalReceipt.status === "CREDIT"   ? "person-circle"    :
                                                                   "arrow-undo-circle"
                          }
                          size={28}
                          color={statusColor}
                        />
                        <Text style={{ color: statusColor, fontWeight: "700", fontSize: 15, marginTop: 8 }}>
                          {normalReceipt.status === "PAID"     ? "Fully Paid"   :
                           normalReceipt.status === "CREDIT"   ? "On Credit"   :
                                                                  "Refunded"}
                        </Text>
                        {normalReceipt.status === "CREDIT" && normalReceipt.credit && (
                          <Text style={{ color: statusColor, fontSize: 13, marginTop: 4 }}>
                            {normalReceipt.credit.customer_name}
                            {normalReceipt.credit.customer_phone
                              ? `  •  ${normalReceipt.credit.customer_phone}`
                              : ""}
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}

                {/* Credit settlement flow */}
                {isCreditSettlement && (
                  <SettleCreditTab
                    credit={credit}
                    onDone={handleDone}
                    colors={colors}
                  />
                )}

              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    maxHeight: "94%",
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle:    { width: 40, height: 4, borderRadius: 2 },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  receiptNumber: { fontSize: 18, fontWeight: "700" },
  statusBadge:   { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", letterSpacing: 1,
    marginTop: 16, marginBottom: 8,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  totalsBox: {
    borderWidth: 1, borderRadius: 10,
    padding: 14, marginTop: 12, gap: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Payment / credit action area
  balanceBox: {
    borderWidth: 1, borderRadius: 12,
    padding: 16, alignItems: "center",
    marginTop: 8, marginBottom: 4,
  },

  tabRow: {
    flexDirection: "row",
    borderRadius: 10, borderWidth: 1,
    padding: 3, gap: 3,
    marginTop: 16, marginBottom: 16,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8,
    alignItems: "center", borderRadius: 8,
  },

  methodRow: {
    flexDirection: "row", gap: 8, marginBottom: 14,
  },
  methodBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
    alignItems: "center",
  },

  input: {
    borderWidth: 1, borderRadius: 10,
    padding: 12, fontSize: 15,
    marginBottom: 8,
  },
  quickFill: {
    alignSelf: "flex-end",
    marginBottom: 14,
    paddingVertical: 2,
  },
  actionBtn: {
    padding: 14, borderRadius: 10,
    alignItems: "center", marginTop: 4,
  },

  readOnlyBox: {
    borderWidth: 1, borderRadius: 12,
    padding: 20, alignItems: "center",
    marginTop: 16,
  },

  successOverlay: {
    flex: 1, justifyContent: "center",
    alignItems: "center", paddingBottom: 40,
  },
});