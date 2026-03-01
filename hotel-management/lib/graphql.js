// lib/graphql.js

import AsyncStorage from "@react-native-async-storage/async-storage";

const GRAPHQL_URL = "http://172.20.109.69:8000/graphql/";
// Android emulator → use your local network IP (NOT localhost)
// iOS simulator → http://localhost:8000/graphql/

export async function graphqlRequest(query, variables = {}) {
  try {
    const token = await AsyncStorage.getItem("token");
    
    
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const json = await response.json();

    // 🔴 GraphQL-level errors
    if (json.errors && json.errors.length > 0) {
      const message =
        json.errors[0]?.message || "GraphQL request failed.";
      throw new Error(message);
    }

    return json.data;
  } catch (error) {
    console.log("GraphQL Request Error:", error.message);
    throw error;
  }
}