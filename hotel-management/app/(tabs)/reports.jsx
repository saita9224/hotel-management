// app/(tabs)/reports.jsx

import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, TextInput, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

import SalesReportTab      from "../../components/Reports/SalesReportTab";
import ProductsReportTab   from "../../components/Reports/ProductsReportTab";
import ExpensesReportTab   from "../../components/Reports/ExpensesReportTab";
import InventoryReportTab  from "../../components/Reports/InventoryReportTab";
import PayrollReportTab    from "../../components/Reports/PayrollReportTab";
import AttendanceReportTab from "../../components/Reports/AttendanceReportTab";
import CreditsReportTab    from "../../components/Reports/CreditsReportTab";

const TABS = [
  { key: "sales",      label: "Sales",      icon: "trending-up-outline" },
  { key: "products",   label: "Products",   icon: "cube-outline"        },
  { key: "expenses",   label: "Expenses",   icon: "receipt-outline"     },
  { key: "inventory",  label: "Inventory",  icon: "layers-outline"      },
  { key: "payroll",    label: "Payroll",    icon: "cash-outline"        },
  { key: "attendance", label: "Attendance", icon: "calendar-outline"    },
  { key: "credits",    label: "Credits",    icon: "card-outline"        },
];

const MONTH_TABS = new Set(["payroll", "attendance"]);

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const toDateStr = (d) => d.toISOString().split("T")[0];

const RANGES = [
  { key: "today",     label: "Today"      },
  { key: "week",      label: "This Week"  },
  { key: "month",     label: "This Month" },
  { key: "lastmonth", label: "Last Month" },
  { key: "custom",    label: "Custom"     },
];

function getRange(key) {
  const now   = new Date();
  const today = toDateStr(now);

  if (key === "today") return { start: today, end: today };

  if (key === "week") {
    const day  = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon  = new Date(new Date().setDate(diff));
    return { start: toDateStr(mon), end: today };
  }

  if (key === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toDateStr(start), end: today };
  }

  if (key === "lastmonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: toDateStr(start), end: toDateStr(end) };
  }

  return null;
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const now = new Date();

  const [activeTab,   setActiveTab]   = useState("sales");
  const [activeRange, setActiveRange] = useState("month");
  const [startDate,   setStartDate]   = useState(
    () => toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  );
  const [endDate,     setEndDate]     = useState(() => toDateStr(now));
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth() + 1);

  const isMonthTab = MONTH_TABS.has(activeTab);

  const selectRange = (key) => {
    setActiveRange(key);
    if (key === "custom") {
      setShowCustom(true);
    } else {
      const range = getRange(key);
      if (range) {
        setStartDate(range.start);
        setEndDate(range.end);
      }
    }
  };

  const applyCustom = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      setStartDate(customStart);
      setEndDate(customEnd);
      setShowCustom(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "sales":      return <SalesReportTab      startDate={startDate} endDate={endDate} />;
      case "products":   return <ProductsReportTab   startDate={startDate} endDate={endDate} />;
      case "expenses":   return <ExpensesReportTab   startDate={startDate} endDate={endDate} />;
      case "inventory":  return <InventoryReportTab  startDate={startDate} endDate={endDate} />;
      case "payroll":    return <PayrollReportTab    year={year} month={month} />;
      case "attendance": return <AttendanceReportTab year={year} month={month} />;
      case "credits":    return <CreditsReportTab />;
      default:           return null;
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Tab bar ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabBtn,
                active && { borderBottomWidth: 2, borderBottomColor: colors.accent },
              ]}
              onPress={() => setActiveTab(t.key)}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={active ? colors.accent : colors.tabBarInactive}
              />
              <Text style={{
                color:      active ? colors.accent : colors.tabBarInactive,
                fontWeight: active ? "700" : "400",
                fontSize:   11,
                marginTop:  3,
              }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Date controls ── */}
      {isMonthTab ? (
        <View style={[styles.monthPicker, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={prevMonth}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
            {MONTHS[month - 1]} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth}>
            <Ionicons name="chevron-forward" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      ) : activeTab !== "credits" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.rangeBar, { borderBottomColor: colors.border }]}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: "center" }}
        >
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.rangePill,
                {
                  backgroundColor: activeRange === r.key ? colors.accent : colors.background,
                  borderColor:     activeRange === r.key ? colors.accent : colors.border,
                },
              ]}
              onPress={() => selectRange(r.key)}
            >
              <Text style={{
                color:      activeRange === r.key ? "#fff" : colors.tabBarInactive,
                fontSize:   12,
                fontWeight: activeRange === r.key ? "700" : "400",
              }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={{ color: colors.tabBarInactive, fontSize: 11, marginLeft: 4 }}>
            {startDate} → {endDate}
          </Text>
        </ScrollView>
      ) : null}

      {/* ── Tab content ── */}
      <View style={{ flex: 1 }}>
        {renderTab()}
      </View>

      {/* ── Custom date modal ── */}
      <Modal
        visible={showCustom}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustom(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Custom Date Range
            </Text>

            <Text style={[styles.modalLabel, { color: colors.tabBarInactive }]}>
              Start Date (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.modalInput, {
                borderColor:     colors.border,
                color:           colors.text,
                backgroundColor: colors.background,
              }]}
              value={customStart}
              onChangeText={setCustomStart}
              placeholder="2026-03-01"
              placeholderTextColor={colors.tabBarInactive}
            />

            <Text style={[styles.modalLabel, { color: colors.tabBarInactive }]}>
              End Date (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.modalInput, {
                borderColor:     colors.border,
                color:           colors.text,
                backgroundColor: colors.background,
              }]}
              value={customEnd}
              onChangeText={setCustomEnd}
              placeholder="2026-03-22"
              placeholderTextColor={colors.tabBarInactive}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowCustom(false)}
              >
                <Text style={{ color: colors.tabBarInactive, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, {
                  backgroundColor: colors.accent,
                  borderColor:     colors.accent,
                  flex:            1,
                }]}
                onPress={applyCustom}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  tabBar:      { borderBottomWidth: 1, maxHeight: 60 },
  tabBtn:      { alignItems: "center", paddingVertical: 10, paddingHorizontal: 12 },
  rangeBar:    { borderBottomWidth: 1, maxHeight: 48 },
  rangePill:   { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  monthPicker: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               20,
    paddingVertical:   12,
    borderBottomWidth: 1,
  },
  modalOverlay: {
    flex:            1,
    justifyContent:  "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              24,
  },
  modalTitle:   { fontSize: 17, fontWeight: "700", marginBottom: 16 },
  modalLabel:   { fontSize: 13, marginTop: 12, marginBottom: 4 },
  modalInput:   { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 24 },
  modalBtn:     {
    flex:            1,
    paddingVertical: 13,
    borderRadius:    10,
    borderWidth:     1,
    alignItems:      "center",
  },
});