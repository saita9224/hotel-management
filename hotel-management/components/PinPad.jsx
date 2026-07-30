import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PIN_LENGTH = 6;

export default function PinPad({
  colors,
  value,
  onDigit,
  onBackspace,
  error,
  disabled = false,
}) {
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [error, shake]);

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < value.length);

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "backspace"];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dotsRow,
          {
            transform: [
              {
                translateX: shake.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-8, 8],
                }),
              },
            ],
          },
        ]}
      >
        {dots.map((filled, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: filled ? colors.accent : "transparent",
                borderColor: error ? "#E53935" : colors.border,
              },
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.keypad}>
        {keys.map((key, i) => {
          if (key === null) return <View key={i} style={styles.key} />;

          if (key === "backspace") {
            return (
              <TouchableOpacity
                key={i}
                style={styles.key}
                onPress={onBackspace}
                disabled={disabled || value.length === 0}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="backspace-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={i}
              style={styles.key}
              onPress={() => onDigit(String(key))}
              disabled={disabled || value.length >= PIN_LENGTH}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export { PIN_LENGTH };

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 40,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    justifyContent: "space-between",
  },
  key: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  keyText: {
    fontSize: 30,
    fontWeight: "500",
  },
});