// app/(auth)/login.jsx

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function LoginScreen() {
  const { login, googleSignIn } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const logoProgress = useRef(new Animated.Value(0)).current;
  const taglineProgress = useRef(new Animated.Value(0)).current;
  const formProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.timing(logoProgress, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(taglineProgress, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(formProgress, {
          toValue: 1,
          duration: 550,
          delay: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [formProgress, logoProgress, taglineProgress]);

  const redirectUri = AuthSession.makeRedirectUri({
    useProxy: true,
  });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: WEB_CLIENT_ID,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    {
      authorizationEndpoint:
        "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
    }
  );

  const navigateAfterAuth = (isEmailVerified) => {
    if (!isEmailVerified) {
      router.replace("/(auth)/verify-email");
    } else {
      router.replace("/(tabs)");
    }
  };

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

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);

      const authResult = await promptAsync();

      if (authResult?.type !== "success") {
        return;
      }

      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: WEB_CLIENT_ID,
          redirectUri,
          code: authResult.params.code,
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        {
          tokenEndpoint: "https://oauth2.googleapis.com/token",
        }
      );

      const idToken = tokenResult.idToken;

      if (!idToken) {
        throw new Error(
          "No id_token in token response. Check that 'openid' scope is included and the Web client ID is used."
        );
      }

      await googleSignIn(idToken);

      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert(
        "Google sign-in failed",
        err?.message || "Something went wrong. Try again."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const logoAnimatedStyle = {
    opacity: logoProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1],
    }),
    transform: [
      {
        translateY: logoProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [96, 0],
        }),
      },
      {
        scale: logoProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1.28, 1],
        }),
      },
    ],
  };

  const formAnimatedStyle = {
    opacity: formProgress,
    transform: [
      {
        translateY: formProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  const taglineAnimatedStyle = {
    opacity: taglineProgress,
    transform: [
      {
        translateY: taglineProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 0],
        }),
      },
    ],
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoGroup}>
            <Image
              source={require("../../assets/images/bizzman-login-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Animated.Image
              source={require("../../assets/images/bizzman-login-tagline.png")}
              style={[styles.logoTagline, taglineAnimatedStyle]}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.View style={[styles.formContent, formAnimatedStyle]}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome</Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.tabBarInactive,
              },
            ]}
          >
            Sign in to your account
          </Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.tabBarInactive}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />

          <View
            style={[
              styles.passwordContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.tabBarInactive}
              secureTextEntry={!showPassword}
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              style={[styles.passwordInput, { color: colors.text }]}
            />

            <TouchableOpacity
              onPress={() => setShowPassword((p) => !p)}
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
            style={[
              styles.button,
              {
                backgroundColor: loading ? colors.border : colors.accent,
              },
            ]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor: colors.border,
                },
              ]}
            />

            <Text
              style={[
                styles.dividerText,
                {
                  color: colors.tabBarInactive,
                },
              ]}
            >
              or
            </Text>

            <View
              style={[
                styles.dividerLine,
                {
                  backgroundColor: colors.border,
                },
              ]}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
            onPress={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#4285F4" />

                <Text style={[styles.googleText, { color: colors.text }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text
              style={[
                styles.registerPrompt,
                {
                  color: colors.tabBarInactive,
                },
              ]}
            >
              New business?
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              disabled={loading || googleLoading}
            >
              <Text style={[styles.registerLink, { color: colors.accent }]}>
                {" "}
                Register here
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 48,
    paddingBottom: 56,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  logoGroup: {
    width: 268,
    height: 96,
    position: "relative",
  },

  logo: {
    width: 268,
    height: 78,
  },

  logoTagline: {
    position: "absolute",
    left: 96,
    top: 62,
    width: 178,
    height: 26,
  },

  formContent: {
    width: "100%",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    marginBottom: 30,
    textAlign: "center",
  },

  input: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    borderRadius: 10,
    fontSize: 16,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },

  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 18,
    minHeight: 52,
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    fontSize: 13,
  },

  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
    minHeight: 52,
  },

  googleText: {
    fontSize: 16,
    fontWeight: "600",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  registerPrompt: {
    fontSize: 14,
  },

  registerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
