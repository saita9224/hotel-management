// menu-modal.jsx
// Two-level navigation drawer: collapsible groups -> indented sub-items.
// - Touch targets >= 44px (WCAG 2.5.8 floor is 24px)
// - Active item gets a second signal: accent edge bar + bold accent label
//   on top of the tinted background
// - Collapse/expand marker (chevron) lives on the parent row

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Appearance,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";

const NAV_GROUPS = [
  {
    id: "business",
    label: "Business",
    icon: "business-outline",
    items: [
      { label: "Business Profile", icon: "id-card-outline", route: "/business-profile" },
      { label: "Users & Roles", icon: "people-outline", soon: true },
      { label: "Menu Items", icon: "restaurant-outline", route: "/menu-items" },
      { label: "Recipes", icon: "nutrition-outline", route: "/recipes" },
      { label: "Tables", icon: "grid-outline", soon: true },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "layers-outline",
    items: [
      { label: "HR", icon: "people-circle-outline", route: "/hr" },
      { label: "Sync & Storage", icon: "cloud-upload-outline", soon: true },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: "person-circle-outline",
    items: [
      { label: "Security", icon: "shield-checkmark-outline", soon: true },
      { label: "Theme", icon: "contrast-outline", action: "theme" },
      { label: "About", icon: "information-circle-outline", route: "/about" },
    ],
  },
];

export default function MenuModal() {
  const { logout, business } = useAuth();
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [expanded, setExpanded] = useState({
    business: true,
    operations: true,
    account: true,
  });

  const toggleGroup = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const isActive = (route) =>
    Boolean(route) && (pathname === route || pathname.startsWith(`${route}/`));

  const handleItem = async (item) => {
    if (item.soon) return;
    if (item.action === "theme") {
      Appearance.setColorScheme(scheme === "dark" ? "light" : "dark");
      return;
    }
    if (item.route) router.push(item.route);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const renderSubItem = (item) => {
    const active = isActive(item.route);
    const disabled = Boolean(item.soon);
    return (
      <TouchableOpacity
        key={item.label}
        style={[
          styles.subItem,
          active && { backgroundColor: colors.accentSoft || "rgba(0,122,255,0.08)" },
        ]}
        onPress={() => handleItem(item)}
        disabled={disabled}
        accessibilityRole="link"
        accessibilityLabel={item.label}
        accessibilityState={{ disabled }}
      >
        {active && (
          <View style={[styles.activeBar, { backgroundColor: colors.accent }]} />
        )}
        <Ionicons
          name={item.icon}
          size={18}
          color={active ? colors.accent : colors.tabBarInactive}
          style={styles.subIcon}
        />
        <Text
          style={[
            styles.subLabel,
            { color: active ? colors.accent : colors.text },
            active && styles.subLabelActive,
            disabled && styles.disabled,
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.action === "theme" && (
          <Text style={[styles.meta, { color: colors.tabBarInactive }]}>
            {scheme === "dark" ? "Dark" : "Light"}
          </Text>
        )}
        {item.soon && (
          <View style={[styles.soonBadge, { borderColor: colors.border }]}>
            <Text style={[styles.soonText, { color: colors.tabBarInactive }]}>
              Soon
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Heading */}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.heading, { color: colors.text }]}>Menu</Text>
          {!!business?.name && (
            <Text
              style={[styles.businessName, { color: colors.tabBarInactive }]}
              numberOfLines={1}
            >
              {business.name}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {NAV_GROUPS.map((group) => {
          const open = Boolean(expanded[group.id]);
          return (
            <View key={group.id} style={styles.group}>
              {/* Group parent row — carries the collapse marker */}
              <TouchableOpacity
                style={styles.groupRow}
                onPress={() => toggleGroup(group.id)}
                accessibilityRole="button"
                accessibilityLabel={`${group.label} section`}
                accessibilityState={{ expanded: open }}
              >
                <Ionicons
                  name={group.icon}
                  size={20}
                  color={colors.accent}
                  style={styles.groupIcon}
                />
                <Text style={[styles.groupLabel, { color: colors.text }]}>
                  {group.label}
                </Text>
                <Ionicons
                  name={open ? "chevron-down" : "chevron-forward"}
                  size={18}
                  color={colors.tabBarInactive}
                />
              </TouchableOpacity>

              {open && (
                <View style={styles.subList}>{group.items.map(renderSubItem)}</View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Logout */}
      <TouchableOpacity
        style={[
          styles.logout,
          { borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
        ]}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Logout"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.accent} />
        <Text style={[styles.logoutText, { color: colors.accent }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.25)",
  },
  headerTextWrap: { flex: 1 },
  heading: { fontSize: 22, fontWeight: "800" },
  businessName: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 6 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },
  group: { marginTop: 8 },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 20,
    gap: 12,
  },
  groupIcon: { width: 24, textAlign: "center" },
  groupLabel: { flex: 1, fontSize: 16, fontWeight: "700" },
  subList: { paddingLeft: 20 },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingLeft: 36, // sub-items align under their parent label
    paddingRight: 20,
    gap: 12,
    borderRadius: 10,
    marginHorizontal: 12,
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  subIcon: { width: 22, textAlign: "center" },
  subLabel: { flex: 1, fontSize: 15 },
  subLabelActive: { fontWeight: "700" },
  disabled: { opacity: 0.55 },
  meta: { fontSize: 13, fontWeight: "600" },
  soonBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  soonText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 64,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutText: { fontSize: 16, fontWeight: "700" },
});
