// components/Inventory/StockCountScreen.jsx

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useInventory } from "../../context/InventoryContext";
import { useTheme } from "../../hooks/useTheme";

const formatQty = (v) => Number(v || 0).toLocaleString("en-KE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

// ── DIFFERENCE PILL ──────────────────────────────────────

const DiffPill = ({ diff }) => {
  if (diff === 0) return (
    <View style={[pill.base, { backgroundColor: "#30D15820" }]}>
      <Text style={{ color: "#30D158", fontWeight: "700", fontSize: 12 }}>✓ Match</Text>
    </View>
  );
  const over = diff > 0;
  return (
    <View style={[pill.base, { backgroundColor: over ? "#30D15820" : "#FF453A20" }]}>
      <Text style={{ color: over ? "#30D158" : "#FF453A", fontWeight: "700", fontSize: 12 }}>
        {over ? "+" : ""}{formatQty(diff)}
      </Text>
    </View>
  );
};

const pill = StyleSheet.create({
  base: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20, alignSelf: "flex-start" },
});


// ══════════════════════════════════════════════════════════
// PHASE 1 — COUNT ENTRY
// ══════════════════════════════════════════════════════════

function CountEntryPhase({ products, onSubmit, colors }) {
  const [counts, setCounts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");

  const updateCount = (id, value) =>
    setCounts((prev) => ({ ...prev, [id]: value }));

  // Only products with stock > 0
  const stockedProducts = useMemo(
    () => products.filter((p) => p.current_stock > 0),
    [products]
  );

  const filtered = useMemo(() => {
    if (!filter.trim()) return stockedProducts;
    return stockedProducts.filter((p) =>
      p.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [stockedProducts, filter]);

  const filledCount = Object.values(counts).filter((v) => v !== "" && v !== undefined).length;

  const handleSubmit = async () => {
    const entries = stockedProducts
      .map((p) => ({
        product_id: p.id,
        counted_quantity: counts[p.id] !== undefined && counts[p.id] !== ""
          ? Number(counts[p.id])
          : p.current_stock, // if not filled, assume matches system
      }))
      .filter((e) => !isNaN(e.counted_quantity) && e.counted_quantity >= 0);

    if (entries.length === 0) {
      Alert.alert("Nothing to submit", "Please enter at least one count.");
      return;
    }

    Alert.alert(
      "Submit Stock Count?",
      `You've entered ${filledCount} of ${stockedProducts.length} items. Unfilled items will be assumed to match the system.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              setSubmitting(true);
              await onSubmit(entries);
            } catch (err) {
              Alert.alert("Error", err?.message || "Submission failed.");
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item: product }) => {
    const value = counts[product.id] ?? "";
    const entered = value !== "";
    const diff = entered
      ? Number(value) - product.current_stock
      : null;

    return (
      <View style={[styles.countRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14, flex: 1 }}>
              {product.name}
            </Text>
            {entered && diff !== null && <DiffPill diff={diff} />}
          </View>
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
            {product.category}
            {"  •  System: "}
            <Text style={{ fontWeight: "600" }}>{formatQty(product.current_stock)} {product.unit}</Text>
          </Text>
        </View>

        <TextInput
          style={[
            styles.countInput,
            {
              borderColor: entered ? colors.accent : colors.border,
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          keyboardType="numeric"
          placeholder={String(product.current_stock)}
          placeholderTextColor={colors.tabBarInactive}
          value={value}
          onChangeText={(v) => updateCount(product.id, v)}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.phaseHeader}>
        <View style={[styles.stepBadge, { backgroundColor: colors.accent }]}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>STEP 1</Text>
        </View>
        <Text style={[styles.phaseTitle, { color: colors.text }]}>Physical Count</Text>
        <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 4 }}>
          Enter the actual quantity you can physically see for each item.
          Leave blank if you haven't counted it yet.
        </Text>

        <View style={styles.progressRow}>
          <Text style={{ color: colors.tabBarInactive, fontSize: 12 }}>
            {filledCount} / {stockedProducts.length} items entered
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[
              styles.progressFill,
              {
                backgroundColor: colors.accent,
                width: stockedProducts.length > 0
                  ? `${(filledCount / stockedProducts.length) * 100}%`
                  : "0%",
              },
            ]} />
          </View>
        </View>
      </View>

      {/* Search */}
      <TextInput
        style={[styles.search, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder="Search items..."
        placeholderTextColor={colors.tabBarInactive}
        value={filter}
        onChangeText={setFilter}
      />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
            No stocked items found.
          </Text>
        }
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: submitting ? colors.border : colors.accent }]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : (
            <View style={styles.btnInner}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 6 }}>
                Submit Count
              </Text>
            </View>
          )
        }
      </TouchableOpacity>
    </View>
  );
}


// ══════════════════════════════════════════════════════════
// PHASE 2 — RESULTS & APPROVAL
// ══════════════════════════════════════════════════════════

function ResultsPhase({ results, onApprove, onReject, onDone, colors }) {
  const [processing, setProcessing] = useState({});

  const discrepancies = results.filter((r) => r.difference !== 0);
  const matches = results.filter((r) => r.difference === 0);

  const handleApprove = async (id) => {
    setProcessing((p) => ({ ...p, [id]: "approving" }));
    try {
      await onApprove(id);
    } catch (err) {
      Alert.alert("Error", err?.message || "Approval failed.");
    } finally {
      setProcessing((p) => ({ ...p, [id]: null }));
    }
  };

  const handleReject = (id) => {
    Alert.prompt
      ? Alert.prompt(
          "Reject Reconciliation",
          "Add a note (optional):",
          async (notes) => {
            setProcessing((p) => ({ ...p, [id]: "rejecting" }));
            try {
              await onReject(id, notes);
            } catch (err) {
              Alert.alert("Error", err?.message || "Rejection failed.");
            } finally {
              setProcessing((p) => ({ ...p, [id]: null }));
            }
          },
          "plain-text"
        )
      : Alert.alert(
          "Reject Reconciliation",
          "This will reject the count and leave stock unchanged.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reject",
              style: "destructive",
              onPress: async () => {
                setProcessing((p) => ({ ...p, [id]: "rejecting" }));
                try {
                  await onReject(id, null);
                } catch (err) {
                  Alert.alert("Error", err?.message || "Rejection failed.");
                } finally {
                  setProcessing((p) => ({ ...p, [id]: null }));
                }
              },
            },
          ]
        );
  };

  const renderResult = (item) => {
    const isOver = item.difference > 0;
    const isMatch = item.difference === 0;
    const busy = processing[item.id];
    const approved = item.status === "APPROVED";
    const rejected = item.status === "REJECTED";
    const settled = approved || rejected;

    return (
      <View
        key={item.id}
        style={[
          styles.resultCard,
          {
            backgroundColor: colors.card,
            borderColor: isMatch
              ? "#30D15830"
              : isOver
              ? "#30D15830"
              : "#FF453A30",
            borderLeftWidth: 4,
            borderLeftColor: isMatch
              ? "#30D158"
              : isOver
              ? "#30D158"
              : "#FF453A",
          },
        ]}
      >
        {/* Product name + status */}
        <View style={styles.rowBetween}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14, flex: 1 }}>
            {item.product.name}
          </Text>
          {settled && (
            <View style={[
              pill.base,
              { backgroundColor: approved ? "#30D15820" : "#FF453A20" },
            ]}>
              <Text style={{
                color: approved ? "#30D158" : "#FF453A",
                fontWeight: "700",
                fontSize: 11,
              }}>
                {approved ? "✓ APPROVED" : "✕ REJECTED"}
              </Text>
            </View>
          )}
        </View>

        {/* Figures */}
        <View style={[styles.figuresRow, { borderColor: colors.border }]}>
          <View style={styles.figure}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>SYSTEM</Text>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>
              {formatQty(item.system_quantity)}
            </Text>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>
              {item.product.unit}
            </Text>
          </View>

          <Ionicons name="arrow-forward" size={16} color={colors.tabBarInactive} />

          <View style={styles.figure}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>COUNTED</Text>
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>
              {formatQty(item.counted_quantity)}
            </Text>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>
              {item.product.unit}
            </Text>
          </View>

          <Ionicons name="arrow-forward" size={16} color={colors.tabBarInactive} />

          <View style={styles.figure}>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>DIFF</Text>
            <Text style={{
              fontWeight: "700",
              fontSize: 15,
              color: isMatch ? "#30D158" : isOver ? "#30D158" : "#FF453A",
            }}>
              {isOver ? "+" : ""}{formatQty(item.difference)}
            </Text>
            <Text style={{ color: colors.tabBarInactive, fontSize: 11 }}>
              {item.product.unit}
            </Text>
          </View>
        </View>

        {/* What will happen on approve */}
        {!settled && !isMatch && (
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 6 }}>
            {isOver
              ? `Approving will add ${formatQty(item.difference)} ${item.product.unit} (ADJUSTMENT IN)`
              : `Approving will remove ${formatQty(Math.abs(item.difference))} ${item.product.unit} (ADJUSTMENT OUT)`
            }
          </Text>
        )}

        {/* Action buttons */}
        {!settled && (
          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#FF453A15", borderColor: "#FF453A40" }]}
              onPress={() => handleReject(item.id)}
              disabled={!!busy}
            >
              {busy === "rejecting"
                ? <ActivityIndicator size="small" color="#FF453A" />
                : <Text style={{ color: "#FF453A", fontWeight: "600", fontSize: 13 }}>Reject</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#30D15815", borderColor: "#30D15840", flex: 1, marginLeft: 8 }]}
              onPress={() => handleApprove(item.id)}
              disabled={!!busy}
            >
              {busy === "approving"
                ? <ActivityIndicator size="small" color="#30D158" />
                : (
                  <Text style={{ color: "#30D158", fontWeight: "600", fontSize: 13 }}>
                    {isMatch ? "Confirm Match" : "Approve Adjustment"}
                  </Text>
                )
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const allSettled = results.every(
    (r) => r.status === "APPROVED" || r.status === "REJECTED"
  );

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View style={styles.phaseHeader}>
        <View style={[styles.stepBadge, { backgroundColor: "#FF9F0A" }]}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>STEP 2</Text>
        </View>
        <Text style={[styles.phaseTitle, { color: colors.text }]}>Review Results</Text>

        {/* Summary pills */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryPill, { backgroundColor: "#FF453A18" }]}>
            <Text style={{ color: "#FF453A", fontWeight: "700" }}>
              {discrepancies.filter((d) => d.difference < 0).length} short
            </Text>
          </View>
          <View style={[styles.summaryPill, { backgroundColor: "#30D15818" }]}>
            <Text style={{ color: "#30D158", fontWeight: "700" }}>
              {discrepancies.filter((d) => d.difference > 0).length} over
            </Text>
          </View>
          <View style={[styles.summaryPill, { backgroundColor: "#30D15818" }]}>
            <Text style={{ color: "#30D158", fontWeight: "700" }}>
              {matches.length} match
            </Text>
          </View>
        </View>
      </View>

      {/* Discrepancies first */}
      {discrepancies.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>
            DISCREPANCIES ({discrepancies.length})
          </Text>
          {discrepancies.map(renderResult)}
        </>
      )}

      {/* Matches */}
      {matches.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.tabBarInactive, marginTop: 16 }]}>
            MATCHES ({matches.length})
          </Text>
          {matches.map(renderResult)}
        </>
      )}

      {/* Done button once all settled */}
      {allSettled && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.accent, marginTop: 16 }]}
          onPress={onDone}
        >
          <View style={styles.btnInner}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 6 }}>
              Done — Start New Count
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}


// ══════════════════════════════════════════════════════════
// ROOT COMPONENT
// ══════════════════════════════════════════════════════════

export default function StockCountScreen() {
  const { products, submitReconciliation, approveReconciliation, rejectReconciliation } = useInventory();
  const { colors } = useTheme();

  // phase: "count" | "results"
  const [phase, setPhase] = useState("count");
  const [results, setResults] = useState([]);

  const handleSubmit = async (counts) => {
    const data = await submitReconciliation(counts);
    setResults(data);
    setPhase("results");
  };

  const handleApprove = async (id) => {
    const updated = await approveReconciliation(id);
    setResults((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const handleReject = async (id, notes) => {
    const updated = await rejectReconciliation(id, notes);
    setResults((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const handleDone = () => {
    setPhase("count");
    setResults([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {phase === "count" ? (
        <CountEntryPhase
          products={products}
          onSubmit={handleSubmit}
          colors={colors}
        />
      ) : (
        <ResultsPhase
          results={results}
          onApprove={handleApprove}
          onReject={handleReject}
          onDone={handleDone}
          colors={colors}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },

  phaseHeader: { paddingVertical: 16 },
  stepBadge: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, marginBottom: 8 },
  phaseTitle: { fontSize: 20, fontWeight: "700" },

  progressRow: { marginTop: 10, gap: 6 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%", borderRadius: 2 },

  search: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, fontSize: 14, marginBottom: 10 },

  countRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  countInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 14, width: 80, textAlign: "center" },

  resultCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  figuresRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, gap: 4 },
  figure: { alignItems: "center", flex: 1 },

  actionRow: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  summaryRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  summaryPill: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },

  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  submitBtn: { position: "absolute", bottom: 16, left: 16, right: 16, padding: 14, borderRadius: 12, alignItems: "center" },
  btnInner: { flexDirection: "row", alignItems: "center" },
});