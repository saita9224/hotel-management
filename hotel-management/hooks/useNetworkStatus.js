// hooks/useNetworkStatus.js

import { useState, useEffect } from "react";
import { Platform, NativeModules } from "react-native";

let NetInfoModule = null;
try {
  if (Platform.OS === "web" || NativeModules.RNCNetInfo) {
    NetInfoModule = require("@react-native-community/netinfo");
  }
} catch (e) {
  // NetInfo optional fallback
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // A. Native NetInfo Module (when linked in dev build / web)
    if (NetInfoModule && NetInfoModule.addEventListener) {
      try {
        NetInfoModule.fetch()
          .then((state) => {
            if (isMounted && state) {
              setIsOnline(Boolean(state.isConnected && (state.isInternetReachable ?? true)));
            }
          })
          .catch(() => {});

        const unsubscribe = NetInfoModule.addEventListener((state) => {
          if (isMounted && state) {
            setIsOnline(Boolean(state.isConnected && (state.isInternetReachable ?? true)));
          }
        });

        return () => {
          isMounted = false;
          unsubscribe();
        };
      } catch (err) {
        console.warn("NetInfo listener error, using fallback ping:", err);
      }
    }

    // B. Fallback ping check (for unlinked dev client APK or web fallback)
    const checkStatus = async () => {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (!navigator.onLine) {
          if (isMounted) setIsOnline(false);
          return;
        }
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch("https://clients3.google.com/generate_204", {
          method: "HEAD",
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeoutId);
        if (isMounted) setIsOnline(res.ok || res.status === 204);
      } catch (e) {
        if (isMounted) setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 6000);

    let handleOnline = null;
    let handleOffline = null;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      handleOnline = () => { if (isMounted) setIsOnline(true); checkStatus(); };
      handleOffline = () => { if (isMounted) setIsOnline(false); };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (handleOnline) window.removeEventListener("online", handleOnline);
        if (handleOffline) window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  return isOnline;
}


