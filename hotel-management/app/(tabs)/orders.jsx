// app/(tabs)/orders.jsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  BackHandler,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";
import { usePOS } from "../../context/POSContext";

import POSScreen from "../../components/POS/POSScreen";
import ReceiptDetailSheet from "../../components/POS/ReceiptDetailSheet";
import OpenSessionModal from "../../components/POS/OpenSessionModal";
import CloseSessionModal from "../../components/POS/CloseSessionModal";
import MenuManagerSheet from "../../components/POS/MenuManagerSheet";
import CashierPaymentSheet from "../../components/POS/CashierPaymentSheet";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const STATUS_COLORS = {
  DRAFT:    "#8E8E93",
  PENDING:  "#FF9F0A",
  OPEN:     "#0A84FF",
  PAID:     "#30D158",
  CREDIT:   "#BF5AF2",
  REFUNDED: "#FF453A",
};

const EDITABLE_STATUSES = new Set(["DRAFT", "PENDING"]);

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── RECEIPT CARD ──────────────────────────────────────────

function ReceiptCard({ item, onPress, showEditHint = false, colors }) {
  const statusColor = STATUS_COLORS[item.status] ?? colors.tabBarInactive;
  const itemCount   = item.orders?.reduce(
    (sum, o) => sum + (o.items?.length ?? 0), 0
  ) ?? 0;
  const isEditable  = showEditHint && EDITABLE_STATUSES.has(item.status);

  return (
    <TouchableOpacity
      style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.receiptNumber, { color: colors.text }]}>
          {item.receipt_number}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isEditable && (
            <Ionicons name="create-outline" size={14} color={colors.tabBarInactive} />
          )}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={{ color: statusColor, fontWeight: "700", fontSize: 11 }}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 6 }}>
        {new Date(item.created_at).toLocaleString("en-KE", {
          hour: "2-digit", minute: "2-digit",
          day: "numeric", month: "short",
        })}
        {"  •  "}
        {itemCount} {itemCount === 1 ? "item" : "items"}
        {item.table_note ? `  •  ${item.table_note}` : ""}
      </Text>

      <View style={styles.rowBetween}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 6 }}>
          KES {formatKES(item.total)}
        </Text>
        {item.status === "CREDIT" && item.credit && (
          <Text style={{ color: "#BF5AF2", fontSize: 13, marginTop: 6 }}>
            {item.credit.customer_name}
          </Text>
        )}
        {item.status === "PENDING" && item.submitted_at && (
          <Text style={{ color: "#FF9F0A", fontSize: 12, marginTop: 6 }}>
            {new Date(item.submitted_at).toLocaleTimeString("en-KE", {
              hour: "2-digit", minute: "2-digit",
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── WAITER VIEW ───────────────────────────────────────────

function WaiterView({ colors, onEditReceipt, onViewReceipt }) {
  const { receipts, loading, getSummary } = usePOS();
  const { totalSales, pendingCount } = getSummary();

  const myReceipts = receipts.filter(
    (r) => !["PAID", "REFUNDED"].includes(r.status)
  );

  const handlePress = (receipt) => {
    if (EDITABLE_STATUSES.has(receipt.status)) {
      onEditReceipt(receipt);
    } else {
      onViewReceipt(receipt);
    }
  };

  return (
    <>
      <View style={[styles.summaryContainer, { paddingHorizontal: 20 }]}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="receipt-outline" size={22} color={colors.accent} />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {receipts.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>
            Today
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="hourglass-outline" size={22} color="#FF9F0A" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {pendingCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>
            Pending
          </Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={22} color="#30D158" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            KES {formatKES(totalSales)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>
            Sales
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 20 }]}>
        Recent Orders
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={myReceipts}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <ReceiptCard
              item={item}
              onPress={handlePress}
              showEditHint
              colors={colors}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          ListEmptyComponent={
            <Text style={{
              color: colors.tabBarInactive,
              textAlign: "center",
              marginTop: 20,
              opacity: 0.6,
            }}>
              No orders yet. Tap + to start.
            </Text>
          }
        />
      )}
    </>
  );
}

// ── CASHIER VIEW ──────────────────────────────────────────

function CashierView({ colors, onOpenReceipt }) {
  const {
    cashierQueue,
    openReceipts,
    unsettledCredits,
    cashierLoading,
    loadCashierData,
    loadUnsettledCredits,
    getCashierSummary,
  } = usePOS();

  const [tab, setTab] = useState("queue");

  useEffect(() => {
    loadCashierData();
    loadUnsettledCredits();
  }, []);

  const { queueCount, openCount, paidToday } = getCashierSummary();

  const currentData =
    tab === "queue"  ? cashierQueue :
    tab === "open"   ? openReceipts :
    unsettledCredits;

  return (
    <>
      <View style={[styles.summaryContainer, { paddingHorizontal: 20 }]}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="time-outline" size={22} color="#FF9F0A" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{queueCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>Queue</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="card-outline" size={22} color="#0A84FF" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>{openCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>Open</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={22} color="#30D158" />
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            KES {formatKES(paidToday)}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.tabBarInactive }]}>Paid Today</Text>
        </View>
      </View>

      {/* Sub-tabs */}
      <View style={[styles.subTabRow, { paddingHorizontal: 20, marginBottom: 12 }]}>
        {[
          { key: "queue",  label: "Queue",  count: queueCount },
          { key: "open",   label: "Open",   count: openCount },
          { key: "credit", label: "Credit", count: unsettledCredits.length },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.subTab,
              {
                borderBottomWidth: tab === t.key ? 2 : 0,
                borderBottomColor: colors.accent,
              },
            ]}
            onPress={() => setTab(t.key)}
          >
            <Text style={{
              color: tab === t.key ? colors.accent : colors.tabBarInactive,
              fontWeight: tab === t.key ? "700" : "400",
              fontSize: 14,
            }}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ""}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={() => { loadCashierData(); loadUnsettledCredits(); }}
          style={{ marginLeft: "auto" }}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.tabBarInactive} />
        </TouchableOpacity>
      </View>

      {cashierLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : tab === "credit" ? (
        <FlatList
          data={unsettledCredits}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.receiptCard, {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginHorizontal: 20,
              }]}
              onPress={() => onOpenReceipt({ _creditSettlement: true, credit: item })}
              activeOpacity={0.75}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.receiptNumber, { color: colors.text }]}>
                  {item.customer_name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: "#BF5AF220" }]}>
                  <Text style={{ color: "#BF5AF2", fontWeight: "700", fontSize: 11 }}>
                    CREDIT
                  </Text>
                </View>
              </View>
              {item.customer_phone ? (
                <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 4 }}>
                  {item.customer_phone}
                </Text>
              ) : null}
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 6 }}>
                  KES {formatKES(item.credit_amount)}
                </Text>
                <Text style={{
                  color: new Date(item.due_date) < new Date() ? "#FF453A" : colors.tabBarInactive,
                  fontSize: 12, marginTop: 6,
                }}>
                  Due: {item.due_date}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 20, opacity: 0.6 }}>
              No unsettled credits.
            </Text>
          }
        />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <ReceiptCard item={item} onPress={onOpenReceipt} colors={colors} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
          ListEmptyComponent={
            <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 20, opacity: 0.6 }}>
              {tab === "queue" ? "No orders waiting." : "No open receipts."}
            </Text>
          }
        />
      )}
    </>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────

