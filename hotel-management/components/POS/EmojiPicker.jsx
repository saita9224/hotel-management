// components/POS/EmojiPicker.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useTheme } from "../../hooks/useTheme";

const CATEGORIES = [
  {
    label: "Food",
    emojis: ["🍕","🍔","🌮","🌯","🍣","🍜","🍝","🍛","🍗","🥩","🍖",
              "🥪","🥗","🍱","🧆","🥘","🫕","🍲","🥚","🧀","🥓","🍟"],
  },
  {
    label: "Drinks",
    emojis: ["☕","🍵","🧃","🥤","🍺","🍻","🥂","🍷","🍸","🧋","🍹",
              "🥛","💧","🫖","🍶","🧉"],
  },
  {
    label: "Snacks",
    emojis: ["🍰","🎂","🧁","🍩","🍪","🍫","🍬","🍭","🍦","🍧","🍨",
              "🥐","🥖","🫓","🥨","🧇","🥞","🧈"],
  },
  {
    label: "Services",
    emojis: ["💇","💆","💅","🧖","✂️","🪒","🛁","🪥","💊","💉","🩺",
              "🔧","🪛","🔨","🪚","🧰","🖨️","📱","💻","🖥️"],
  },
  {
    label: "Retail",
    emojis: ["👕","👗","👟","👠","👒","🎒","👜","💍","⌚","🕶️","🧴",
              "🪞","🛒","📦","🧺","🪴","🕯️","🖼️","🪑","🛋️"],
  },
  {
    label: "Other",
    emojis: ["⭐","🔥","💎","🎯","🎁","🏷️","📋","📌","✅","💼","🏪",
              "🏬","🚗","✈️","🌍","🎵","📸","🎮","⚽","🏋️"],
  },
];

export default function EmojiPicker({ selected, onSelect }) {
  const { colors } = useTheme();
  const [activeCategory, setActiveCategory] = useState("Food");
  const [custom, setCustom] = useState("");

  const currentEmojis =
    CATEGORIES.find((c) => c.label === activeCategory)?.emojis ?? [];

  return (
    <View style={styles.root}>
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.label}
            style={[
              styles.categoryTab,
              {
                backgroundColor:
                  activeCategory === c.label
                    ? colors.accent
                    : colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setActiveCategory(c.label)}
          >
            <Text
              style={{
                color:
                  activeCategory === c.label ? "#fff" : colors.tabBarInactive,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Emoji grid */}
      <View style={styles.grid}>
        {currentEmojis.map((e) => (
          <TouchableOpacity
            key={e}
            style={[
              styles.emojiBtn,
              {
                backgroundColor:
                  selected === e ? colors.accent + "30" : "transparent",
                borderColor:
                  selected === e ? colors.accent : "transparent",
              },
            ]}
            onPress={() => onSelect(e)}
          >
            <Text style={styles.emoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom input */}
      <View style={[styles.customRow, { borderTopColor: colors.border }]}>
        <Text style={{ color: colors.tabBarInactive, fontSize: 13, flex: 1 }}>
          Custom emoji:
        </Text>
        <TextInput
          style={[
            styles.customInput,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.background },
          ]}
          value={custom}
          onChangeText={(t) => {
            setCustom(t);
            if (t.length > 0) onSelect(t);
          }}
          placeholder="✏️"
          placeholderTextColor={colors.tabBarInactive}
          maxLength={4}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 8 },
  categoryScroll: { marginBottom: 10 },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 10,
  },
  emojiBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 22 },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: "center",
    fontSize: 22,
  },
});