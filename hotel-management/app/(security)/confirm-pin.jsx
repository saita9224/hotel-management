import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import PinPad, { PIN_LENGTH } from "../../components/PinPad";

export default function ConfirmPinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setDevicePin } = useAuth();
  const { colors } = useTheme();

  const firstPin = params.pin || "";
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleDigit = (digit) => {
    if (saving) return;
    setError(false);
    const next = value + digit;
    setValue(next);

    if (next.length === PIN_LENGTH) {
      handleComplete(next);
    }
  };

  const handleComplete = async (pin) => {
    if (pin !== firstPin) {
      setError(true);
      setValue("");
      // Go back to create screen to try again
      setTimeout(() => {
        router.replace("/(security)/create-pin");
      }, 1500);
      return;
    }

    try {
      setSaving(true);
      await setDevicePin(pin);
      // RouteGuard will handle navigation to tabs after pinVerified is set
    } catch (err) {
      console.error("Failed to save PIN:", err);
      setError(true);
      setValue("");
      // Go back to create screen to try again
      setTimeout(() => {
        router.replace("/(security)/create-pin");
      }, 1500);
    } finally {
      setSaving(false);
    }
  };

  const handleBackspace = () => {
    setError(false);
    setValue((v) => v.slice(0, -1));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Confirm your PIN</Text>
      <Text style={[styles.subtitle, { color: colors.tabBarInactive }]}>
        Enter it again to confirm.
      </Text>
      {error && (
        <Text style={styles.errorText}>
          {saving ? "Saving..." : "PINs did not match. Try again."}
        </Text>
      )}

      <PinPad
        colors={colors}
        value={value}
        onDigit={handleDigit}
        onBackspace={handleBackspace}
        error={error}
        disabled={saving}
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
