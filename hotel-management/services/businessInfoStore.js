// services/businessInfoStore.js
// Persists per-tenant business info (name + logo state) in WatermelonDB,
// conforming with the rest of the app's local-first storage.
// Falls back to the legacy AsyncStorage key on first read for migration.

import { Q } from "@nozbe/watermelondb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import database from "../database";

const LEGACY_KEY = (schemaName) => `@business_info_${schemaName}`;

async function findRecord(schemaName) {
  const records = await database
    .get("business_info")
    .query(Q.where("schema_name", schemaName))
    .fetch();
  return records[0] || null;
}

function recordToInfo(record) {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name || null,
    logo: record.logo || null,
    logoLocalUri: record.logoLocalUri || null,
    logoPending: Boolean(record.logoPending),
    updatedAt: record.updatedAt || null,
  };
}

/**
 * Get cached business info for a tenant.
 * Checks WatermelonDB first, then migrates/reads the legacy AsyncStorage key.
 */
export async function getBusinessInfo(schemaName) {
  if (!schemaName) return null;
  try {
    const record = await findRecord(schemaName);
    if (record) return recordToInfo(record);
  } catch (e) {
    console.warn("business_info WM read failed:", e);
  }

  // Legacy AsyncStorage fallback (pre-WatermelonDB installs)
  try {
    const cached = await AsyncStorage.getItem(LEGACY_KEY(schemaName));
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn("business_info AsyncStorage fallback failed:", e);
  }
  return null;
}

/**
 * Upsert business info for a tenant into WatermelonDB.
 * @param {string} schemaName
 * @param {Object} info - { name, logo, logoLocalUri, logoPending }
 */
export async function saveBusinessInfo(schemaName, info) {
  if (!schemaName) return;
  await database.write(async () => {
    const existing = await findRecord(schemaName);
    const fields = {
      name: info.name ?? null,
      logo: info.logo ?? null,
      logoLocalUri: info.logoLocalUri ?? null,
      logoPending: Boolean(info.logoPending),
      updatedAt: Date.now(),
    };
    if (existing) {
      await existing.update((record) => {
        Object.assign(record, fields);
      });
    } else {
      await database.get("business_info").create((record) => {
        record.schemaName = schemaName;
        Object.assign(record, fields);
      });
    }
  });
}
