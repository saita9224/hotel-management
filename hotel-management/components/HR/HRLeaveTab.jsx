// components/HR/HRLeaveTab.jsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useHR } from "../../context/HRContext";

const STATUS_COLORS = {
  PENDING:  "#FF9F0A",
  APPROVED: "#30D158",
  REJECTED: "#FF453A",
};

const LEAVE_TYPES = ["SICK", "ANNUAL", "UNPAID", "MATERNITY", "PATERNITY"];

export default function HRLeaveTab() {
  const { colors } = useTheme();
  const {
    leaveRequests,
    myLeaveRequests,
    loadLeaveRequests,
    loadMyLeaveRequests,
    requestLeave,
    reviewLeave,
    loading,
  } = useHR();

  const [viewMode, setViewMode]             = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal]   = useState(false);
  const [selectedLeave, setSelectedLeave]       = useState(null);
  const [requestForm, setRequestForm]           = useState({
    leave_type:  "ANNUAL",
    start_date:  "",
    end_date:    "",
    reason:      "",
  });
  const [reviewForm, setReviewForm] = useState({
    status:       "APPROVED",
    review_notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLeaveRequests();
    loadMyLeaveRequests();
  }, []);

  const handleRequestLeave = async () => {
    if (!requestForm.start_date || !requestForm.end_date)
      return Alert.alert("Validation", "Start and end dates are required.");

    try {
      setSaving(true);
      await requestLeave(requestForm);
      setShowRequestModal(false);
      loadMyLeaveRequests();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to submit leave request.");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewLeave = async () => {
    try {
      setSaving(true);
      await reviewLeave({
        leave_request_id: selectedLeave.id,
        status:           reviewForm.status,
        review_notes:     reviewForm.review_notes || null,
      });
      setShowReviewModal(false);
      loadLeaveRequests();
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to review leave request.");
    } finally {
      setSaving(false);
    }
  };

  const openReview = (leave) => {
    setSelectedLeave(leave);
    setReviewForm({ status: "APPROVED", review_notes: "" });
    setShowReviewModal(true);
  };

  const currentData = viewMode === "all" ? leaveRequests : myLeaveRequests;

  const renderLeaveCard = ({ item }) => {
    const statusColor = STATUS_COLORS[item.status] ?? colors.tabBarInactive;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
              {item.employee?.name ?? "Me"}
            </Text>
            <Text style={{ color: colors.accent, fontSize: 13, marginTop: 2 }}>
              {item.leave_type.replace("_", " ")}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={{ color: statusColor, fontWeight: "700", fontSize: 11 }}>
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 8 }}>
          {item.start_date} → {item.end_date}
          {"  •  "}{item.total_days} {item.total_days === 1 ? "day" : "days"}
        </Text>

        {item.reason ? (
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 4 }}>
            {item.reason}
          </Text>
        ) : null}

        {item.status === "PENDING" && viewMode === "all" && (
          <TouchableOpacity
            style={[styles.reviewBtn, { borderColor: colors.accent }]}
            onPress={() => openReview(item)}
          >
            <Text style={{ color: colors.accent, fontWeight: "600", fontSize: 13 }}>
              Review
            </Text>
          </TouchableOpacity>
        )}

        {item.review_notes ? (
          <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 4, fontStyle: "italic" }}>
            Note: {item.review_notes}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>

      {/* ── Toggle + Request button ── */}
      <View style={[styles.topRow, { borderBottomColor: colors.border }]}>
        {["all", "mine"].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.toggleBtn,
              viewMode === mode && { borderBottomWidth: 2, borderBottomColor: colors.accent },
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={{
              color:      viewMode === mode ? colors.accent : colors.tabBarInactive,
              fontWeight: viewMode === mode ? "700" : "400",
              fontSize:   14,
            }}>
              {mode === "all" ? "All Requests" : "My Requests"}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.requestBtn, { backgroundColor: colors.accent }]}
          onPress={() => setShowRequestModal(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12, marginLeft: 4 }}>
            Request
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderLeaveCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={
            <Text style={{ color: colors.tabBarInactive, textAlign: "center", marginTop: 40 }}>
              No leave requests found.
            </Text>
          }
        />
      )}

      {/* ── Request Leave Modal ── */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Request Leave</Text>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Leave Type</Text>
              <View style={styles.pillRow}>
                {LEAVE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: requestForm.leave_type === t ? colors.accent : colors.background,
                        borderColor:     requestForm.leave_type === t ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setRequestForm((p) => ({ ...p, leave_type: t }))}
                  >
                    <Text style={{ color: requestForm.leave_type === t ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.tabBarInactive }]}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={requestForm.start_date}
                onChangeText={(v) => setRequestForm((p) => ({ ...p, start_date: v }))}
                placeholder="2026-04-01"
                placeholderTextColor={colors.tabBarInactive}
              />

              <Text style={[styles.label, { color: colors.tabBarInactive }]}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={requestForm.end_date}
                onChangeText={(v) => setRequestForm((p) => ({ ...p, end_date: v }))}
                placeholder="2026-04-05"
                placeholderTextColor={colors.tabBarInactive}
              />

              <Text style={[styles.label, { color: colors.tabBarInactive }]}>
                Reason <Text style={{ fontSize: 11 }}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, minHeight: 60, textAlignVertical: "top" }]}
                value={requestForm.reason}
                onChangeText={(v) => setRequestForm((p) => ({ ...p, reason: v }))}
                placeholder="Reason for leave..."
                placeholderTextColor={colors.tabBarInactive}
                multiline
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
                onPress={handleRequestLeave}
                disabled={saving}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  {saving ? "Submitting..." : "Submit Request"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Review Leave Modal ── */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Review Leave</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={22} color={colors.tabBarInactive} />
              </TouchableOpacity>
            </View>

            {selectedLeave && (
              <View style={[styles.leaveInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {selectedLeave.employee?.name}
                </Text>
                <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 4 }}>
                  {selectedLeave.leave_type} • {selectedLeave.start_date} → {selectedLeave.end_date}
                </Text>
                {selectedLeave.reason ? (
                  <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 4 }}>
                    {selectedLeave.reason}
                  </Text>
                ) : null}
              </View>
            )}

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>Decision</Text>
            <View style={styles.pillRow}>
              {["APPROVED", "REJECTED"].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: reviewForm.status === s ? STATUS_COLORS[s] : colors.background,
                      borderColor:     reviewForm.status === s ? STATUS_COLORS[s] : colors.border,
                    },
                  ]}
                  onPress={() => setReviewForm((p) => ({ ...p, status: s }))}
                >
                  <Text style={{ color: reviewForm.status === s ? "#fff" : colors.text, fontWeight: "600" }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.tabBarInactive }]}>
              Notes <Text style={{ fontSize: 11 }}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, minHeight: 60, textAlignVertical: "top" }]}
              value={reviewForm.review_notes}
              onChangeText={(v) => setReviewForm((p) => ({ ...p, review_notes: v }))}
              placeholder="Any notes for the employee..."
              placeholderTextColor={colors.tabBarInactive}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.accent }]}
              onPress={handleReviewLeave}
              disabled={saving}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                {saving ? "Saving..." : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 1 },
  toggleBtn:    { paddingVertical: 12, marginRight: 20 },
  requestBtn:   { flexDirection: "row", alignItems: "center", marginLeft: "auto", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  card:         { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10 },
  rowBetween:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statusBadge:  { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
  reviewBtn:    { marginTop: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%" },
  modalHeader:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle:   { fontSize: 18, fontWeight: "700" },
  leaveInfo:    { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  label:        { fontSize: 13, marginTop: 12, marginBottom: 4 },
  input:        { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  pillRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pill:         { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  saveBtn:      { marginTop: 24, padding: 13, borderRadius: 10, alignItems: "center", marginBottom: 32 },
});