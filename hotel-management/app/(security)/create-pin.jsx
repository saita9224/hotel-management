import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "../../hooks/useTheme";
import PinPad, { PIN_LENGTH } from "../../components/PinPad";

export default function CreatePinScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleDigit = (digit) => {
    setError(false);
    const next = value + digit;
    setValue(next);

    if (next.length === PIN_LENGTH) {
      // Navigate to confirm screen with the PIN
      router.push({
        pathname: "/(security)/confirm-pin",
        params: { pin: next }
      });
    }
  };

  const handleBackspace = () => {
    setError(false);
    setValue((v) => v.slice(0, -1));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Set a PIN</Text>
      <Text style={[styles.subtitle, { color: colors.tabBarInactive }]}>
        Choose a 6-digit PIN to unlock this device, even offline.
      </Text>
      {error && (
        <Text style={styles.errorText}>Please enter a 6-digit PIN</Text>
      )}

      <PinPad
        colors={colors}
        value={value}
        onDigit={handleDigit}
        onBackspace={handleBackspace}
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  errorText: {
    color: "#E53935",
    fontSize: 14,
    marginBottom: 16,
  },
});
