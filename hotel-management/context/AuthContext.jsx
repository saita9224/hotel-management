import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { graphqlRequest } from "../lib/graphql";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------
  // Restore session on app start
  // -------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedRoles = await AsyncStorage.getItem("roles");
        const storedPermissions = await AsyncStorage.getItem("permissions");

        if (storedToken) {
          setToken(storedToken);
          setRoles(storedRoles ? JSON.parse(storedRoles) : []);
          setPermissions(storedPermissions ? JSON.parse(storedPermissions) : []);
        }
      } catch (err) {
        console.error("Session restore failed:", err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // -------------------------------------------------
  // LOGIN
  // -------------------------------------------------
  const login = async (email, password) => {
    const LOGIN_MUTATION = `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          userId
          name
          roles
          permissions
        }
      }
    `;

    const data = await graphqlRequest(LOGIN_MUTATION, { email, password });

    const { token, roles, permissions } = data.login;

    // Persist
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("roles", JSON.stringify(roles));
    await AsyncStorage.setItem("permissions", JSON.stringify(permissions));

    // Update state
    setToken(token);
    setRoles(roles);
    setPermissions(permissions);
  };

  // -------------------------------------------------
  // LOGOUT
  // -------------------------------------------------
  const logout = async () => {
    await AsyncStorage.multiRemove(["token", "roles", "permissions"]);
    setToken(null);
    setRoles([]);
    setPermissions([]);
  };

  const value = {
    token,
    roles,
    permissions,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
