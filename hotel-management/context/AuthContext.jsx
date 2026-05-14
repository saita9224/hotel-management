// context/AuthContext.jsx

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { publicRequest } from "../lib/graphql";

const AuthContext = createContext();

const STORAGE_KEYS = ["token", "schemaName", "roles", "permissions"];

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

export function AuthProvider({ children }) {
  const [token,           setToken]          = useState(null);
  const [schemaName,      setSchemaName]      = useState(null);
  const [userId,          setUserId]          = useState(null);
  const [name,            setName]            = useState(null);
  const [roles,           setRoles]           = useState([]);
  const [permissions,     setPermissions]     = useState([]);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [loading,         setLoading]         = useState(true);

  // ─── Restore session on app boot ────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const pairs  = await AsyncStorage.multiGet(STORAGE_KEYS);
        const stored = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

        if (stored.token) {
          setToken(stored.token);
          setSchemaName(stored.schemaName);
          setRoles(stored.roles           ? JSON.parse(stored.roles)       : []);
          setPermissions(stored.permissions ? JSON.parse(stored.permissions) : []);
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ─── Shared session writer ───────────────────────────────
  // Called by login, googleSignIn, and register (via applySession).
  // Writes to AsyncStorage and updates all context state in one call.
  // Exposed as applySession so register.jsx can call it directly
  // without duplicating storage logic.
  const applySession = async (result) => {
    await AsyncStorage.multiSet([
      ["token",       result.token],
      ["schemaName",  result.schemaName],
      ["roles",       JSON.stringify(result.roles)],
      ["permissions", JSON.stringify(result.permissions)],
    ]);
    setToken(result.token);
    setSchemaName(result.schemaName);
    setUserId(result.userId   ?? null);
    setName(result.name       ?? null);
    setRoles(result.roles     ?? []);
    setPermissions(result.permissions ?? []);
  };

  // ─── Email + password login ──────────────────────────────
  const login = async (email, password) => {
    const data = await publicRequest(`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token userId name email
          roles permissions schemaName isEmailVerified
        }
      }
    `, { email, password });

    const result = data.login;
    await applySession(result);
    setIsEmailVerified(result.isEmailVerified);
    return result;
  };

  // ─── Google Sign-In ──────────────────────────────────────
  // idToken comes from expo-auth-session (login.jsx).
  // businessName is only passed when registering a new business
  // via Google — omit it for returning users.
  const googleSignIn = async (idToken, businessName = null) => {
    const data = await publicRequest(GOOGLE_AUTH_MUTATION, {
      idToken,
      ...(businessName ? { businessName } : {}),
    });

    const result = data.googleAuth;
    await applySession(result);
    setIsEmailVerified(true); // Google users are always verified
    return result;            // caller can check result.isNewUser if needed
  };

  // ─── Mark email verified (called from verify-email.jsx) ──
  const markEmailVerified = () => setIsEmailVerified(true);

  // ─── Logout ──────────────────────────────────────────────
  const logout = async () => {
    await AsyncStorage.multiRemove(STORAGE_KEYS);
    setToken(null);
    setSchemaName(null);
    setUserId(null);
    setName(null);
    setRoles([]);
    setPermissions([]);
    setIsEmailVerified(true);
  };

  return (
    <AuthContext.Provider value={{
      // State
      token,
      schemaName,
      userId,
      name,
      roles,
      permissions,
      isEmailVerified,
      loading,
      isAuthenticated: !!token,

      // Actions
      login,
      googleSignIn,
      logout,
      markEmailVerified,
      applySession,     // exposed so register.jsx can write session
                        // after verifyRegistration without duplicating
                        // AsyncStorage logic
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}