// app/(auth)/login.jsx

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, ScrollView, Platform,
} from "react-native";
import { Ionicons }    from "@expo/vector-icons";
import { useRouter }   from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser  from "expo-web-browser";

import { useAuth }  from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

// Required — allows the browser tab to close and hand back the token
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint:         "https://oauth2.googleapis.com/token",
};

export default function LoginScreen() {
  const { login, googleSignIn } = useAuth();
  const { colors }              = useTheme();
  const router                  = useRouter();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── expo-auth-session Google setup ────────────────────
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const [, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:    GOOGLE_CLIENT_ID,
      redirectUri,
      scopes:      ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Token,
    },
    discovery,
  );

  // ── Navigation helper ──────────────────────────────────
  const navigateAfterAuth = (isEmailVerified) => {
    if (!isEmailVerified) {
      router.replace("/(auth)/verify-email");
    } else {
      router.replace("/(tabs)");
    }
  };

  // ── Email + password login ─────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Validation", "Email and password are required.");
      return;
    }
    try {
      setLoading(true);
      const result = await login(email.trim(), password);
      navigateAfterAuth(result.isEmailVerified);
    } catch (err) {
      Alert.alert("Login failed", err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In ─────────────────────────────────────
  // expo-auth-session returns an access_token, not an id_token,
  // so we fetch the id_token from Google's userinfo endpoint
  // before handing off to the backend.
  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);

      const authResult = await promptAsync();

      if (authResult?.type !== "success") {
        // User cancelled or error — nothing to do
        return;
      }

      const accessToken = authResult.params?.access_token;
      if (!accessToken) throw new Error("No access token from Google.");

      // Exchange access token for id_token via Google's tokeninfo
      const infoRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const userInfo = await infoRes.json();

      // Build a minimal id_token-like payload for the backend.
      // Our backend's verify_google_token hits tokeninfo with
      // the id_token — for expo-auth-session implicit flow we
      // pass the access_token to userinfo ourselves and send
      // the sub as the identifier.
      //
      // ⚠️  If your backend strictly requires a real id_token,
      // switch responseType to AuthSession.ResponseType.Code
      // and do the PKCE code exchange — see register.jsx note.
      //
      // For now we hit googleAuth with the access token directly
      // since your backend calls tokeninfo which also accepts it.
      const result = await googleSignIn(accessToken);
      router.replace("/(tabs)");

    } catch (err) {
      Alert.alert("Google sign-in failed", err?.message || "Try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────
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
        <Text style={[styles.title, { color: colors.text }]}>Welcome</Text>
        <Text style={[styles.subtitle, { color: colors.tabBarInactive }]}>
          Sign in to your account
        </Text>

        {/* ── Google button ── */}
        <TouchableOpacity
          style={[styles.googleButton, {
            borderColor:     colors.border,
            backgroundColor: colors.card,
          }]}
          onPress={handleGoogle}
          disabled={googleLoading || loading}
        >
          {googleLoading
            ? <ActivityIndicator color={colors.accent} />
            : <>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={[styles.googleText, { color: colors.text }]}>
                  Continue with Google
                </Text>
              </>
          }
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.tabBarInactive }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Email ── */}
        <TextInput
          placeholder="Email"
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

        {/* ── Password ── */}
        <View style={[styles.passwordContainer, {
          backgroundColor: colors.card,
          borderColor:     colors.border,
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

        {/* ── Login button ── */}
        <TouchableOpacity
          style={[styles.button, {
            backgroundColor: loading ? colors.border : colors.accent,
          }]}
          onPress={handleLogin}
          disabled={loading || googleLoading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Sign in</Text>
          }
        </TouchableOpacity>

        {/* ── Register link ── */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerPrompt, { color: colors.tabBarInactive }]}>
            New business?
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            disabled={loading || googleLoading}
          >
            <Text style={[styles.registerLink, { color: colors.accent }]}>
              {" "}Register here
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
  },
  googleButton: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            10,
    padding:        14,
    borderRadius:   10,
    borderWidth:    1,
    marginBottom:   20,
    minHeight:      52,
  },
  googleText: {
    fontSize:   16,
    fontWeight: "600",
  },
  divider: {
    flexDirection:  "row",
    alignItems:     "center",
    marginBottom:   20,
    gap:            10,
  },
  dividerLine: {
    flex:   1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  input: {
    borderWidth:   1,
    padding:       14,
    marginBottom:  18,
    borderRadius:  10,
    fontSize:      16,
  },
  passwordContainer: {
    flexDirection:    "row",
    alignItems:       "center",
    borderWidth:      1,
    borderRadius:     10,
    paddingHorizontal:14,
    marginBottom:     18,
  },
  passwordInput: {
    flex:           1,
    paddingVertical:14,
    fontSize:       16,
  },
  button: {
    padding:        16,
    borderRadius:   10,
    alignItems:     "center",
    marginBottom:   24,
    minHeight:      52,
    justifyContent: "center",
  },
  buttonText: {
    color:      "#FFFFFF",
    fontWeight: "600",
    fontSize:   16,
  },
  registerRow: {
    flexDirection:  "row",
    justifyContent: "center",
    alignItems:     "center",
  },
  registerPrompt: {
    fontSize: 14,
  },
  registerLink: {
    fontSize:   14,
    fontWeight: "600",
  },
});