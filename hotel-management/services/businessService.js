// services/businessService.js

import { graphqlRequest, graphqlUploadRequest } from "../lib/graphql";

export const GET_BUSINESS_QUERY = `
  query GetBusiness {
    business {
      id
      name
      logo
    }
  }
`;

export const UPDATE_BUSINESS_LOGO_MUTATION = `
  mutation UpdateBusinessLogo($logo: Upload!) {
    updateBusinessLogo(logo: $logo) {
      business {
        id
        name
        logo
      }
    }
  }
`;

/**
 * Fetch current business/tenant info (ID, name, logo URL)
 */
export async function fetchBusinessDetails() {
  try {
    const data = await graphqlRequest(GET_BUSINESS_QUERY);
    return data?.business || null;
  } catch (error) {
    console.error("Failed to fetch business details:", error);
    throw error;
  }
}

/**
 * Upload a new business logo via GraphQL upload mutation.
 * @param {Object} fileObject - { uri, name, type }
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

    const updatedBusiness = data?.updateBusinessLogo?.business;
    return updatedBusiness || null;
  } catch (error) {
    console.error("Failed to upload business logo via GraphQL:", error);
    throw error;
  }
}
