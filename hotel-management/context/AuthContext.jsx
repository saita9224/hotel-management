import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { publicRequest } from "../lib/graphql";
import {
  AUTH_STORAGE_KEYS,
  clearStoredSession,
  subscribeToAuthFailure,
  hasPinSet,
  setPin as setPinStorage,
  verifyPin as verifyPinStorage,
  clearPin,
} from "../lib/authSession";
import database from "../database";
import { SyncQueue } from "../database/syncQueue";
import { fetchBusinessDetails } from "../services/businessService";

const AuthContext = createContext();

const GOOGLE_AUTH_MUTATION = `
  mutation GoogleAuth($idToken: String!, $businessName: String) {
    googleAuth(idToken: $idToken, businessName: $businessName) {
      token
      userId
      name
      email
      roles
      permissions
      schemaName
      isNewUser
    }
  }
`;

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      __typename
      ... on LoginPayload {
        token
        userId
        name
        email
        roles
        permissions
        schemaName
        isEmailVerified
      }
      ... on LoginChoicePayload {
        message
        choices {
          schemaName
          businessName
        }
      }
    }
  }
`;

const LOGIN_WITH_BUSINESS_MUTATION = `
  mutation LoginWithBusiness($email: String!, $password: String!, $schemaName: String!) {
    loginWithBusiness(email: $email, password: $password, schemaName: $schemaName) {
      token
      userId
      name
      email
      roles
      permissions
      schemaName
      isEmailVerified
    }
  }
