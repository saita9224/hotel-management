// app/(auth)/register.jsx

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Platform,
} from "react-native";
import { Ionicons }      from "@expo/vector-icons";
import { useRouter }     from "expo-router";

import { useAuth }       from "../../context/AuthContext";
import { useTheme }      from "../../hooks/useTheme";
import { publicRequest } from "../../lib/graphql";

// ─────────────────────────────────────────────────────────────
// GraphQL mutations — both hit the PUBLIC endpoint (/auth/)
// because the user has no tenant subdomain yet at this stage.
// ─────────────────────────────────────────────────────────────

const REQUEST_MUTATION = `
  mutation RequestRegistration($email: String!, $businessName: String!) {
    requestRegistration(email: $email, businessName: $businessName) {
      message
      email
    }
  }
`;

const VERIFY_MUTATION = `
  mutation VerifyRegistration(
    $email: String!, $pin: String!,
    $name: String!, $password: String!
  ) {
    verifyRegistration(
      email: $email, pin: $pin,
      name: $name, password: $password
    ) {
      token userId name email
      roles permissions schemaName isNewUser
    }
  }
`;

export default function RegisterScreen() {
  // applySession is the shared session writer from AuthContext.
  // It writes token, schemaName, roles, permissions to AsyncStorage
  // and updates all context state in one call — same function used
  // by login and googleSignIn, so session handling is consistent.
  const { applySession } = useAuth();
  const { colors }       = useTheme();
  const router           = useRouter();

  // ── Step 1 fields ────────────────────────────────────────
  const [email,        setEmail]        = useState("");
  const [businessName, setBusinessName] = useState("");

  // ── Step 2 fields ────────────────────────────────────────
  const [pin,          setPin]          = useState("");
  const [adminName,    setAdminName]    = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [step,    setStep]    = useState(1);   // 1 | 2
  const [loading, setLoading] = useState(false);

  // ── Step 1: request PIN ──────────────────────────────────
  const handleRequestPin = async () => {
    const trimEmail    = email.trim().toLowerCase();
    const trimBusiness = businessName.trim();

    if (!trimEmail || !trimBusiness) {
      Alert.alert("Validation", "Email and business name are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      Alert.alert("Validation", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await publicRequest(REQUEST_MUTATION, {
        email:        trimEmail,
        businessName: trimBusiness,
      });
      // Store the normalised email so step 2 sends the same value
      // that step 1 registered — prevents case-mismatch lookup errors.
      setEmail(trimEmail);
      setStep(2);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to send PIN. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify PIN + create business ─────────────────
  const handleVerify = async () => {
    const trimPin  = pin.trim();
    const trimName = adminName.trim();

    if (trimPin.length !== 6 || !/^\d{6}$/.test(trimPin)) {
      Alert.alert("Validation", "Enter the 6-digit PIN from your email.");
      return;
    }
    if (!trimName) {
      Alert.alert("Validation", "Your name is required.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Validation", "Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const data = await publicRequest(VERIFY_MUTATION, {
        email:    email,
        pin:      trimPin,
        name:     trimName,
        password,
      });

      const result = data.verifyRegistration;

      // applySession handles both AsyncStorage and React state.
      // This is identical to how login.jsx handles a successful
      // login — no direct AsyncStorage calls needed here.
      await applySession(result);

      // Admin is logged in immediately after registration.
      // is_email_verified is True for all admins (they proved
      // email ownership via the PIN) so go straight to tabs.
      router.replace("/(tabs)");

    } catch (err) {
      Alert.alert(
        "Error",
        err?.message || "Verification failed. Check your PIN and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Resend PIN ────────────────────────────────────────────
  // Re-calls requestRegistration with the same email + businessName.
  // The backend replaces the old PendingRegistration record,
  // invalidating the previous PIN automatically.
  const handleResend = async () => {
    try {
      setLoading(true);
      await publicRequest(REQUEST_MUTATION, {
        email:        email,
        businessName: businessName.trim(),
      });
      Alert.alert("PIN resent", "A new PIN has been sent to your email.");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to resend.");
    } finally {
      setLoading(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Back / step navigation ── */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => step === 1 ? router.back() : setStep(1)}
          disabled={loading}
        >
          <Ionicons name="arrow-back-outline" size={22} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent }]}>
            {step === 1 ? "Back to login" : "Back"}
          </Text>
        </TouchableOpacity>

        {/* ══ STEP 1 ══ */}
        {step === 1 ? (
          <>
            <Text style={[styles.title, { color: colors.text }]}>
              Register your business
            </Text>
            <Text style={[styles.subtitle, { color: colors.tabBarInactive }]}>
              We'll send a 6-digit PIN to verify your email before creating your account.
            </Text>

            <TextInput
              placeholder="Business name"
              placeholderTextColor={colors.tabBarInactive}
              value={businessName}
              onChangeText={setBusinessName}
              style={[styles.input, {
                backgroundColor: colors.card,
                color:           colors.text,
                borderColor:     colors.border,
              }]}
            />

            <TextInput
              placeholder="Your email"
              placeholderTextColor={colors.tabBarInactive}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={[styles.input, {
                backgroundColor: colors.card,
                color:           colors.text,
                borderColor:     colors.border,
              }]}
            />

            <TouchableOpacity
              style={[styles.button, {
                backgroundColor: loading ? colors.border : colors.accent,
              }]}
              onPress={handleRequestPin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Send verification PIN</Text>
              }
            </TouchableOpacity>
          </>

        ) : (

        /* ══ STEP 2 ══ */
          <>
            <Text style={[styles.title, { color: colors.text }]}>
              Verify your email
            </Text>
            <Text style={[styles.subtitle, { color: colors.tabBarInactive }]}>
              Enter the PIN sent to {email}, then set your name and password.
            </Text>

            {/* PIN */}
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

            {/* Your name */}
            <TextInput
              placeholder="Your name"
              placeholderTextColor={colors.tabBarInactive}
              autoCapitalize="words"
              value={adminName}
              onChangeText={setAdminName}
              style={[styles.input, {
                backgroundColor: colors.card,
                color:           colors.text,
                borderColor:     colors.border,
              }]}
            />

            {/* Password */}
            <View style={[styles.passwordContainer, {
              backgroundColor: colors.card,
              borderColor:     colors.border,
            }]}>
              <TextInput
                placeholder="Create password (min 8 chars)"
                placeholderTextColor={colors.tabBarInactive}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                style={[styles.passwordInput, { color: colors.text }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(p => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.tabBarInactive}
                />
              </TouchableOpacity>
            </View>

            {/* Create business */}
            <TouchableOpacity
              style={[styles.button, {
                backgroundColor: loading ? colors.border : colors.accent,
              }]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Create my business</Text>
              }
            </TouchableOpacity>

            {/* Resend PIN */}
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleResend}
              disabled={loading}
            >
              <Text style={[styles.secondaryText, { color: colors.accent }]}>
                Resend PIN
              </Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow:       1,
    justifyContent: "center",
    padding:        24,
    paddingBottom:  40,
  },
  backButton: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            6,
    marginBottom:   28,
    alignSelf:      "flex-start",
  },
  backText: {
    fontSize:   15,
    fontWeight: "600",
  },
  title: {
    fontSize:     28,
    fontWeight:   "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize:     14,
    lineHeight:   20,
    marginBottom: 28,
  },
  input: {
    borderWidth:  1,
    padding:      14,
    marginBottom: 16,
    borderRadius: 10,
    fontSize:     16,
  },
  passwordContainer: {
    flexDirection:     "row",
    alignItems:        "center",
    borderWidth:       1,
    borderRadius:      10,
    paddingHorizontal: 14,
    marginBottom:      16,
  },
  passwordInput: {
    flex:            1,
    paddingVertical: 14,
    fontSize:        16,
  },
  button: {
    padding:        16,
    borderRadius:   10,
    alignItems:     "center",
    marginBottom:   12,
    minHeight:      52,
    justifyContent: "center",
  },
  buttonText: {
    color:      "#FFFFFF",
    fontWeight: "600",
    fontSize:   16,
  },
  secondaryButton: {
    padding:        16,
    borderRadius:   10,
    alignItems:     "center",
    borderWidth:    1,
    minHeight:      52,
    justifyContent: "center",
  },
  secondaryText: {
    fontWeight: "600",
    fontSize:   16,
  },
});