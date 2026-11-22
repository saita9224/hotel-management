// services/businessService.js

import AsyncStorage from "@react-native-async-storage/async-storage";
import { graphqlRequest, graphqlUploadRequest, API_BASE_URL } from "../lib/graphql";

export const GET_BUSINESS_QUERY = `
  query GetBusiness {
    business {
      id
      name
      logo
    }
  }
`;

// Backend returns the business fields directly on updateBusinessLogo
// (NOT nested under `business`).
export const UPDATE_BUSINESS_LOGO_MUTATION = `
  mutation UpdateBusinessLogo($logo: Upload!) {
    updateBusinessLogo(logo: $logo) {
      id
      name
      logo
    }
  }
`;

const LOGO_UPLOAD_URL = `${API_BASE_URL}/api/tenants/upload-logo/`;

/**
 * Backend may return http:// logo URLs behind Nginx TLS termination
 * (SECURE_PROXY_SSL_HEADER not set). Force https for remote URLs.
 */
export function normalizeLogoUrl(url) {
  if (typeof url !== "string" || !url) return url || null;
  if (url.startsWith("http://")) return url.replace(/^http:/, "https:");
  return url;
}

/**
 * Fetch current business/tenant info (ID, name, logo URL)
 */
export async function fetchBusinessDetails() {
  try {
    const data = await graphqlRequest(GET_BUSINESS_QUERY);
    const business = data?.business || null;
    if (business?.logo) {
      business.logo = normalizeLogoUrl(business.logo);
    }
    return business;
  } catch (error) {
    console.error("Failed to fetch business details:", error);
    throw error;
  }
}

/**
 * Upload a new business logo via the REST endpoint (recommended by backend).
 * POST /api/tenants/upload-logo/  (multipart/form-data, field name "logo")
 * @param {Object} fileObject - { uri, name, type }
 * @returns {Promise<{ logoUrl: string, businessName: string }>}
 */
export async function uploadBusinessLogoREST(fileObject) {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("No auth token found in storage.");
  }

  const formData = new FormData();
  formData.append("logo", {
    uri: fileObject.uri,
    name: fileObject.name || `logo_${Date.now()}.jpg`,
    type: fileObject.type || "image/jpeg",
  });

  const response = await fetch(LOGO_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    // Do NOT set Content-Type — fetch generates the multipart boundary
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Logo upload failed (${response.status})`);
  }

  const logoUrl = normalizeLogoUrl(data?.logo_url);
  if (!logoUrl) {
    throw new Error("Upload succeeded but no logo_url returned.");
  }

  return { logoUrl, businessName: data?.business_name || null };
}

/**
 * Upload a new business logo via GraphQL multipart mutation (fallback path).
 * @param {Object} fileObject - { uri, name, type }
 * @returns {Promise<{ id, name, logo }>}
 */
export async function uploadBusinessLogoGraphQL(fileObject) {
  try {
    const data = await graphqlUploadRequest(
      UPDATE_BUSINESS_LOGO_MUTATION,
      { logo: null },
      {
        "0": {
          path: "variables.logo",
          file: fileObject,
        },
      }
    );

    const updatedBusiness = data?.updateBusinessLogo || null;
    if (updatedBusiness?.logo) {
      updatedBusiness.logo = normalizeLogoUrl(updatedBusiness.logo);
    }
    return updatedBusiness;
  } catch (error) {
    console.error("Failed to upload business logo via GraphQL:", error);
    throw error;
  }
}

/**
 * Upload logo: REST first (backend-recommended), GraphQL multipart as fallback.
 * @param {Object} fileObject - { uri, name, type }
 * @returns {Promise<{ logoUrl: string, business?: Object }>}
 */
export async function uploadBusinessLogo(fileObject) {
  try {
    const result = await uploadBusinessLogoREST(fileObject);
    return { logoUrl: result.logoUrl, business: null };
  } catch (restError) {
    console.warn("REST logo upload failed, trying GraphQL:", restError?.message);
    const business = await uploadBusinessLogoGraphQL(fileObject);
    if (!business?.logo) {
      throw new Error("Logo upload failed on both REST and GraphQL paths.");
    }
    return { logoUrl: business.logo, business };
  }
}
