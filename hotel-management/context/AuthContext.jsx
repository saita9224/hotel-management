// context/AuthContext.jsx

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { publicRequest } from "../lib/graphql";
import {
  AUTH_STORAGE_KEYS,
  clearStoredSession,
  subscribeToAuthFailure,
} from "../lib/authSession";

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

// login now returns a union — LoginPayload (normal session) or
// LoginChoicePayload (email+password valid in 2+ businesses).
// __typename lets us tell which one came back; inline fragments
// select the fields specific to each branch.
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

  const clearSessionState = () => {
    setToken(null);
    setSchemaName(null);
    setUserId(null);
    setName(null);
    setRoles([]);
    setPermissions([]);
    setIsEmailVerified(true);
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
        } else {
          await clearStoredSession();
          clearSessionState();
        }
      } catch (err) {
        console.error("Session restore failed:", err);
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
  };

  // Returns either:
  //   { requiresChoice: false, ...sessionResult }  — normal login, already applied
  //   { requiresChoice: true, message, choices }   — caller must show a picker,
  //                                                    then call loginWithBusiness
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

  // Second step of the disambiguation flow — client already knows
  // (from a prior login() choice response) which schemaName to use.
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
    await clearStoredSession();
    clearSessionState();
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