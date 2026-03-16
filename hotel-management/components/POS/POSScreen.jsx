// components/POS/POSScreen.jsx

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";
import { usePOS } from "../../context/POSContext";
import { useMenu } from "../../context/MenuContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TOP_HALF = SCREEN_HEIGHT * 0.92 * 0.52;
const BOT_HALF = SCREEN_HEIGHT * 0.92 * 0.28;

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function CartItem({ item, onIncrement, onDecrement, onRemove, colors }) {
  return (
    <View style={[styles.cartItem, { borderBottomColor: colors.border }]}>
      <Text style={{ fontSize: 20, marginRight: 8 }}>{item.emoji ?? "🛒"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
          {item.product_name}
        </Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
          KES {formatKES(item.final_price)} each
        </Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={[styles.qtyBtn, { borderColor: colors.border }]}
          onPress={() => onDecrement(item.key)}
        >
          <Ionicons name="remove" size={14} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontWeight: "700", marginHorizontal: 10, fontSize: 15 }}>
          {item.quantity}
        </Text>
        <TouchableOpacity
          style={[styles.qtyBtn, { borderColor: colors.border }]}
          onPress={() => onIncrement(item.key)}
        >
          <Ionicons name="add" size={14} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onRemove(item.key)} style={{ marginLeft: 10 }}>
          <Ionicons name="trash-outline" size={16} color="#FF453A" />
        </TouchableOpacity>
      </View>
      <Text style={{ color: colors.text, fontWeight: "700", width: 80, textAlign: "right" }}>
        KES {formatKES(item.line_total)}
      </Text>
    </View>
  );
}

