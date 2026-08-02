// app/(auth)/login.jsx

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
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
  const { login, loginWithBusiness, googleSignIn } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword,  setShowPassword]  = useState(false);

  const [businessChoices, setBusinessChoices] = useState([]);
  const [showChoiceModal, setShowChoiceModal] = useState(false);

  const logoProgress    = useRef(new Animated.Value(0)).current;
  const taglineProgress = useRef(new Animated.Value(0)).current;
  const formProgress    = useRef(new Animated.Value(0)).current;

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

  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:     WEB_CLIENT_ID,
      redirectUri,
      scopes:       ["openid", "profile", "email"],
      responseType: AuthSession.ResponseType.Code,
      usePKCE:      true,
    },
    {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint:         "https://oauth2.googleapis.com/token",
    }
  );

  // Navigation after a successful login/PIN flow is now owned entirely by
  // RouteGuard's useEffect (app/_layout.jsx) — it reacts to isAuthenticated/
  // pinIsSet/pinVerified changing and dispatches router.replace() itself,
  // once it's confirmed the root navigator is actually ready. This screen
  // no longer needs to (and shouldn't) navigate on its own; doing so from
  // here caused a race that led to a full navigator reset.

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Validation", "Email and password are required.");
      return;
    }
    try {
      setLoading(true);
      const result = await login(email.trim(), password);

      if (result.requiresChoice) {
        setBusinessChoices(result.choices);
        setShowChoiceModal(true);
        return;
      }

      // No manual navigation here — RouteGuard picks up the new
      // isAuthenticated/pinIsSet state and routes accordingly.
    } catch (err) {
      Alert.alert("Login failed", err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleChooseBusiness = async (schemaName) => {
    try {
      setShowChoiceModal(false);
      setLoading(true);
      await loginWithBusiness(email.trim(), password, schemaName);
      // RouteGuard handles navigation from here.
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
      if (authResult?.type !== "success") return;

      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId:    WEB_CLIENT_ID,
          redirectUri,
          code:        authResult.params.code,
          extraParams: { code_verifier: request.codeVerifier },
        },
        { tokenEndpoint: "https://oauth2.googleapis.com/token" }
      );

      const idToken = tokenResult.idToken;
      if (!idToken) {
        throw new Error(
          "No id_token in token response. Check that 'openid' scope is included and the Web client ID is used."
        );
      }

      await googleSignIn(idToken);
      // RouteGuard handles navigation from here.
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
      inputRange:  [0, 1],
      outputRange: [0.92, 1],
    }),
    transform: [
      {
        translateY: logoProgress.interpolate({
          inputRange:  [0, 1],
          outputRange: [96, 0],
        }),
      },
      {
        scale: logoProgress.interpolate({
          inputRange:  [0, 1],
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
          inputRange:  [0, 1],
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
          inputRange:  [0, 1],
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
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
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

          <Text style={[styles.subtitle, { color: colors.tabBarInactive }]}>
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
                color:           colors.text,
                borderColor:     colors.border,
              },
            ]}
          />

          <View
            style={[
              styles.passwordContainer,
              {
                backgroundColor: colors.card,
                borderColor:     colors.border,
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
            onPress={() => router.push("/(auth)/forgot-password")}
            disabled={loading || googleLoading}
            style={styles.forgotRow}
          >
            <Text style={[styles.forgotText, { color: colors.accent }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: loading ? colors.border : colors.accent },
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
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.tabBarInactive }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                borderColor:     colors.border,
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
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showChoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChoiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Which business?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.tabBarInactive }]}>
              This email is used in more than one business. Choose which one to sign in to.
            </Text>

            {businessChoices.map((choice) => (
              <TouchableOpacity
                key={choice.schemaName}
                style={[styles.choiceButton, { borderColor: colors.border }]}
                onPress={() => handleChooseBusiness(choice.schemaName)}
                disabled={loading}
              >
                <Text style={[styles.choiceText, { color: colors.text }]}>
                  {choice.businessName}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.tabBarInactive} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowChoiceModal(false)}
              disabled={loading}
            >
              <Text style={[styles.modalCancelText, { color: colors.tabBarInactive }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding:        24,
    paddingTop:     48,
    paddingBottom:  56,
  },
  logoContainer: {
    alignItems:   "center",
    marginBottom: 32,
  },
  logoGroup: {
    width:    268,
    height:   96,
    position: "relative",
  },
  logo: {
    width:  268,
    height: 78,
  },
  logoTagline: {
    position: "absolute",
    left:     96,
    top:      62,
    width:    178,
    height:   26,
  },
  formContent: {
    width: "100%",
  },
  title: {
    fontSize:     28,
    fontWeight:   "700",
    marginBottom: 6,
    textAlign:    "center",
  },
  subtitle: {
    fontSize:     15,
    marginBottom: 30,
    textAlign:    "center",
  },
  input: {
    borderWidth:  1,
    padding:      14,
    marginBottom: 18,
    borderRadius: 10,
    fontSize:     16,
  },
  passwordContainer: {
    flexDirection:   "row",
    alignItems:      "center",
    borderWidth:     1,
    borderRadius:    10,
    paddingHorizontal: 14,
    marginBottom:    8,
  },
  passwordInput: {
    flex:          1,
    paddingVertical: 14,
    fontSize:      16,
  },
  forgotRow: {
    alignSelf:    "flex-end",
    marginBottom: 18,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize:   14,
    fontWeight: "500",
  },
  button: {
    padding:        16,
    borderRadius:   10,
    alignItems:     "center",
    marginBottom:   18,
    minHeight:      52,
    justifyContent: "center",
  },
  buttonText: {
    color:      "#FFFFFF",
    fontWeight: "600",
    fontSize:   16,
  },
  divider: {
    flexDirection: "row",
    alignItems:    "center",
    marginBottom:  20,
    gap:           10,
  },
  dividerLine: {
    flex:   1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  googleButton: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            10,
    padding:        14,
    borderRadius:   10,
    borderWidth:    1,
    marginBottom:   24,
    minHeight:      52,
  },
  googleText: {
    fontSize:   16,
    fontWeight: "600",
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
  modalOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent:  "center",
    alignItems:      "center",
    padding:         24,
  },
  modalCard: {
    width:        "100%",
    borderRadius: 14,
    padding:      20,
  },
  modalTitle: {
    fontSize:     20,
    fontWeight:   "700",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize:     14,
    lineHeight:   19,
    marginBottom: 18,
  },
  choiceButton: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingVertical:   14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  choiceText: {
    fontSize:   16,
    fontWeight: "500",
  },
  modalCancel: {
    alignItems: "center",
    paddingTop: 16,
  },
  modalCancelText: {
    fontSize: 15,
  },
});