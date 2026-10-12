// components/POS/OpenSessionModal.jsx

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

export default function OpenSessionModal({ visible, onClose, onSuccess }) {
  const { colors } = useTheme();
  const { openSession } = usePOS();
  const [openingCash, setOpeningCash] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setOpeningCash("");
    onClose();
  };

  const handleOpen = async () => {
    const cash = Number(openingCash || 0);
    if (cash < 0) return Alert.alert("Invalid", "Opening cash cannot be negative.");

    try {
      setSubmitting(true);
      const newSession = await openSession(cash);
      setOpeningCash("");
      onClose();
      onSuccess?.(newSession);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to open session.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
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
          <TouchableWithoutFeedback onPress={handleClose}>
            <View style={styles.backdropTouchArea} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Open POS Session</Text>
              <TouchableOpacity onPress={handleClose} disabled={submitting}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
              Count your starting cash float and enter it below before opening the session.
            </Text>

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>Opening Cash (KES)</Text>
            <TextInput
              autoFocus
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder="0.00"
              placeholderTextColor={colors.tabBarInactive}
              keyboardType="numeric"
              value={openingCash}
              onChangeText={setOpeningCash}
              returnKeyType="done"
              onSubmitEditing={handleOpen}
            />

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: submitting ? colors.border : colors.accent }]}
              onPress={handleOpen}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  Open Session
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
  label:             { fontSize: 13, marginBottom: 6 },
  input:             { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20 },
  btn:               { padding: 14, borderRadius: 10, alignItems: "center" },
});