// app/(auth)/login.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Validation", "Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      // 👆 No router.replace here — RouteGuard in _layout.jsx
      // detects isAuthenticated becoming true and redirects automatically
    } catch (err) {
      Alert.alert("Login Failed", err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.tabBarInactive}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={[styles.input, {
          backgroundColor: colors.card,
          color: colors.text,
          borderColor: colors.border,
        }]}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.tabBarInactive}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[styles.input, {
          backgroundColor: colors.card,
          color: colors.text,
          borderColor: colors.border,
        }]}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: loading ? colors.border : colors.accent }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 32 },
  input: { borderWidth: 1, padding: 14, marginBottom: 18, borderRadius: 10, fontSize: 16 },
  button: { padding: 16, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});