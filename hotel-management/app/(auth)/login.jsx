// app/(auth)/login.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../theme/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      await login(email.trim(), password);

      // 🚀 Navigate to tabs after successful login
      router.replace("/(tabs)");

    } catch (err) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.tabBarInactive}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={theme.tabBarInactive}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
      />

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
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
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    borderRadius: 10,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
