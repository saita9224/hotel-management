// lib/graphql.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { handleAuthFailure } from "./authSession";

// ─────────────────────────────────────────────────────────────
// HOST CONFIGURATION
// ─────────────────────────────────────────────────────────────
//
// Which backend to hit is controlled explicitly by
// EXPO_PUBLIC_API_ENV, NOT by __DEV__ (which only reflects
// whether the Metro dev bundler is running — you can be on
// the dev bundler and still want to test production).
//
// Set in .env or via `EXPO_PUBLIC_API_ENV=production npx expo start`:
//   EXPO_PUBLIC_API_ENV=local        -> laptop LAN IP
//   EXPO_PUBLIC_API_ENV=production   -> api.bizzman.hoppers.ink
//
// Defaults to "production" if unset, so a real release build
// with no env var set does the safe thing.
// ─────────────────────────────────────────────────────────────

const API_ENV = process.env.EXPO_PUBLIC_API_ENV ?? "production";
const IS_LOCAL = API_ENV === "local";

const BASE_HOST = IS_LOCAL
  ? "172.22.236.69:8000"
  : "api.bizzman.hoppers.ink";

const PROTOCOL = IS_LOCAL ? "http" : "https";

// ...rest of the file (PUBLIC_URL, GRAPHQL_URL, _fetch, publicRequest,
// graphqlRequest) stays exactly the same, just with IS_LOCAL used
// anywhere __DEV__ was used before. ? "http" : "https";

// ─────────────────────────────────────────────────────────────
// PUBLIC URL — used BEFORE login: login, registration, OTP, google auth
// ─────────────────────────────────────────────────────────────

const PUBLIC_URL = `${PROTOCOL}://${BASE_HOST}/auth/`;

// ─────────────────────────────────────────────────────────────
// TENANT GRAPHQL URL
//
// Always the same host, dev or prod. The JWT alone determines
// which tenant schema the backend executes against — this app
// never needs to construct a tenant-specific host.
// ─────────────────────────────────────────────────────────────

const GRAPHQL_URL = `${PROTOCOL}://${BASE_HOST}/graphql/`;

// ─────────────────────────────────────────────────────────────
// CORE FETCH
// ─────────────────────────────────────────────────────────────

async function _fetch(url, query, variables = {}, token = null, schemaName = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // X-Tenant is now just a fallback for non-JWT requests
  // (the backend's XTenantMiddleware). Harmless to keep sending.
  if (schemaName) {
    headers["X-Tenant"] = schemaName;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Network error: ${response.status}`);
  }

  const json = await response.json();

  if (json.errors?.length > 0) {

    if (
      json.errors.some((error) =>
        String(error?.message ?? "").toLowerCase().includes("authentication required")
      )
    ) {
      await handleAuthFailure();
    }

    throw new Error(json.errors[0]?.message || "GraphQL request failed.");
  }

  return json.data;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC REQUEST
// ─────────────────────────────────────────────────────────────

export async function publicRequest(query, variables = {}) {
  try {
    return await _fetch(PUBLIC_URL, query, variables, null, null);
  } catch (error) {
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// AUTHENTICATED TENANT REQUEST
// ─────────────────────────────────────────────────────────────

export async function graphqlRequest(query, variables = {}) {
  try {
    const pairs = await AsyncStorage.multiGet(["token", "schemaName"]);
    const token = pairs[0][1];
    const schemaName = pairs[1][1];

    if (!token) {
      throw new Error("No auth token found in storage.");
    }

    // schemaName is no longer required to build the URL — it's
    // only sent as the X-Tenant fallback header.
    if (!schemaName) {
      // Relying on JWT-based tenant resolution
    }

    return await _fetch(GRAPHQL_URL, query, variables, token, schemaName);
  } catch (error) {
    throw error;
  }
}