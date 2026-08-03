// app/pin-gate.jsx
//
// Shown on every cold launch once a real (JWT) session is found on the
// device and a PIN has already been set. Blocks everything else — no
// network calls happen here at all; this is purely a local gate.
//
// Navigation is NOT handled manually anywhere in this file — RouteGuard
// (app/_layout.jsx) owns all post-auth/post-PIN navigation via its own
// effect, gated on the root navigator being ready. Calling router.replace
// directly from here was the same unsafe pattern that caused the
// "REPLACE action not handled" bug elsewhere.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import PinPad, { PIN_LENGTH } from "../components/PinPad";
import { getPinLockout } from "../lib/authSession";

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PinGateScreen() {
  const { verifyDevicePin, forgotPin } = useAuth();
  const { colors } = useTheme();

  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Check for an existing lockout on mount (e.g. app was killed mid-lockout).
  useEffect(() => {
    getPinLockout().then((until) => {
      if (until) setLockedUntil(until);
    });
  }, []);

  // Tick while locked out so the countdown updates and clears on expiry.
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil && now >= lockedUntil) {
      setLockedUntil(null);
      setAttemptsRemaining(null);
    }
  }, [now, lockedUntil]);

  const isLocked = !!lockedUntil && now < lockedUntil;

  const handleDigit = (digit) => {
    if (isLocked) return;
    setError(false);
    const next = value + digit;
    setValue(next);
    if (next.length === PIN_LENGTH) {
      handleSubmit(next);
    }
  };

  const handleSubmit = async (pin) => {
    const result = await verifyDevicePin(pin);

    if (result.success) {
      // RouteGuard's effect picks up pinVerified flipping true and
      // navigates to (tabs) itself, once the navigator is ready.
      return;
    }

    setValue("");
    setError(true);

    if (result.lockedUntil) {
      setLockedUntil(result.lockedUntil);
      setAttemptsRemaining(null);
    } else {
      setAttemptsRemaining(result.attemptsRemaining ?? null);
    }
  };

  const handleBackspace = () => {
    setError(false);
    setValue((v) => v.slice(0, -1));
  };

  const handleForgotPin = async () => {
    await forgotPin();
    // No manual navigation here — forgotPin() calls logout() internally,
    // which flips isAuthenticated to false. RouteGuard's effect reacts
    // to that and navigates to /(auth)/login on its own.
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Enter your PIN</Text>

      {isLocked ? (
        <Text style={styles.lockedText}>
          Too many attempts. Try again in {formatRemaining(lockedUntil - now)}.
        </Text>
      ) : (
        error && (
          <Text style={styles.errorText}>
            Incorrect PIN
            {attemptsRemaining != null ? ` — ${attemptsRemaining} attempt(s) left` : ""}
          </Text>
        )
      )}

      <PinPad
        colors={colors}
        value={value}
        onDigit={handleDigit}
        onBackspace={handleBackspace}
        error={error}
        disabled={isLocked}
      />

      <TouchableOpacity onPress={handleForgotPin} style={styles.forgotButton}>
        <Text style={[styles.forgotText, { color: colors.accent }]}>Forgot PIN?</Text>
      </TouchableOpacity>
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
    marginBottom: 24,
    textAlign: "center",
  },
  errorText: {
    color: "#E53935",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  lockedText: {
    color: "#E53935",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  forgotButton: {
    marginTop: 32,
    padding: 8,
  },
  forgotText: {
    fontSize: 15,
    fontWeight: "500",
  },
});