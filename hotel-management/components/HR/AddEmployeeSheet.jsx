// components/HR/AddEmployeeSheet.jsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import { useHR } from "../../context/HRContext";


// ── Role templates ─────────────────────────────────────

const ROLE_TEMPLATES = {
  Waiter: [
    "pos.open_session",
    "pos.close_session",
    "pos.create_order",
    "pos.recall_order",
    "pos.view_orders",
    "hr.self_checkin",
    "hr.request_leave",
    "hr.view_leave",
  ],
  Cashier: [
    "pos.open_session",
    "pos.close_session",
    "pos.create_order",
    "pos.recall_order",
    "pos.view_orders",
    "pos.view_cashier",
    "pos.accept_payment",
    "pos.partial_payment",
    "pos.view_payments",
    "pos.create_credit",
    "pos.settle_credit",
    "hr.self_checkin",
    "hr.request_leave",
    "hr.view_leave",
  ],
  Kitchen: [
    "pos.view_orders",
    "hr.self_checkin",
    "hr.request_leave",
    "hr.view_leave",
  ],
  Manager: [
    "pos.open_session",
    "pos.close_session",
    "pos.create_order",
    "pos.recall_order",
    "pos.view_orders",
    "pos.view_cashier",
    "pos.accept_payment",
    "pos.partial_payment",
    "pos.view_payments",
    "pos.create_credit",
    "pos.approve_credit",
    "pos.settle_credit",
    "pos.override_price",
    "pos.refund_order",
    "pos.emit_stock",
    "pos.manage_menu",
    "inventory.product.view",
    "inventory.product.create",
    "inventory.product.update",
    "inventory.stock.view",
    "inventory.stock.in",
    "inventory.stock.out",
    "inventory.stock.adjust",
    "inventory.stock.view_history",
    "inventory.stock.reconcile",
    "expenses.view",
    "expenses.create",
    "expenses.pay",
    "expenses.view_payments",
    "hr.view_contracts",
    "hr.view_attendance",
    "hr.manage_attendance",
    "hr.self_checkin",
    "hr.view_salary",
    "hr.view_leave",
    "hr.manage_leave",
    "hr.request_leave",
    "employee.view",
  ],
  Custom: [],
};

const STEPS = ["Basic Info", "Role", "Permissions", "Confirm"];


