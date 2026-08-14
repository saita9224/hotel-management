// hooks/useNetworkStatus.js

import { useState, useEffect } from "react";
import { Platform } from "react-native";

let NetInfoModule = null;
try {
  NetInfoModule = require("@react-native-community/netinfo");
} catch (e) {
  // NetInfo optional fallback
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // If NetInfo is available (mobile or web with NetInfo package)
    if (NetInfoModule && NetInfoModule.addEventListener) {
      const unsubscribe = NetInfoModule.addEventListener((state) => {
        setIsOnline(Boolean(state.isConnected && (state.isInternetReachable ?? true)));
      });
      return () => unsubscribe();
    }

    // Web browser fallback
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      setIsOnline(navigator.onLine ?? true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return isOnline;
}
