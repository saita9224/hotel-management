// components/BusinessLogo.jsx

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../context/OfflineContext";
import { useTheme } from "../hooks/useTheme";
import { uploadBusinessLogoGraphQL } from "../services/businessService";

const DEFAULT_LOGO = require("../assets/images/Bizzman_logo.png");

export default function BusinessLogo({ size = 160, style }) {
  const { colors } = useTheme();
  const { business, permissions, roles, updateBusinessLogoState } = useAuth();
  const { isOnline } = useOffline();
  const [uploading, setUploading] = useState(false);

  const canManageLogo =
    permissions?.includes("tenant.manage_profile") ||
    roles?.includes("Admin") ||
    roles?.includes("SUPER_ADMIN");

  const logoSource = business?.logo
    ? { uri: business.logo }
    : DEFAULT_LOGO;

  const handlePickImage = async () => {
    if (!canManageLogo) return;

    Alert.alert(
      "Business Logo",
      "Choose an option to set a new logo for your business:",
      [
        {
          text: "Choose from Library",
          onPress: () => openPicker("library"),
        },
        {
          text: "Take Photo",
          onPress: () => openPicker("camera"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const openPicker = async (sourceType) => {
    try {
      let result;

      if (sourceType === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is needed to take a logo picture.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Photo library access is needed to select a logo.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const selectedAsset = result.assets[0];

      // File size check (default limit: 2MB = 2 * 1024 * 1024 bytes)
      if (selectedAsset.fileSize && selectedAsset.fileSize > 2 * 1024 * 1024) {
        Alert.alert("File Too Large", "Please select an image smaller than 2MB.");
        return;
      }

      const fileObj = {
        uri: selectedAsset.uri,
        name: selectedAsset.fileName || `logo_${Date.now()}.png`,
        type: selectedAsset.mimeType || "image/png",
      };

      if (!isOnline) {
        // Enqueue offline and update local state persistently via AsyncStorage
        await updateBusinessLogoState(selectedAsset.uri, true, fileObj);
        Alert.alert(
          "Saved Offline",
          "Logo updated locally. It will sync automatically when your internet connection is restored."
        );
        return;
      }

      // Online upload via GraphQL
      setUploading(true);
      try {
        const updatedBusiness = await uploadBusinessLogoGraphQL(fileObj);
        const newLogoUrl = updatedBusiness?.logo || selectedAsset.uri;
        await updateBusinessLogoState(newLogoUrl, false);
        Alert.alert("Success", "Business logo updated successfully!");
      } catch (err) {
        console.error("Logo upload failed:", err);
        // Fallback to saving locally and queueing if network error occurred mid-upload
        await updateBusinessLogoState(selectedAsset.uri, true, fileObj);
        Alert.alert(
          "Network Error",
          "Upload failed. Saved locally and queued for background synchronization."
        );
      } finally {
        setUploading(false);
      }
    } catch (err) {
      console.error("Image picker error:", err);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <TouchableOpacity
        activeOpacity={canManageLogo ? 0.8 : 1}
        onPress={handlePickImage}
        disabled={uploading}
        style={styles.touchable}
      >
        <Image
          source={logoSource}
          style={[styles.image, { borderRadius: size / 8 }]}
          contentFit="contain"
          transition={300}
          cachePolicy="disk"
        />

        {uploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent || "#007AFF"} />
          </View>
        )}

        {canManageLogo && !uploading && (
          <View style={[styles.badge, { backgroundColor: colors.accent || "#007AFF" }]}>
            <Ionicons name="camera" size={16} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  touchable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
