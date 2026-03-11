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
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Validation", "Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
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

      {/* Password field with show/hide toggle */}
      <View style={[styles.passwordContainer, {
        backgroundColor: colors.card,
        borderColor: colors.border,
      }]}>
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.tabBarInactive}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          style={[styles.passwordInput, { color: colors.text }]}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((prev) => !prev)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={colors.tabBarInactive}
          />
        </TouchableOpacity>
      </View>

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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 16 },
  button: { padding: 16, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});