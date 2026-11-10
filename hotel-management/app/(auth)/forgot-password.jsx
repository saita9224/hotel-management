import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

export default function ForgotPasswordScreen() {
  const { requestPasswordReset, resetPassword } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [stage, setStage] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const requestPin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true); setError("");
    try {
      const result = await requestPasswordReset(normalizedEmail);
      setEmail(normalizedEmail);
      setMessage(result?.message || "If an account exists for this email, a reset PIN has been sent.");
      setStage("reset");
    } catch (err) {
      setError(err?.message || "Could not request a reset PIN. Please try again.");
    } finally { setBusy(false); }
  };

  const submitReset = async () => {
    const normalizedPin = pin.trim();
    if (!/^\d{6}$/.test(normalizedPin)) { setError("Enter the six-digit PIN from your email."); return; }
    if (password.length < 8) { setError("Your password must be at least 8 characters."); return; }
    if (password !== confirmation) { setError("The passwords do not match."); return; }
    setBusy(true); setError("");
    try {
      await resetPassword(email, normalizedPin, password);
      // RouteGuard observes the session and takes the user through the normal PIN setup/unlock flow.
    } catch (err) {
      setError(err?.message || "Could not reset your password. Check the PIN or request a new one.");
    } finally { setBusy(false); }
  };

  const fieldStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];
  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => stage === "reset" ? (setStage("email"), setError("")) : router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>{stage === "reset" ? "Change email" : "Back to sign in"}</Text>
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text }]}>{stage === "email" ? "Forgot password?" : "Reset your password"}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary || colors.text }]}>{stage === "email" ? "Enter your account email and we’ll send a reset PIN." : `Enter the six-digit PIN sent to ${email}. It expires after 15 minutes.`}</Text>
        </View>
        {stage === "email" ? <>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput style={fieldStyle} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" placeholder="you@example.com" placeholderTextColor={colors.textSecondary || "#888"} editable={!busy} onSubmitEditing={requestPin} />
        </> : <>
          {!!message && <Text style={[styles.notice, { color: colors.accent }]}>{message}</Text>}
          <Text style={[styles.label, { color: colors.text }]}>Six-digit PIN</Text>
          <TextInput style={fieldStyle} value={pin} onChangeText={v => setPin(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="123456" placeholderTextColor={colors.textSecondary || "#888"} editable={!busy} />
          <Text style={[styles.label, { color: colors.text }]}>New password</Text>
          <TextInput style={fieldStyle} value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" placeholder="At least 8 characters" placeholderTextColor={colors.textSecondary || "#888"} editable={!busy} />
          <Text style={[styles.label, { color: colors.text }]}>Confirm password</Text>
          <TextInput style={fieldStyle} value={confirmation} onChangeText={setConfirmation} secureTextEntry textContentType="newPassword" placeholder="Re-enter new password" placeholderTextColor={colors.textSecondary || "#888"} editable={!busy} onSubmitEditing={submitReset} />
        </>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <TouchableOpacity disabled={busy} onPress={stage === "email" ? requestPin : submitReset} style={[styles.button, { backgroundColor: colors.accent, opacity: busy ? 0.7 : 1 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{stage === "email" ? "Send reset PIN" : "Reset password"}</Text>}
        </TouchableOpacity>
        {stage === "reset" && <TouchableOpacity disabled={busy} onPress={requestPin} style={styles.resend}><Text style={[styles.resendText, { color: colors.accent }]}>Send a new PIN</Text></TouchableOpacity>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  back: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 36 }, backText: { fontSize: 15 },
  heading: { marginBottom: 28 }, title: { fontSize: 28, fontWeight: "700", marginBottom: 10 }, subtitle: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 16 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16 },
  notice: { fontSize: 14, lineHeight: 20, marginBottom: 8 }, error: { color: "#D64545", marginTop: 14, lineHeight: 20 },
  button: { minHeight: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 24 }, buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resend: { alignItems: "center", padding: 16 }, resendText: { fontSize: 15, fontWeight: "600" },
});
