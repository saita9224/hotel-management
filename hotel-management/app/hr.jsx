// app/hr.jsx

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import HREmployeesTab  from "../components/HR/HREmployeesTab";
import HRAttendanceTab from "../components/HR/HRAttendanceTab";
import HRLeaveTab      from "../components/HR/HRLeaveTab";
import HRPayrollTab    from "../components/HR/HRPayrollTab";
import AddEmployeeSheet from "../components/HR/AddEmployeeSheet";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const TABS = [
  { key: "employees",  label: "Employees",  icon: "people-outline"   },
  { key: "attendance", label: "Attendance", icon: "calendar-outline" },
  { key: "leave",      label: "Leave",      icon: "umbrella-outline" },
  { key: "payroll",    label: "Payroll",    icon: "cash-outline"     },
];

export default function HRScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState("employees");
  const [showAddSheet, setShowAddSheet] = useState(false);

  const slideAnim    = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setShowAddSheet(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, bounciness: 4,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1, duration: 250, useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0, duration: 220, useNativeDriver: true,
      }),
    ]).start(() => setShowAddSheet(false));
  };

  const renderTab = () => {
    switch (activeTab) {
      case "employees":  return <HREmployeesTab />;
      case "attendance": return <HRAttendanceTab />;
      case "leave":      return <HRLeaveTab />;
      case "payroll":    return <HRPayrollTab />;
      default:           return null;
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.accent }]}>
          Human Resources
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Tab bar ── */}
      <View style={[
        styles.tabBar,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
      ]}>
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
                size={18}
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
      </View>

      {/* ── Tab content ── */}
      <View style={{ flex: 1 }}>
        {renderTab()}
      </View>

      {/* ── FAB — employees tab only ── */}
      {activeTab === "employees" && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={openSheet}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Add Employee Sheet ── */}
      {showAddSheet && (
        <>
          <TouchableWithoutFeedback onPress={closeSheet}>
            <Animated.View
              style={[styles.backdrop, { opacity: backdropAnim }]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <AddEmployeeSheet onClose={closeSheet} />
          </Animated.View>
        </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 32 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  tabBar:      { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn:      { flex: 1, alignItems: "center", paddingVertical: 10 },
  fab:         {
    position:       "absolute",
    bottom:         50,
    right:          16,
    width:          55,
    height:         55,
    borderRadius:   28,
    justifyContent: "center",
    alignItems:     "center",
    elevation:      5,
    zIndex:         5,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex:          10,
  },
  sheet: {
    position:            "absolute",
    bottom:              0,
    left:                0,
    right:               0,
    height:              SCREEN_HEIGHT * 0.92,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex:              11,
    elevation:           16,
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle:    { width: 40, height: 4, borderRadius: 2 },
});