export default function AddEmployeeSheet({ onClose }) {
  const { colors } = useTheme();
  const {
    groupedPermissions,
    loadGroupedPermissions,
    createEmployee,
    loadEmployees,
  } = useHR();

  const [step, setStep]                         = useState(0);
  const [form, setForm]                         = useState({
    name:     "",
    email:    "",
    phone:    "",
    password: "",
  });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedPerms, setSelectedPerms]       = useState(new Set());
  const [saving, setSaving]                     = useState(false);
  const [permLoading, setPermLoading]           = useState(false);

  useEffect(() => {
    if (groupedPermissions.length === 0) {
      setPermLoading(true);
      loadGroupedPermissions().finally(() => setPermLoading(false));
    }
  }, []);

  const updateField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Step 0 validation ──────────────────────────────
  const validateBasicInfo = () => {
    if (!form.name.trim())
      return Alert.alert("Validation", "Name is required.");
    if (!form.email.trim() || !form.email.includes("@"))
      return Alert.alert("Validation", "Valid email is required.");
    if (!form.password || form.password.length < 6)
      return Alert.alert("Validation", "Password must be at least 6 characters.");
    setStep(1);
  };

  // ── Apply role template ────────────────────────────
  const applyTemplate = (templateName) => {
    setSelectedTemplate(templateName);
    setSelectedPerms(new Set(ROLE_TEMPLATES[templateName] ?? []));
  };

  // ── Toggle individual permission ───────────────────
  const togglePerm = (code) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  // ── Toggle entire app group ────────────────────────
  const toggleGroup = (group) => {
    const codes = group.permissions.map((p) => p.code);
    const allSelected = codes.every((c) => selectedPerms.has(c));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        codes.forEach((c) => next.delete(c));
      } else {
        codes.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  // ── Submit ─────────────────────────────────────────
  const handleCreate = async () => {
    if (selectedPerms.size === 0)
      return Alert.alert(
        "No Permissions",
        "Select at least one permission before creating."
      );

    try {
      setSaving(true);
      await createEmployee({
        name:             form.name.trim(),
        email:            form.email.trim().toLowerCase(),
        phone:            form.phone.trim() || null,
        password:         form.password,
        permission_codes: [...selectedPerms],
      });
      await loadEmployees();
      Alert.alert(
        "Employee Created",
        `${form.name} has been successfully onboarded.`,
        [{ text: "OK", onPress: onClose }]
      );
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to create employee.");
    } finally {
      setSaving(false);
    }
  };

  // ── Step indicator ─────────────────────────────────
  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {STEPS.map((label, i) => (
        <View key={label} style={styles.stepItem}>
          <View style={[
            styles.stepDot,
            { backgroundColor: i <= step ? colors.accent : colors.border },
          ]}>
            {i < step ? (
              <Ionicons name="checkmark" size={12} color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                {i + 1}
              </Text>
            )}
          </View>
          <Text style={{
            color:      i === step ? colors.accent : colors.tabBarInactive,
            fontSize:   10,
            marginTop:  4,
            fontWeight: i === step ? "700" : "400",
          }}>
            {label}
          </Text>
          {i < STEPS.length - 1 && (
            <View style={[
              styles.stepLine,
              { backgroundColor: i < step ? colors.accent : colors.border },
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  // ── STEP 0: Basic Info ─────────────────────────────
  const renderBasicInfo = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Employee Details
      </Text>
      <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginBottom: 20 }}>
        Enter the new employee's basic information.
      </Text>

      <Text style={[styles.label, { color: colors.tabBarInactive }]}>Full Name</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
        placeholder="e.g. Jane Kamau"
        placeholderTextColor={colors.tabBarInactive}
        value={form.name}
        onChangeText={(v) => updateField("name", v)}
        returnKeyType="next"
      />

      <Text style={[styles.label, { color: colors.tabBarInactive }]}>Email</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
        placeholder="jane@hoppers.co.ke"
        placeholderTextColor={colors.tabBarInactive}
        value={form.email}
        onChangeText={(v) => updateField("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
      />

      <Text style={[styles.label, { color: colors.tabBarInactive }]}>
        Phone <Text style={{ fontSize: 11 }}>(optional)</Text>
      </Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
        placeholder="+254 700 000 000"
        placeholderTextColor={colors.tabBarInactive}
        value={form.phone}
        onChangeText={(v) => updateField("phone", v)}
        keyboardType="phone-pad"
        returnKeyType="next"
      />

      <Text style={[styles.label, { color: colors.tabBarInactive }]}>Password</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
        placeholder="Min. 6 characters"
        placeholderTextColor={colors.tabBarInactive}
        value={form.password}
        onChangeText={(v) => updateField("password", v)}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={validateBasicInfo}
      />

      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: colors.accent, marginTop: 24 }]}
        onPress={validateBasicInfo}
      >
        <Text style={styles.nextBtnText}>Next — Choose Role</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </ScrollView>
  );

  // ── STEP 1: Role Template ──────────────────────────
  const renderRoleTemplate = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Role Template
      </Text>
      <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginBottom: 20 }}>
        Pick a starting template. You can fine-tune permissions in the next step.
      </Text>

      {Object.keys(ROLE_TEMPLATES).map((templateName) => {
        const isSelected = selectedTemplate === templateName;
        const count      = ROLE_TEMPLATES[templateName].length;
        return (
          <TouchableOpacity
            key={templateName}
            style={[
              styles.templateCard,
              {
                borderColor:     isSelected ? colors.accent : colors.border,
                backgroundColor: isSelected ? colors.accent + "12" : colors.background,
              },
            ]}
            onPress={() => applyTemplate(templateName)}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                color:      isSelected ? colors.accent : colors.text,
                fontWeight: "700",
                fontSize:   15,
              }}>
                {templateName}
              </Text>
              <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 4 }}>
                {templateName === "Custom"
                  ? "Start with no permissions — select manually"
                  : `${count} permissions pre-selected`}
              </Text>
            </View>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            )}
          </TouchableOpacity>
        );
      })}

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: colors.border }]}
          onPress={() => setStep(0)}
        >
          <Ionicons name="arrow-back" size={16} color={colors.tabBarInactive} />
          <Text style={{ color: colors.tabBarInactive, fontWeight: "600", marginLeft: 6 }}>
            Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextBtn,
            {
              backgroundColor: selectedTemplate ? colors.accent : colors.border,
              flex:             1,
              marginLeft:       10,
            },
          ]}
          onPress={() => selectedTemplate && setStep(2)}
          disabled={!selectedTemplate}
        >
          <Text style={styles.nextBtnText}>Next — Permissions</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── STEP 2: Permissions ────────────────────────────
  const renderPermissions = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Fine-tune Permissions
      </Text>
      <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginBottom: 8 }}>
        {selectedPerms.size} permissions selected. Toggle to customise.
      </Text>

      {permLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        groupedPermissions.map((group) => {
          const groupCodes   = group.permissions.map((p) => p.code);
          const allSelected  = groupCodes.every((c) => selectedPerms.has(c));
          const someSelected = groupCodes.some((c) => selectedPerms.has(c));

          return (
            <View
              key={group.app}
              style={[styles.groupCard, { borderColor: colors.border, backgroundColor: colors.background }]}
            >
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(group)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                    {group.label}
                  </Text>
                  <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginTop: 2 }}>
                    {groupCodes.filter((c) => selectedPerms.has(c)).length} / {groupCodes.length} selected
                  </Text>
                </View>
                <View style={[
                  styles.groupToggle,
                  {
                    backgroundColor: allSelected
                      ? colors.accent
                      : someSelected
                        ? colors.accent + "40"
                        : colors.border,
                  },
                ]}>
                  {allSelected && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              {group.permissions.map((perm) => {
                const isOn = selectedPerms.has(perm.code);
                return (
                  <View
                    key={perm.code}
                    style={[styles.permRow, { borderTopColor: colors.border }]}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
                        {perm.display_name}
                      </Text>
                      <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginTop: 2 }}>
                        {perm.description}
                      </Text>
                    </View>
                    <Switch
                      value={isOn}
                      onValueChange={() => togglePerm(perm.code)}
                      trackColor={{ false: colors.border, true: colors.accent + "80" }}
                      thumbColor={isOn ? colors.accent : colors.tabBarInactive}
                    />
                  </View>
                );
              })}
            </View>
          );
        })
      )}

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: colors.border }]}
          onPress={() => setStep(1)}
        >
          <Ionicons name="arrow-back" size={16} color={colors.tabBarInactive} />
          <Text style={{ color: colors.tabBarInactive, fontWeight: "600", marginLeft: 6 }}>
            Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.accent, flex: 1, marginLeft: 10 }]}
          onPress={() => setStep(3)}
        >
          <Text style={styles.nextBtnText}>Review & Confirm</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── STEP 3: Confirm ────────────────────────────────
  const renderConfirm = () => {
    const selectedByGroup = groupedPermissions
      .map((group) => ({
        label:    group.label,
        selected: group.permissions.filter((p) => selectedPerms.has(p.code)),
      }))
      .filter((g) => g.selected.length > 0);

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          Confirm & Create
        </Text>

        <View style={[styles.confirmCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.accent + "20" }]}>
            <Text style={{ color: colors.accent, fontSize: 22, fontWeight: "700" }}>
              {form.name.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ marginTop: 12, alignItems: "center" }}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>
              {form.name}
            </Text>
            <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 4 }}>
              {form.email}
            </Text>
            {form.phone ? (
              <Text style={{ color: colors.tabBarInactive, fontSize: 13, marginTop: 2 }}>
                {form.phone}
              </Text>
            ) : null}
            <View style={[styles.templateBadge, { backgroundColor: colors.accent + "20" }]}>
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 12 }}>
                {selectedTemplate}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.tabBarInactive }]}>
          PERMISSIONS ({selectedPerms.size} total)
        </Text>

        {selectedByGroup.map((group) => (
          <View
            key={group.label}
            style={[styles.summaryGroup, { borderColor: colors.border, backgroundColor: colors.background }]}
          >
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: 8 }}>
              {group.label}
            </Text>
            {group.selected.map((p) => (
              <View key={p.code} style={styles.summaryPermRow}>
                <Ionicons name="checkmark-circle" size={14} color="#30D158" />
                <Text style={{ color: colors.tabBarInactive, fontSize: 12, marginLeft: 6 }}>
                  {p.display_name}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={() => setStep(2)}
          >
            <Ionicons name="arrow-back" size={16} color={colors.tabBarInactive} />
            <Text style={{ color: colors.tabBarInactive, fontWeight: "600", marginLeft: 6 }}>
              Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.nextBtn,
              {
                backgroundColor: saving ? colors.border : "#30D158",
                flex:             1,
                marginLeft:       10,
              },
            ]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={[styles.nextBtnText, { marginLeft: 8 }]}>
                  Create Employee
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ── ROOT ───────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 80}
    >
      <View style={{ flex: 1, paddingHorizontal: 16 }}>

        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Add Employee
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.tabBarInactive} />
          </TouchableOpacity>
        </View>

        {/* Step indicator */}
        <StepIndicator />

        {/* Step content */}
        <View style={{ flex: 1, marginTop: 16 }}>
          {step === 0 && renderBasicInfo()}
          {step === 1 && renderRoleTemplate()}
          {step === 2 && renderPermissions()}
          {step === 3 && renderConfirm()}
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheetHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  sheetTitle:     { fontSize: 18, fontWeight: "700" },

  // Step indicator
  stepRow:        { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginTop: 12, paddingHorizontal: 8 },
  stepItem:       { alignItems: "center", flex: 1, position: "relative" },
  stepDot:        { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  stepLine:       { position: "absolute", top: 12, left: "50%", right: "-50%", height: 2, zIndex: -1 },

  // Step content
  stepTitle:      { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  label:          { fontSize: 13, marginTop: 12, marginBottom: 4 },
  input:          { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },

  // Navigation
  navRow:         { flexDirection: "row", alignItems: "center", marginTop: 24 },
  backBtn:        { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  nextBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, paddingHorizontal: 16, borderRadius: 10, gap: 8 },
  nextBtnText:    { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Role templates
  templateCard:   { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center" },

  // Permission groups
  groupCard:      { borderWidth: 1, borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  groupHeader:    { flexDirection: "row", alignItems: "center", padding: 14 },
  groupToggle:    { width: 26, height: 26, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  permRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },

  // Confirm step
  confirmCard:    { borderWidth: 1, borderRadius: 12, padding: 20, alignItems: "center", marginBottom: 20 },
  avatarCircle:   { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  templateBadge:  { marginTop: 8, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  sectionLabel:   { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  summaryGroup:   { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  summaryPermRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
});