// components/Inventory/StockHistorySheet.jsx

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";

import { useInventory } from "../../context/InventoryContext";
import { useTheme } from "../../hooks/useTheme";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

const MOVEMENT_COLORS = {
  IN: "#30D158",
  OUT: "#FF453A",
};

export default function StockHistorySheet({ visible, product, onClose }) {
  const { getProductMovements } = useInventory();
  const { colors } = useTheme();

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  // Track whether sheet has ever been shown so we can safely unmount after close animation
  const [mounted, setMounted] = useState(false);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      loadMovements();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setMounted(false);
        setMovements([]);
      });
    }
  }, [visible]);

  const loadMovements = async () => {
    if (!product) return;
    try {
      setLoading(true);
      const data = await getProductMovements(product.id);
      setMovements(data);
    } catch (err) {
      console.log("Stock history error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Don't render at all until first opened
  if (!mounted) return null;

  const renderMovement = ({ item }) => {
    const isIn = item.movement_type === "IN";
    const color = isIn ? MOVEMENT_COLORS.IN : MOVEMENT_COLORS.OUT;

    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.badge, { backgroundColor: color + "20" }]}>
          <Text style={{ color, fontWeight: "700", fontSize: 12 }}>
            {item.movement_type}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {item.reason}{item.notes ? ` — ${item.notes}` : ""}
          </Text>
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
            {new Date(item.created_at).toLocaleDateString("en-US", {
              day: "numeric", month: "short", year: "numeric",
            })}
            {"  •  "}{item.performed_by}
          </Text>
        </View>

        <Text style={{ color, fontWeight: "700", fontSize: 15 }}>
          {isIn ? "+" : "-"}{item.quantity}
        </Text>
      </View>
    );
  };

  return (
    <>
      <TouchableWithoutFeedback onPress={onClose}>
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

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Stock History</Text>
            {product && (
              <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>
                {product.name}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={movements}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMovement}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
                No movements found
              </Text>
            }
          />
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 10 },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    zIndex: 11, elevation: 16, paddingHorizontal: 16,
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, minWidth: 40, alignItems: "center" },
});