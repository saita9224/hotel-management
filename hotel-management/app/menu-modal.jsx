// menu-modal.jsx

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { router } from "expo-router";
import { Colors } from "../theme/colors";

export default function MenuModal() {
  const { logout } = useAuth();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      {/* HR */}
      <TouchableOpacity
        style={[
          styles.item,
          { borderBottomColor: theme.border },
        ]}
        onPress={() => {
          router.push("/hr");
        }}
      >
        <Text style={[styles.text, { color: theme.text }]}>
          HR
        </Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={[
          styles.item,
          { borderBottomColor: theme.border },
        ]}
        onPress={async () => {
          await logout();
          router.replace("/(auth)/login");
        }}
      >
        <Text
          style={[
            styles.text,
            { color: theme.accent }, // clean branded color instead of raw red
          ]}
        >
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  item: {
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  text: {
    fontSize: 18,
    fontWeight: "600",
  },
});
