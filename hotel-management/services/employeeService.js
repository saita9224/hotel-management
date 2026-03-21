// services/employeeService.js

import { graphqlRequest } from "../lib/graphql";


// ======================================================
// NORMALIZERS
// ======================================================

const normalizeGroupedPermissions = (group) => ({
  app:   group.app,
  label: group.label,
  permissions: (group.permissions ?? []).map((p) => ({
    code:         p.code,
    display_name: p.displayName,
    description:  p.description,
  })),
});


// ======================================================
// FETCH GROUPED PERMISSIONS
// Used by the employee onboarding UI to show permissions
// grouped by app with human-readable labels.
// ======================================================

export const fetchGroupedPermissionsService = async () => {
  const data = await graphqlRequest(`
    query {
      groupedPermissions {
        app
        label
        permissions {
          code
          displayName
          description
        }
      }
    }
  `);
  return (data?.groupedPermissions ?? []).map(normalizeGroupedPermissions);
};


// ======================================================
// ONBOARD EMPLOYEE — SINGLE ATOMIC MUTATION
//
// Replaces the previous multi-call approach.
// One GraphQL round trip — full rollback on failure.
// Backend creates employee, personal role, assigns all
// permissions, and links role to employee atomically.
// ======================================================

export const createEmployeeWithPermissionsService = async ({
  name,
  email,
  phone,
  password,
  permission_codes,
}) => {
  const data = await graphqlRequest(
    `
    mutation($data: OnboardEmployeeInput!) {
      onboardEmployee(data: $data) {
        id name email phone
      }
    }
  `,
    {
      data: {
        name,
        email,
        phone:           phone ?? null,
        password,
        permissionCodes: permission_codes,
      },
    }
  );

  const employee = data?.onboardEmployee;
  if (!employee?.id) throw new Error("Employee onboarding failed.");
  return employee;
};