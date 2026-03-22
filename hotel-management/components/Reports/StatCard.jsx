// components/Reports/StatCard.jsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";

export default function StatCard({
  label,
  value,
  icon,
  color,
  subtitle = null,
}) {
  const { colors } = useTheme();
  const cardColor  = color ?? colors.accent;

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}>
      <View style={[styles.iconBox, { backgroundColor: cardColor + "20" }]}>
        <Ionicons name={icon} size={20} color={cardColor} />
      </View>
      <Text
        style={[styles.value, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.tabBarInactive }]}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: cardColor }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card:     {
    flex:          1,
    borderWidth:   1,
    borderRadius:  12,
    padding:       12,
    alignItems:    "center",
    minWidth:      80,
  },
  iconBox:  {
    width:         36,
    height:        36,
    borderRadius:  10,
    justifyContent: "center",
    alignItems:    "center",
    marginBottom:  8,
  },
  value:    { fontSize: 15, fontWeight: "700", textAlign: "center" },
  label:    { fontSize: 11, marginTop: 4, textAlign: "center" },
  subtitle: { fontSize: 11, fontWeight: "600", marginTop: 2, textAlign: "center" },
});