`;

export function AuthProvider({ children }) {
  const [token,           setToken]          = useState(null);
  const [schemaName,      setSchemaName]      = useState(null);
  const [userId,          setUserId]          = useState(null);
  const [name,            setName]            = useState(null);
  const [roles,           setRoles]           = useState([]);
  const [permissions,     setPermissions]     = useState([]);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [loading,         setLoading]         = useState(true);
  const [business,        setBusiness]        = useState(null);

  // --- PIN gate / local session state ---
  const [pinIsSet,    setPinIsSet]    = useState(null);
  const [pinVerified, setPinVerified] = useState(false);

  const clearSessionState = () => {
    setToken(null);
    setSchemaName(null);
    setUserId(null);
    setName(null);
    setRoles([]);
    setPermissions([]);
    setIsEmailVerified(true);
    setBusiness(null);
  };

  const loadCachedBusiness = async (sName) => {
    if (!sName) return;
    try {
      const cached = await AsyncStorage.getItem(`@business_info_${sName}`);
      if (cached) {
        setBusiness(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Failed to load cached business details:", e);
    }
  };

  const refreshBusiness = async (sName = schemaName) => {
    if (!sName) return;
    try {
      const details = await fetchBusinessDetails();
      if (details) {
        setBusiness(details);
        await AsyncStorage.setItem(`@business_info_${sName}`, JSON.stringify(details));
      }
    } catch (e) {
      // If offline, fallback silently to cached info already in state/AsyncStorage
    }
  };

  const updateBusinessLogoState = async (newLogoUrl, isOffline = false, fileObj = null) => {
    const updated = { ...(business || {}), logo: newLogoUrl };
    setBusiness(updated);
    if (schemaName) {
      await AsyncStorage.setItem(`@business_info_${schemaName}`, JSON.stringify(updated));
    }

    if (isOffline && fileObj) {
      await SyncQueue.enqueue("UPDATE_BUSINESS_LOGO", fileObj);
    }
  };

  const refreshPinStatus = async () => {
    const isSet = await hasPinSet();
    setPinIsSet(isSet);
    return isSet;
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const pairs  = await AsyncStorage.multiGet(AUTH_STORAGE_KEYS);
        const stored = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

        if (stored.token && stored.schemaName) {
          setToken(stored.token);
          setSchemaName(stored.schemaName);
          setRoles(stored.roles           ? JSON.parse(stored.roles)       : []);
          setPermissions(stored.permissions ? JSON.parse(stored.permissions) : []);
          setIsEmailVerified(
            stored.isEmailVerified !== null && stored.isEmailVerified !== undefined
              ? JSON.parse(stored.isEmailVerified)
              : true
          );
          await loadCachedBusiness(stored.schemaName);
          await refreshPinStatus();
          refreshBusiness(stored.schemaName);
        } else {
          await clearStoredSession();
          clearSessionState();
        }
      } catch (err) {
        await clearStoredSession();
        clearSessionState();
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    return subscribeToAuthFailure(() => {
      clearSessionState();
    });
  }, []);

  const applySession = async (result) => {
    const verified = result.isEmailVerified ?? true;

    await AsyncStorage.multiSet([
      ["token",           result.token],
      ["schemaName",      result.schemaName],
      ["roles",           JSON.stringify(result.roles)],
      ["permissions",     JSON.stringify(result.permissions)],
      ["isEmailVerified", JSON.stringify(verified)],
    ]);
    setToken(result.token);
    setSchemaName(result.schemaName);
    setUserId(result.userId       ?? null);
    setName(result.name           ?? null);
    setRoles(result.roles         ?? []);
    setPermissions(result.permissions ?? []);
    setIsEmailVerified(verified);

    await loadCachedBusiness(result.schemaName);
    await refreshPinStatus();
    refreshBusiness(result.schemaName);
  };

  const login = async (email, password) => {
    const data = await publicRequest(LOGIN_MUTATION, { email, password });
    const result = data.login;

    if (result.__typename === "LoginChoicePayload") {
      return {
        requiresChoice: true,
        message: result.message,
        choices: result.choices,
      };
    }

    await applySession(result);
    return { requiresChoice: false, ...result };
  };

  const loginWithBusiness = async (email, password, schemaName) => {
    const data = await publicRequest(LOGIN_WITH_BUSINESS_MUTATION, {
      email,
      password,
      schemaName,
    });

    const result = data.loginWithBusiness;
    await applySession(result);
    return result;
  };

  const googleSignIn = async (idToken, businessName = null) => {
    const data = await publicRequest(GOOGLE_AUTH_MUTATION, {
      idToken,
      ...(businessName ? { businessName } : {}),
    });

    const result = data.googleAuth;
    await applySession(result);
    return result;
  };

  const requestPasswordReset = async (email) => {
    const data = await publicRequest(`
      mutation RequestPasswordReset($email: String!) {
        requestPasswordReset(email: $email) {
          message
          email
        }
      }
    `, { email });
    return data.requestPasswordReset;
  };

  const resetPassword = async (email, pin, newPassword) => {
    const data = await publicRequest(`
      mutation ResetPassword($email: String!, $pin: String!, $newPassword: String!) {
        resetPassword(email: $email, pin: $pin, newPassword: $newPassword) {
          token userId name email
          roles permissions schemaName
        }
      }
    `, { email, pin, newPassword });

    const result = data.resetPassword;
    await applySession(result);
    return result;
  };

  const markEmailVerified = async () => {
    setIsEmailVerified(true);
    await AsyncStorage.setItem("isEmailVerified", JSON.stringify(true));
  };

  const logout = async () => {
    try {
      const pendingCount = await SyncQueue.getCount();
      if (pendingCount > 0) {
        console.warn(`User logging out with ${pendingCount} unsynced mutations.`);
      }
    } catch (e) {
      // Ignore count fetch errors during logout
    }

    await clearStoredSession();
    clearSessionState();
    setPinVerified(false);

    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
    } catch (err) {
      console.error("Failed to reset local database on logout:", err);
    }
  };

  const setDevicePin = async (pin) => {
    await setPinStorage(pin);
    setPinIsSet(true);
    setPinVerified(true);
  };

  const verifyDevicePin = async (pin) => {
    const result = await verifyPinStorage(pin);
    if (result.success) setPinVerified(true);
    return result;
  };

  const forgotPin = async () => {
    await clearPin();
    setPinIsSet(false);
    setPinVerified(false);
    await logout();
  };

  return (
    <AuthContext.Provider value={{
      token,
      schemaName,
      userId,
      name,
      roles,
      permissions,
      isEmailVerified,
      loading,
      isAuthenticated: !!token,
      business,
      refreshBusiness,
      updateBusinessLogoState,

      pinIsSet,
      pinVerified,
      setDevicePin,
      verifyDevicePin,
      forgotPin,

      login,
      loginWithBusiness,
      googleSignIn,
      logout,
      markEmailVerified,
      applySession,
      requestPasswordReset,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}