function FrequentTile({ item, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[styles.freqTile, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.freqEmoji}>{item.emoji}</Text>
      <Text
        style={{ color: colors.text, fontSize: 11, fontWeight: "600", marginTop: 4, textAlign: "center" }}
        numberOfLines={2}
      >
        {item.name}
      </Text>
      {item.price > 0 && (
        <Text style={{ color: colors.tabBarInactive, fontSize: 10, marginTop: 2 }}>
          {formatKES(item.price)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function OrderSentOverlay({ receiptNumber, isEdit, onNewOrder, onClose, colors }) {
  return (
    <View style={[styles.overlay, { backgroundColor: colors.card }]}>
      <View style={styles.overlayContent}>
        <View style={[styles.checkCircle, { backgroundColor: "#30D15820" }]}>
          <Ionicons name="checkmark" size={40} color="#30D158" />
        </View>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 20, marginTop: 16 }}>
          {isEdit ? "Order Updated!" : "Order Sent!"}
        </Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 14, marginTop: 8, textAlign: "center" }}>
          {receiptNumber}
        </Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 4, textAlign: "center" }}>
          {isEdit ? "Changes sent to the cashier queue." : "The cashier will handle payment."}
        </Text>
        {!isEdit && (
          <TouchableOpacity
            style={[styles.newOrderBtn, { backgroundColor: colors.accent }]}
            onPress={onNewOrder}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>New Order</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.closeOverlayBtn, { borderColor: colors.border, marginTop: isEdit ? 28 : 12 }]}
          onPress={onClose}
        >
          <Text style={{ color: colors.tabBarInactive, fontWeight: "600", fontSize: 14 }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function POSScreen({ onClose, editReceipt = null }) {
  const { colors } = useTheme();
  const {
    session,
    createReceipt,
    createOrder,
    addOrderItem,
    addMenuOrderItem,
    submitOrder,
    recallOrder,
  } = usePOS();
  const { frequentItems, menuItems } = useMenu();

  const isEditMode = editReceipt !== null;

  const [search, setSearch]                       = useState("");
  const [cart, setCart]                           = useState([]);
  const [phase, setPhase]                         = useState("cart");
  const [sentReceiptNumber, setSentReceiptNumber] = useState("");
  const [submitting, setSubmitting]               = useState(false);
  const [preparing, setPreparing]                 = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode) return;
    const existingItems = editReceipt.orders?.flatMap((o) => o.items ?? []) ?? [];
    const loadedCart = existingItems.map((item) => ({
      key:          item.product_id && item.product_id !== "0"
                      ? `inv:${item.product_id}`
                      : `menu:${item.id}`,
      product_id:   item.product_id && item.product_id !== "0" ? item.product_id : null,
      menu_item_id: null,   // not recoverable from edit; re-add manually if needed
      product_name: item.product_name,
      emoji:        "🛒",
      quantity:     Number(item.quantity),
      final_price:  Number(item.final_price),
      line_total:   Number(item.line_total),
    }));
    setCart(loadedCart);
    setPreparing(false);
  }, [editReceipt?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return menuItems
      .filter((m) => m.is_available && m.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, menuItems]);

  const makeKey = (item) =>
    item.product_id ? `inv:${item.product_id}` : `menu:${item.id}`;

  const addToCart = useCallback((menuItem) => {
    const key = makeKey(menuItem);
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key
            ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.final_price }
            : i
        );
      }
      return [...prev, {
        key,
        product_id:   menuItem.product_id ?? null,     // null for manual items
        menu_item_id: menuItem.id,                      // always set from MenuContext
        product_name: menuItem.name,
        emoji:        menuItem.emoji,
        quantity:     1,
        final_price:  menuItem.price,
        line_total:   menuItem.price,
      }];
    });
    setSearch("");
  }, []);

  const increment = useCallback((key) =>
    setCart((prev) =>
      prev.map((i) =>
        i.key === key
          ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.final_price }
          : i
      )
    ), []);

  const decrement = useCallback((key) =>
    setCart((prev) =>
      prev
        .map((i) =>
          i.key === key
            ? { ...i, quantity: i.quantity - 1, line_total: (i.quantity - 1) * i.final_price }
            : i
        )
        .filter((i) => i.quantity > 0)
    ), []);

  const removeFromCart = useCallback((key) =>
    setCart((prev) => prev.filter((i) => i.key !== key)), []);

  const cartTotal = cart.reduce((sum, i) => sum + i.line_total, 0);

  const handleSendOrder = async () => {
    if (cart.length === 0)
      return Alert.alert("Empty Cart", "Add items before sending.");
    if (!session)
      return Alert.alert("No Session", "Open a POS session first.");

    try {
      setSubmitting(true);

      let receiptId;
      let orderId;

      if (isEditMode) {
        if (editReceipt.status === "PENDING") {
          await recallOrder(editReceipt.id);
        }
        receiptId = editReceipt.id;
        const newOrder = await createOrder(receiptId);
        orderId = newOrder.id;
      } else {
        const receipt = await createReceipt({ session_id: session.id });
        receiptId = receipt.id;
        const order = await createOrder(receiptId);
        orderId = order.id;
      }

      // Add each cart item using the correct mutation:
      // - inventory-linked → addOrderItem (product_id present)
      // - manual menu item → addMenuOrderItem (menu_item_id, no product_id)
      for (const item of cart) {
        try {
          if (item.product_id) {
            await addOrderItem({
              order_id:    orderId,
              product_id:  item.product_id,
              quantity:    item.quantity,
              final_price: item.final_price,
            });
          } else if (item.menu_item_id) {
            await addMenuOrderItem({
              order_id:     orderId,
              menu_item_id: item.menu_item_id,
              quantity:     item.quantity,
            });
          }
          // Items with neither product_id nor menu_item_id are skipped
        } catch (itemErr) {
          throw new Error(
            `Failed to add "${item.product_name}": ${itemErr?.message ?? "Unknown error"}`
          );
        }
      }

      const submitted = await submitOrder(receiptId);
      setSentReceiptNumber(submitted.receipt_number);
      setPhase("sent");

    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to send order.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForNewOrder = () => {
    setCart([]);
    setSearch("");
    setPhase("cart");
    setSentReceiptNumber("");
  };

  if (phase === "sent") {
    return (
      <OrderSentOverlay
        receiptNumber={sentReceiptNumber}
        isEdit={isEditMode}
        onNewOrder={resetForNewOrder}
        onClose={onClose}
        colors={colors}
      />
    );
  }

  if (preparing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.tabBarInactive, marginTop: 12, fontSize: 13 }}>
          Loading order...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>

      <View style={styles.posHeader}>
        <View>
          <Text style={[styles.posTitle, { color: colors.text }]}>
            {isEditMode ? "Edit Order" : "New Order"}
          </Text>
          {isEditMode && (
            <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
              {editReceipt.receipt_number}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} color={colors.tabBarInactive} />
        </TouchableOpacity>
      </View>

      <View style={{ height: TOP_HALF }}>

        <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={16} color={colors.tabBarInactive} />
          <TextInput
            style={{ flex: 1, color: colors.text, marginLeft: 8, fontSize: 14 }}
            placeholder="Search menu..."
            placeholderTextColor={colors.tabBarInactive}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.tabBarInactive} />
            </TouchableOpacity>
          )}
        </View>

        {filtered.length > 0 && (
          <View style={[styles.searchResults, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {filtered.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.searchResult, { borderBottomColor: colors.border }]}
                onPress={() => addToCart(m)}
              >
                <Text style={{ fontSize: 18, marginRight: 10 }}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{m.name}</Text>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
                    KES {formatKES(m.price)}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FlatList
          data={cart}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <CartItem
              item={item}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={removeFromCart}
              colors={colors}
            />
          )}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCart}>
              <Ionicons name="restaurant-outline" size={36} color={colors.tabBarInactive} />
              <Text style={{ color: colors.tabBarInactive, marginTop: 10, fontSize: 13 }}>
                Search or tap a frequent item below
              </Text>
            </View>
          }
        />
      </View>

      <View style={[styles.cartFooter, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
        <View>
          <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
            {isEditMode ? "Updated Total" : "Total"}
          </Text>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>
            KES {formatKES(cartTotal)}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: submitting || cart.length === 0 ? colors.border : colors.accent },
          ]}
          onPress={handleSendOrder}
          disabled={submitting || cart.length === 0}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name={isEditMode ? "refresh" : "send"} size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {isEditMode ? "Update Order" : "Send Order"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: BOT_HALF }}>
        <Text style={[styles.freqLabel, { color: colors.tabBarInactive }]}>
          FREQUENT ORDERS
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingBottom: 8 }}
        >
          {frequentItems.length === 0 ? (
            <Text style={{ color: colors.tabBarInactive, fontSize: 13, alignSelf: "center" }}>
              No items yet — add some via the menu ⚙️
            </Text>
          ) : (
            frequentItems.map((item) => (
              <FrequentTile key={item.id} item={item} onPress={addToCart} colors={colors} />
            ))
          )}
        </ScrollView>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  posHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  posTitle:  { fontSize: 18, fontWeight: "700" },
  searchBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  searchResults: { borderWidth: 1, borderRadius: 10, marginBottom: 6, overflow: "hidden", maxHeight: 200 },
  searchResult:  { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  cartItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  qtyRow:   { flexDirection: "row", alignItems: "center" },
  qtyBtn:   { width: 28, height: 28, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyCart: { alignItems: "center", paddingVertical: 28 },
  cartFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 8 },
  sendBtn:    { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 10 },
  freqLabel:  { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  freqTile:   { width: 72, alignItems: "center", padding: 8, borderRadius: 12, borderWidth: 1 },
  freqEmoji:  { fontSize: 28 },
  overlay:        { flex: 1, justifyContent: "center", alignItems: "center" },
  overlayContent: { alignItems: "center", paddingHorizontal: 32 },
  checkCircle:    { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  newOrderBtn:    { marginTop: 28, paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12 },
  closeOverlayBtn: { paddingVertical: 12, paddingHorizontal: 48, borderRadius: 12, borderWidth: 1 },
});