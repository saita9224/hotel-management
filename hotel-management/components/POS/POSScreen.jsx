// components/POS/POSScreen.jsx

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";
import { usePOS } from "../../context/POSContext";
import { useMenu } from "../../context/MenuContext";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Icon map keyed by backend category key.
// This is purely a UI concern — icons have no meaning on the backend.
// If a new category key is added on the backend with no entry here,
// it falls back to "pricetag-outline" so the pill still renders.
const CATEGORY_ICON_MAP = {
  food:   "restaurant-outline",
  drinks: "cafe-outline",
  snacks: "fast-food-outline",
  other:  "apps-outline",
};

// The two frontend-only pills that are not backend categories.
// "Frequent" = pinned + top-ordered items derived in MenuContext.
// "All"      = every available, priced item.
const STATIC_PILLS = [
  { key: "frequent", name: "Frequent", icon: "flash-outline" },
  { key: "all",      name: "All",      icon: "grid-outline" },
];

// ─── CartItem ────────────────────────────────────────────────────────────────
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

// ─── MenuTile ────────────────────────────────────────────────────────────────
function MenuTile({ item, quantity, onPress, colors, tileWidth }) {
  return (
    <TouchableOpacity
      style={[
        styles.menuTile,
        { backgroundColor: colors.background, borderColor: colors.border, width: tileWidth },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      {quantity > 0 && (
        <View style={[styles.tileBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.tileBadgeText}>x{quantity}</Text>
        </View>
      )}
      <View style={styles.tileTopRow}>
        <Text style={styles.menuEmoji}>{item.emoji || "•"}</Text>
        <View style={[styles.quickAddCircle, { backgroundColor: colors.accent }]}>
          <Ionicons name="add" size={16} color="#fff" />
        </View>
      </View>
      <Text
        style={{ color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 8, lineHeight: 17 }}
        numberOfLines={2}
      >
        {item.name}
      </Text>
      {item.price > 0 && (
        <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 5, fontWeight: "600" }}>
          KES {formatKES(item.price)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── CategoryPill ─────────────────────────────────────────────────────────────
function CategoryPill({ category, active, count, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        {
          backgroundColor: active ? colors.accent : colors.background,
          borderColor:      active ? colors.accent : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons
        name={category.icon}
        size={15}
        color={active ? "#fff" : colors.tabBarInactive}
      />
      <Text style={[styles.categoryPillText, { color: active ? "#fff" : colors.text }]}>
        {category.name}
      </Text>
      <Text style={{ color: active ? "#DDEBFF" : colors.tabBarInactive, fontSize: 11, fontWeight: "700" }}>
        {count}
      </Text>
    </TouchableOpacity>
  );
}

// ─── OrderReviewPanel ─────────────────────────────────────────────────────────
function OrderReviewPanel({ cart, cartTotal, onClose, onIncrement, onDecrement, onRemove, colors }) {
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <View style={[styles.reviewPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.reviewHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.reviewHeaderLeft}>
          <View style={[styles.reviewIconWrap, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="receipt-outline" size={18} color={colors.accent} />
          </View>
          <View>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>
              Order Review
            </Text>
            <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 1 }}>
              {itemCount} item{itemCount !== 1 ? "s" : ""} · adjust before sending
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.reviewCloseBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={onClose}
          activeOpacity={0.75}
        >
          <Ionicons name="storefront-outline" size={14} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>Add More</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons name="receipt-outline" size={34} color={colors.tabBarInactive} />
            <Text style={{ color: colors.tabBarInactive, marginTop: 10, fontSize: 13, textAlign: "center" }}>
              All items removed. Tap Add More to go back.
            </Text>
          </View>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item.key}
              item={item}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
              colors={colors}
            />
          ))
        )}
      </ScrollView>

      <View
        style={[
          styles.reviewFooter,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.reviewSummaryRow}>
          <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Subtotal</Text>
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
            KES {formatKES(cartTotal)}
          </Text>
        </View>
        <View style={[styles.reviewSummaryRow, { marginTop: 6 }]}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Total</Text>
          <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 18 }}>
            KES {formatKES(cartTotal)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── OrderSentOverlay ─────────────────────────────────────────────────────────
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
          style={[
            styles.closeOverlayBtn,
            { borderColor: colors.border, marginTop: isEdit ? 28 : 12 },
          ]}
          onPress={onClose}
        >
          <Text style={{ color: colors.tabBarInactive, fontWeight: "600", fontSize: 14 }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── POSScreen ────────────────────────────────────────────────────────────────
export default function POSScreen({ onClose, editReceipt = null }) {
  const { colors }              = useTheme();
  const { width: screenWidth }  = useWindowDimensions();
  const insets                  = useSafeAreaInsets();
  const {
    session,
    createReceipt,
    createOrder,
    addOrderItem,
    addMenuOrderItem,
    submitOrder,
    recallOrder,
  } = usePOS();
  const { frequentItems, menuItems, menuCategories } = useMenu();

  const isEditMode = editReceipt !== null;

  const [search, setSearch]                       = useState("");
  const [cart, setCart]                           = useState([]);
  const [selectedCategory, setSelectedCategory]   = useState("frequent");
  const [phase, setPhase]                         = useState("cart");
  const [sentReceiptNumber, setSentReceiptNumber] = useState("");
  const [submitting, setSubmitting]               = useState(false);
  const [preparing, setPreparing]                 = useState(isEditMode);
  const [reviewMode, setReviewMode]               = useState(false);

  const CONTAINER_H_PADDING = 32;
  const TILE_GAP            = 8;
  const COLS                = 3;
  const tileWidth           = (screenWidth - CONTAINER_H_PADDING - (COLS - 1) * TILE_GAP) / COLS;

  useEffect(() => {
    if (!isEditMode) return;
    const existingItems = editReceipt.orders?.flatMap((o) => o.items ?? []) ?? [];
    const loadedCart = existingItems.map((item) => ({
      key:          item.product_id && item.product_id !== "0"
                      ? `inv:${item.product_id}`
                      : `menu:${item.id}`,
      product_id:   item.product_id && item.product_id !== "0" ? item.product_id : null,
      menu_item_id: null,
      product_name: item.product_name,
      emoji:        "🛒",
      quantity:     Number(item.quantity),
      final_price:  Number(item.final_price),
      line_total:   Number(item.line_total),
    }));
    setCart(loadedCart);
    setPreparing(false);
  }, [editReceipt?.id]);

  const availableMenuItems = useMemo(
    () => (menuItems ?? []).filter((m) => m.is_available && m.price > 0),
    [menuItems]
  );

  // All category pills. Static "Frequent" and "All" always appear first.
  // The rest come from the backend menuCategories — keys, labels, and
  // counts are all backend-driven. Only icons are mapped here since
  // they are a UI-only concept with no backend representation.
  const posCategories = useMemo(() => [
    ...STATIC_PILLS,
    ...(menuCategories ?? []).map((cat) => ({
      key:  cat.key,
      name: cat.label,
      icon: CATEGORY_ICON_MAP[cat.key] ?? "pricetag-outline",
    })),
  ], [menuCategories]);

  // Counts for each pill. Keys seeded from menuCategories so they stay
  // in sync with whatever the backend currently defines.
  const categoryCounts = useMemo(() => {
    const counts = { frequent: 0, all: 0 };
    (menuCategories ?? []).forEach((cat) => { counts[cat.key] = 0; });
    counts.frequent = (frequentItems ?? []).length;
    counts.all      = availableMenuItems.length;
    availableMenuItems.forEach((item) => {
      const cat = item.category ?? "other";
      if (cat in counts) counts[cat] += 1;
    });
    return counts;
  }, [availableMenuItems, frequentItems, menuCategories]);

  const visibleMenuItems = useMemo(() => {
    const q = search.toLowerCase();
    const baseItems =
      selectedCategory === "frequent" ? (frequentItems ?? []) :
      selectedCategory === "all"      ? availableMenuItems :
      availableMenuItems.filter((item) => (item.category ?? "other") === selectedCategory);
    return baseItems
      .filter((item) => !q.trim() || item.name.toLowerCase().includes(q))
      .slice(0, 24);
  }, [availableMenuItems, frequentItems, search, selectedCategory]);

  const cartQuantities = useMemo(
    () => cart.reduce((acc, item) => { acc[item.key] = item.quantity; return acc; }, {}),
    [cart]
  );

  const makeKey = (item) => item.product_id ? `inv:${item.product_id}` : `menu:${item.id}`;

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
        product_id:   menuItem.product_id ?? null,
        menu_item_id: menuItem.id,
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

  const removeFromCart = useCallback(
    (key) => setCart((prev) => prev.filter((i) => i.key !== key)),
    []
  );

  const cartTotal   = cart.reduce((sum, i) => sum + i.line_total, 0);
  const cartItemQty = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleSendOrder = async () => {
    if (cart.length === 0)
      return Alert.alert("Empty Cart", "Add items before sending.");
    if (!session)
      return Alert.alert("No Session", "Open a POS session first.");

    try {
      setSubmitting(true);

      let receiptId, orderId;

      if (isEditMode) {
        if (editReceipt.status === "PENDING") await recallOrder(editReceipt.id);
        receiptId = editReceipt.id;
        const newOrder = await createOrder(receiptId);
        orderId = newOrder.id;
      } else {
        const receipt = await createReceipt({ session_id: session.id });
        receiptId = receipt.id;
        const order = await createOrder(receiptId);
        orderId = order.id;
      }

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
    setSelectedCategory("frequent");
    setPhase("cart");
    setSentReceiptNumber("");
    setReviewMode(false);
  };

  // ── Shared footer ─────────────────────────────────────────────────────────
  const Footer = () => (
    <View
      style={[
        styles.cartFooter,
        {
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
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
  );

  // ── Shared header ─────────────────────────────────────────────────────────
  // paddingTop uses the safe area top inset so the arrow clears the
  // status bar on all devices including notched and Dynamic Island models.
  const Header = () => (
    <View
      style={[
        styles.posHeader,
        {
          borderBottomColor: colors.border,
          paddingTop: insets.top + 8,
          backgroundColor: colors.card,
        },
      ]}
    >
      {/* Back arrow */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.background }]}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Title block */}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.posTitle, { color: colors.text }]}>
          {isEditMode ? "Edit Order" : "New Order"}
        </Text>
        {isEditMode && (
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 1 }}>
            {editReceipt.receipt_number}
          </Text>
        )}
      </View>

      {/* Cart item count badge — only shown when cart has items */}
      {cart.length > 0 && (
        <View
          style={[
            styles.headerCartBadge,
            { backgroundColor: colors.accent + "18", borderColor: colors.accent + "35" },
          ]}
        >
          <Ionicons name="cart-outline" size={14} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
            {cartItemQty}
          </Text>
        </View>
      )}
    </View>
  );

  // ── Phase: sent ──
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

  // ── Phase: loading edit ──
  if (preparing) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            justifyContent: "center",
            alignItems: "center",
            paddingTop: insets.top,
          },
        ]}
      >
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.tabBarInactive, marginTop: 12, fontSize: 13 }}>
          Loading order...
        </Text>
      </View>
    );
  }

  // ── Phase: review mode ──
  if (reviewMode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Header />
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <OrderReviewPanel
            cart={cart}
            cartTotal={cartTotal}
            onClose={() => setReviewMode(false)}
            onIncrement={increment}
            onDecrement={decrement}
            onRemove={removeFromCart}
            colors={colors}
          />
        </View>
        <Footer />
      </View>
    );
  }

  // ── Normal entry mode ──
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Header />

      <View style={styles.body}>
        {/* ── SEARCH (fixed) ────────────────────────────────────────── */}
        <View
          style={[
            styles.searchBox,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
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

        {/* ── CATEGORY PILLS (fixed) ────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryStrip}
          style={styles.categoryStripWrapper}
        >
          {posCategories.map((category) => (
            <CategoryPill
              key={category.key}
              category={category}
              active={selectedCategory === category.key}
              count={categoryCounts[category.key] ?? 0}
              onPress={() => setSelectedCategory(category.key)}
              colors={colors}
            />
          ))}
        </ScrollView>

        {/* ── SCROLLABLE BODY ───────────────────────────────────────── */}
        <View style={{ flex: 1 }}>
          <ScrollView
            style={StyleSheet.absoluteFill}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >

            {/* ── CURRENT ORDER ───────────────────────────────────────── */}
            <View
              style={[
                styles.cartPanel,
                { borderColor: colors.border, backgroundColor: colors.background, marginBottom: 14 },
              ]}
            >
              <View style={styles.cartPanelHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Current Order</Text>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                    {cart.length === 0
                      ? "Tap a tile below to start"
                      : `${cartItemQty} item${cartItemQty !== 1 ? "s" : ""} · KES ${formatKES(cartTotal)}`}
                  </Text>
                </View>

                {cart.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.cartActionBtn,
                        { borderColor: colors.accent, backgroundColor: colors.accent + "15" },
                      ]}
                      onPress={() => setReviewMode(true)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="eye-outline" size={14} color={colors.accent} />
                      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
                        Review
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cartActionBtn,
                        { borderColor: "#FF453A", backgroundColor: "#FF453A18" },
                      ]}
                      onPress={() =>
                        Alert.alert(
                          "Clear Order",
                          "Remove all items from the current order?",
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Clear", style: "destructive", onPress: () => setCart([]) },
                          ]
                        )
                      }
                    >
                      <Ionicons name="close-circle-outline" size={14} color="#FF453A" />
                      <Text style={{ color: "#FF453A", fontSize: 12, fontWeight: "700" }}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <ScrollView
                style={{ maxHeight: 220 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {cart.length === 0 ? (
                  <View style={styles.emptyCart}>
                    <Ionicons name="restaurant-outline" size={34} color={colors.tabBarInactive} />
                    <Text style={{ color: colors.tabBarInactive, marginTop: 10, fontSize: 13, textAlign: "center" }}>
                      Tap a tile below to start the order
                    </Text>
                  </View>
                ) : (
                  cart.map((item) => (
                    <CartItem
                      key={item.key}
                      item={item}
                      onIncrement={increment}
                      onDecrement={decrement}
                      onRemove={removeFromCart}
                      colors={colors}
                    />
                  ))
                )}
              </ScrollView>
            </View>

            {/* ── TAP TO ADD ──────────────────────────────────────────── */}
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tap To Add</Text>
                <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                  {visibleMenuItems.length} items shown
                </Text>
              </View>
              {cart.length > 0 && (
                <View
                  style={[
                    styles.itemCountPill,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="receipt-outline" size={14} color={colors.accent} />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>
                    {cartItemQty} in order
                  </Text>
                </View>
              )}
            </View>

            {visibleMenuItems.length === 0 ? (
              <View
                style={[
                  styles.emptyMenu,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <Ionicons name="search-outline" size={28} color={colors.tabBarInactive} />
                <Text style={{ color: colors.tabBarInactive, marginTop: 8, fontSize: 13, textAlign: "center" }}>
                  No menu items match this view.
                </Text>
              </View>
            ) : (
              <View style={styles.menuGrid}>
                {visibleMenuItems.map((item) => (
                  <MenuTile
                    key={item.id}
                    item={item}
                    quantity={cartQuantities[makeKey(item)] ?? 0}
                    onPress={addToCart}
                    colors={colors}
                    tileWidth={tileWidth}
                  />
                ))}
              </View>
            )}

          </ScrollView>
        </View>

        <Footer />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Root container — no horizontal padding here so the header can
  // span full width. Padding is applied inside `body` instead.
  container: { flex: 1 },

  // Header sits outside `body` so it can own its own top padding
  // (set dynamically via insets.top in the component).
  posHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  posTitle: { fontSize: 17, fontWeight: "700" },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  headerCartBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },

  // Body — everything below the header, horizontally padded.
  body: { flex: 1, paddingHorizontal: 16 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
    marginBottom: 10,
  },

  categoryStripWrapper: { flexGrow: 0, flexShrink: 0, marginBottom: 10 },
  categoryStrip:        { gap: 8, paddingVertical: 4 },
  categoryPill:         { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12 },
  categoryPillText:     { fontSize: 12, fontWeight: "700" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: "800" },
  itemCountPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10 },

  menuGrid:       { flexDirection: "row", flexWrap: "wrap", rowGap: 8, columnGap: 8, marginBottom: 14 },
  menuTile:       { minHeight: 118, borderRadius: 8, borderWidth: 1, padding: 10, justifyContent: "space-between", position: "relative" },
  tileTopRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  menuEmoji:      { fontSize: 28 },
  quickAddCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  tileBadge:      { position: "absolute", top: -6, right: -6, minWidth: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, zIndex: 2 },
  tileBadgeText:  { color: "#fff", fontSize: 11, fontWeight: "800" },
  emptyMenu:      { borderWidth: 1, borderRadius: 8, padding: 22, alignItems: "center", marginBottom: 14 },

  cartPanel:       { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  cartPanelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cartActionBtn:   { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1 },
  cartItem:        { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  qtyRow:          { flexDirection: "row", alignItems: "center" },
  qtyBtn:          { width: 28, height: 28, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyCart:       { alignItems: "center", paddingVertical: 28 },

  cartFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1 },
  sendBtn:    { paddingVertical: 11, paddingHorizontal: 20, borderRadius: 10 },

  overlay:         { flex: 1, justifyContent: "center", alignItems: "center" },
  overlayContent:  { alignItems: "center", paddingHorizontal: 32 },
  checkCircle:     { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  newOrderBtn:     { marginTop: 28, paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12 },
  closeOverlayBtn: { paddingVertical: 12, paddingHorizontal: 48, borderRadius: 12, borderWidth: 1 },

  reviewPanel:      { flex: 1, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  reviewHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  reviewHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  reviewIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reviewCloseBtn:   { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  reviewFooter:     { paddingHorizontal: 16, paddingVertical: 14 },
  reviewSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});