// components/BusinessLogo.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useOffline } from "../context/OfflineContext";
import { useTheme } from "../hooks/useTheme";
import { uploadBusinessLogoGraphQL } from "../services/businessService";

const AVATAR_PALETTE = [
  "#1E3A8A", // Deep Blue
  "#0F766E", // Teal
  "#4338CA", // Indigo
  "#047857", // Emerald
  "#6D28D9", // Violet
  "#BE123C", // Rose
  "#C2410C", // Amber / Orange
  "#0369A1", // Cyan
];

function getBusinessInitials(name) {
  if (!name || typeof name !== "string") return "BM";
  const trimmed = name.trim();
  if (!trimmed) return "BM";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024; // 1.5MB upload target
const MAX_DIMENSION = 1024;

async function getFileSize(uri) {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return info.exists ? info.size || 0 : 0;
  } catch {
    return 0;
  }
}

async function persistFile(sourceUri, fileName) {
  const dest = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

function extFromMime(mime, fallbackName) {
  if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  const match = /\.([a-zA-Z0-9]+)$/.exec(fallbackName || "");
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
}

async function compressLogoAsset(asset) {
  const actions = [];
  const longest = Math.max(asset.width || 0, asset.height || 0);
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    actions.push({
      resize: {
        width: Math.max(1, Math.round((asset.width || MAX_DIMENSION) * scale)),
        height: Math.max(1, Math.round((asset.height || MAX_DIMENSION) * scale)),
      },
    });
  }

  let compress = 0.8;
  let result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  // Step quality down until under the upload limit (max 3 retries)
  for (let i = 0; i < 3; i++) {
    const size = await getFileSize(result.uri);
    if (size === 0 || size <= MAX_UPLOAD_BYTES) break;
    compress = Math.max(0.3, compress - 0.2);
    result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    });
  }
  return result;
}

function getAvatarColor(name) {
  if (!name || typeof name !== "string") return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export default function BusinessLogo({ size = 160, style }) {
  const { colors } = useTheme();
  const { business, permissions, roles, updateBusinessLogoState } = useAuth();
  const { isOnline } = useOffline();
  const [uploading, setUploading] = useState(false);

  const canManageLogo =
    permissions?.includes("tenant.manage_profile") ||
    roles?.includes("Admin") ||
    roles?.includes("SUPER_ADMIN");

  const hasCustomLogo = Boolean(business?.logo);
  const businessName = business?.name || "BIZZMAN";
  const initials = getBusinessInitials(businessName);
  const avatarBgColor = getAvatarColor(businessName);

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

      const stamp = Date.now();
      const originalExt = extFromMime(selectedAsset.mimeType, selectedAsset.fileName);

      // Persist the ORIGINAL image to document storage so it survives
      // cache cleanup and remains available for local display + re-upload.
      let localOriginalUri = selectedAsset.uri;
      let uploadFile = null;
      try {
        localOriginalUri = await persistFile(
          selectedAsset.uri,
          `logo_original_${stamp}${originalExt}`
        );

        // Compress a copy for upload (max 1024px, JPEG, <= ~1.5MB)
        const compressed = await compressLogoAsset(selectedAsset);
        const compressedUri = await persistFile(compressed.uri, `logo_upload_${stamp}.jpg`);
        uploadFile = {
          uri: compressedUri,
          name: `logo_${stamp}.jpg`,
          type: "image/jpeg",
        };
      } catch (compressErr) {
        console.error("Logo compression failed, falling back to original:", compressErr);
        uploadFile = {
          uri: localOriginalUri,
          name: selectedAsset.fileName || `logo_${stamp}${originalExt}`,
          type: selectedAsset.mimeType || "image/png",
        };
      }

      if (!isOnline) {
        // Enqueue offline and update local state persistently via AsyncStorage
        await updateBusinessLogoState(localOriginalUri, true, uploadFile);
        Alert.alert(
          "Saved Offline",
          "Logo updated locally. It will sync automatically when your internet connection is restored."
        );
        return;
      }

      // Online upload via GraphQL
      setUploading(true);
      try {
        const updatedBusiness = await uploadBusinessLogoGraphQL(uploadFile);
        const newLogoUrl = updatedBusiness?.logo || localOriginalUri;
        await updateBusinessLogoState(newLogoUrl, false);
        Alert.alert("Success", "Business logo updated successfully!");
      } catch (err) {
        console.error("Logo upload failed:", err);
        // Fallback to saving locally and queueing if network error occurred mid-upload
        await updateBusinessLogoState(localOriginalUri, true, uploadFile);
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
        {hasCustomLogo ? (
          <Image
            source={{ uri: business.logo }}
            style={[styles.image, { borderRadius: size / 5 }]}
            contentFit="contain"
            transition={300}
            cachePolicy="disk"
          />
        ) : (
          <View
            style={[
              styles.avatarContainer,
              {
                borderRadius: size / 4,
                backgroundColor: avatarBgColor,
              },
            ]}
          >
            <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
              {initials}
            </Text>
          </View>
        )}

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
    width: "80%",
    height: "80%",
  },
  avatarContainer: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  avatarText: {
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
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
