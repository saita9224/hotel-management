// lib/graphql.js

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─────────────────────────────────────────────────────────────
// HOST CONFIGURATION
// ─────────────────────────────────────────────────────────────
//
// DEVELOPMENT
// Uses your laptop LAN IP so Expo on your phone can reach Django.
//
// IMPORTANT:
// Run Django using:
//
// python manage.py runserver 0.0.0.0:8000
//
// PROD
// Uses real tenant subdomains:
// hoppers.yourdomain.com/graphql/
// ─────────────────────────────────────────────────────────────

const __DEV__ = process.env.NODE_ENV !== "production";

const BASE_HOST = __DEV__
  ? "10.245.13.69:8000"
  : "yourdomain.com";

const PROTOCOL = __DEV__ ? "http" : "https";

// ─────────────────────────────────────────────────────────────
// PUBLIC URL
// Used BEFORE login:
// - login
// - registration
// - OTP verification
// - google auth
// ─────────────────────────────────────────────────────────────

const PUBLIC_URL = `${PROTOCOL}://${BASE_HOST}/auth/`;

// ─────────────────────────────────────────────────────────────
// TENANT GRAPHQL URL
//
// DEV:
// Uses ONE shared URL because subdomains do NOT work
// reliably with LAN IPs.
//
// PROD:
// Uses real tenant subdomains.
// ─────────────────────────────────────────────────────────────

const buildTenantUrl = (schemaName) => {
  if (__DEV__) {
    return `${PROTOCOL}://${BASE_HOST}/graphql/`;
  }

  return `${PROTOCOL}://${schemaName}.${BASE_HOST}/graphql/`;
};

// ─────────────────────────────────────────────────────────────
// CORE FETCH
// ─────────────────────────────────────────────────────────────

async function _fetch(
  url,
  query,
  variables = {},
  token = null,
  schemaName = null
) {
  const headers = {
    "Content-Type": "application/json",
  };

  // Add auth token if available
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // DEV:
// Send tenant using custom header
//
// Your Django middleware must read:
// request.headers.get("X-Tenant")
//
// PROD:
// Optional, but still okay to send
  if (schemaName) {
    headers["X-Tenant"] = schemaName;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const text = await response.text();

    console.error("HTTP ERROR:", text);

    throw new Error(`Network error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors?.length > 0) {
    console.error("GRAPHQL ERRORS:", json.errors);

    throw new Error(
      json.errors[0]?.message || "GraphQL request failed."
    );
  }

  return json.data;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC REQUEST
// ─────────────────────────────────────────────────────────────

export async function publicRequest(query, variables = {}) {
  try {
    return await _fetch(
      PUBLIC_URL,
      query,
      variables,
      null,
      null
    );
  } catch (error) {
    console.error("publicRequest error:", error.message);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// AUTHENTICATED TENANT REQUEST
// ─────────────────────────────────────────────────────────────

export async function graphqlRequest(query, variables = {}) {
  try {
    const pairs = await AsyncStorage.multiGet([
      "token",
      "schemaName",
    ]);

    const token = pairs[0][1];
    const schemaName = pairs[1][1];

    if (!schemaName) {
      throw new Error(
        "No schemaName found in storage."
      );
    }

    const url = buildTenantUrl(schemaName);

    return await _fetch(
      url,
      query,
      variables,
      token,
      schemaName
    );
  } catch (error) {
    console.error(
      "graphqlRequest error:",
      error.message
    );

    throw error;
  }
}