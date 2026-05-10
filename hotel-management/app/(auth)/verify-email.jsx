// app/(auth)/verify-email.jsx

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useRouter }  from "expo-router";
import { useAuth }    from "../../context/AuthContext";
import { useTheme }   from "../../hooks/useTheme";
import { graphqlRequest } from "../../lib/graphql";

// ── GraphQL mutations ────────────────────────────────────────
// Both hit the tenant endpoint — schemaName is already stored
// in AsyncStorage from the login step, so graphqlRequest builds
// the correct subdomain URL automatically.

const VERIFY_EMAIL_MUTATION = `
  mutation VerifyEmail($pin: String!) {
    verifyEmail(pin: $pin) {
      success
    }
  }
`;

const RESEND_MUTATION = `
  mutation ResendVerificationEmail {
    resendVerificationEmail {
      success
    }
  }
`;

export default function VerifyEmailScreen() {
  const { markEmailVerified, logout } = useAuth();
  const { colors }                    = useTheme();
  const router                        = useRouter();

  const [pin,        setPin]        = useState("");
  const [loading,    setLoading]    = useState(false);
  const [resending,  setResending]  = useState(false);

  // ── Verify PIN ─────────────────────────────────────────
  const handleVerify = async () => {
    const trimmed = pin.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      Alert.alert("Invalid PIN", "Please enter the 6-digit PIN from your email.");
      return;
    }

    try {
      setLoading(true);
      await graphqlRequest(VERIFY_EMAIL_MUTATION, { pin: trimmed });

      // Update local context so RouteGuard and other screens
      // see the verified state without a re-login.
      markEmailVerified();
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Verification Failed", err?.message || "Incorrect PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend PIN ─────────────────────────────────────────
  const handleResend = async () => {
    try {
      setResending(true);
      await graphqlRequest(RESEND_MUTATION);
      Alert.alert("PIN Resent", "A new verification PIN has been sent to your email.");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to resend PIN. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ── Log out and go back to login ───────────────────────
  const handleBack = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Verify your email
      </Text>
      <Text style={[styles.subtitle, { color: colors.tabBarInactive }]}>
        Enter the 6-digit PIN sent to your email address when your account was created.
        The PIN does not expire.
      </Text>

      <TextInput
        placeholder="6-digit PIN"
        placeholderTextColor={colors.tabBarInactive}
        keyboardType="number-pad"
        maxLength={6}
        value={pin}
        onChangeText={setPin}
        style={[styles.input, {
          backgroundColor: colors.card,
          color:           colors.text,
          borderColor:     colors.border,
          letterSpacing:   8,
          textAlign:       "center",
          fontSize:        24,
        }]}
      />

      <TouchableOpacity
        style={[styles.button, {
          backgroundColor: loading ? colors.border : colors.accent,
        }]}
        onPress={handleVerify}
        disabled={loading || resending}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Verify</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: colors.border }]}
        onPress={handleResend}
        disabled={loading || resending}
      >
        {resending
          ? <ActivityIndicator color={colors.accent} />
          : <Text style={[styles.secondaryText, { color: colors.accent }]}>
              Resend PIN
            </Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        disabled={loading || resending}
      >
        <Text style={[styles.backText, { color: colors.tabBarInactive }]}>
          Back to login
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    borderRadius: 10,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 24,
    minHeight: 52,
    justifyContent: "center",
  },
  secondaryText: {
    fontWeight: "600",
    fontSize: 16,
  },
  backButton: {
    alignItems: "center",
    padding: 8,
  },
  backText: {
    fontSize: 14,
  },
});