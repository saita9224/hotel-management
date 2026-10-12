// components/POS/CloseSessionModal.jsx

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../hooks/useTheme";
import { usePOS } from "../../context/POSContext";

const formatKES = (v) =>
  Number(v || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function CloseSessionModal({ visible, onClose }) {
  const { colors } = useTheme();
  const { session, closeSession, getSummary } = usePOS();
  const [closingCash, setClosingCash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { totalSales } = getSummary();

  const handleCloseModal = () => {
    if (submitting) return;
    setClosingCash("");
    onClose();
  };

  const handleClose = async () => {
    const cash = Number(closingCash || 0);
    if (cash < 0) return Alert.alert("Invalid", "Closing cash cannot be negative.");

    Alert.alert(
      "Close Session?",
      `You are about to close this session with KES ${formatKES(cash)} in closing cash.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Session",
          style: "destructive",
          onPress: async () => {
            try {
              setSubmitting(true);
              await closeSession(cash);
              setClosingCash("");
              onClose();
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to close session.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (!session) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCloseModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={handleCloseModal}>
            <View style={styles.backdropTouchArea} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Close Session</Text>
              <TouchableOpacity onPress={handleCloseModal} disabled={submitting}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            {/* Session summary */}
            <View style={[styles.summaryBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Opening Cash</Text>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  KES {formatKES(session.opening_cash)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Total Sales</Text>
                <Text style={{ color: "#30D158", fontWeight: "600" }}>
                  KES {formatKES(totalSales)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.tabBarInactive, fontSize: 13 }}>Opened At</Text>
                <Text style={{ color: colors.text, fontSize: 13 }}>
                  {new Date(session.opened_at).toLocaleString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>Closing Cash Count (KES)</Text>
            <TextInput
              autoFocus
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="0.00"
              placeholderTextColor={colors.tabBarInactive}
              keyboardType="numeric"
              value={closingCash}
              onChangeText={setClosingCash}
              returnKeyType="done"
              onSubmitEditing={handleClose}
            />

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: submitting ? colors.border : "#FF453A" }]}
              onPress={handleClose}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  Close Session
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:           { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  scrollContainer:   { flexGrow: 1, justifyContent: "flex-end" },
  backdropTouchArea: { flex: 1, minHeight: 60 },
  sheet:             { paddingHorizontal: 24, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 34 : 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1 },
  handleRow:         { alignItems: "center", paddingBottom: 12 },
  handle:            { width: 40, height: 4, borderRadius: 2 },
  header:            { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title:             { fontSize: 18, fontWeight: "700" },
  summaryBox:        { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 18, gap: 10 },
  summaryRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label:             { fontSize: 13, marginBottom: 6 },
  input:             { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20 },
  btn:               { padding: 14, borderRadius: 10, alignItems: "center" },
});