export default function OrdersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { session } = usePOS();

  const [activeView, setActiveView]               = useState("waiter");
  const [showPOS, setShowPOS]                     = useState(false);
  const [editReceipt, setEditReceipt]             = useState(null);
  const [showReceipt, setShowReceipt]             = useState(false);
  const [showCashierPayment, setShowCashierPayment] = useState(false);
  const [showOpenSession, setShowOpenSession]     = useState(false);
  const [showCloseSession, setShowCloseSession]   = useState(false);
  const [showMenu, setShowMenu]                   = useState(false);
  const [selectedReceipt, setSelectedReceipt]     = useState(null);

  const slideAnim    = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ── Header toggle ─────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerToggle}>
          {["waiter", "cashier"].map((v) => (
            <TouchableOpacity
              key={v}
              style={[
                styles.headerToggleBtn,
                activeView === v && { backgroundColor: colors.accent },
              ]}
              onPress={() => setActiveView(v)}
            >
              <Text style={{
                color: activeView === v ? "#fff" : colors.tabBarInactive,
                fontWeight: "600",
                fontSize: 13,
              }}>
                {v === "waiter" ? "Orders" : "Cashier"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16 }}
          onPress={() => setShowMenu(true)}
        >
          <Ionicons name="settings-outline" size={20} color={colors.tabBarInactive} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, activeView, colors]);

  // ── POS sheet open/close ──────────────────────────────
  const openPOS = useCallback((receipt = null) => {
    if (!session) { setShowOpenSession(true); return; }
    setEditReceipt(receipt);
    setShowPOS(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [session]);

  const closePOS = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setShowPOS(false);
      setEditReceipt(null);
    });
  }, []);

  // ── Waiter receipt handlers ───────────────────────────
  const handleEditReceipt = useCallback((receipt) => {
    openPOS(receipt);
  }, [openPOS]);

  const handleViewReceipt = useCallback((receipt) => {
    setSelectedReceipt(receipt);
    setShowReceipt(true);
  }, []);

  // ── Cashier receipt handler ───────────────────────────
  const handleCashierOpenReceipt = useCallback((receipt) => {
    setSelectedReceipt(receipt);
    setShowCashierPayment(true);
  }, []);

  // ── Back handler ──────────────────────────────────────
  useEffect(() => {
    const onBack = () => {
      if (showPOS)            { closePOS(); return true; }
      if (showCashierPayment) { setShowCashierPayment(false); return true; }
      if (showReceipt)        { setShowReceipt(false); return true; }
      if (showMenu)           { setShowMenu(false); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [showPOS, showCashierPayment, showReceipt, showMenu]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>

        {activeView === "waiter" ? (
          <WaiterView
            colors={colors}
            onEditReceipt={handleEditReceipt}
            onViewReceipt={handleViewReceipt}
          />
        ) : (
          <CashierView
            colors={colors}
            onOpenReceipt={handleCashierOpenReceipt}
          />
        )}

      </SafeAreaView>

      {/* FABs — waiter only */}
      {activeView === "waiter" && (
        <View style={styles.fabContainer}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.accent }]}
            onPress={() => openPOS(null)}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.eyeButton, { backgroundColor: colors.card }]}
            onPress={() => session ? setShowCloseSession(true) : setShowOpenSession(true)}
          >
            <Ionicons name="eye-outline" size={26} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* POS Sheet */}
      {showPOS && (
        <>
          <TouchableWithoutFeedback onPress={closePOS}>
            <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            {/* editReceipt=null → new order, editReceipt=receipt → edit mode */}
            <POSScreen onClose={closePOS} editReceipt={editReceipt} />
          </Animated.View>
        </>
      )}

      {/* Modals */}
      <ReceiptDetailSheet
        visible={showReceipt}
        receipt={selectedReceipt}
        onClose={() => { setShowReceipt(false); setSelectedReceipt(null); }}
      />
      <CashierPaymentSheet
        visible={showCashierPayment}
        receipt={selectedReceipt}
        onClose={() => { setShowCashierPayment(false); setSelectedReceipt(null); }}
      />
      <OpenSessionModal
        visible={showOpenSession}
        onClose={() => setShowOpenSession(false)}
      />
      <CloseSessionModal
        visible={showCloseSession}
        onClose={() => setShowCloseSession(false)}
      />
      <MenuManagerSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerToggle: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    gap: 2,
  },
  headerToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },

  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 20,
    gap: 8,
  },
  summaryCard: {
    flex: 1, alignItems: "center",
    paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  summaryValue: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  summaryLabel: { fontSize: 12, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },

  subTabRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  subTab:    { paddingBottom: 8 },

  receiptCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  receiptNumber: { fontSize: 16, fontWeight: "600" },
  statusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  fabContainer: { position: "absolute", bottom: 20, right: 20, alignItems: "center" },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    justifyContent: "center", alignItems: "center", elevation: 5,
  },
  eyeButton: {
    marginTop: 10, width: 50, height: 50, borderRadius: 25,
    justifyContent: "center", alignItems: "center", elevation: 3,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: SCREEN_HEIGHT * 0.92,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    zIndex: 11, elevation: 16,
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
});