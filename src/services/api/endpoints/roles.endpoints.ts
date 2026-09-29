export const PERMISSIONS_CATALOG = {
  BASE: "/api/v1/permissions",
} as const;

export const ROLES = {
  BASE: "/api/v1/roles",
  BY_ID: (id: string) => `/api/v1/roles/${id}`,
  DUPLICATE: (id: string) => `/api/v1/roles/${id}/duplicate`,
  AUDIT_LOG: "/api/v1/roles/audit-log",
} as const;

export const STAFF_PERMISSIONS = {
  EFFECTIVE: (staffId: string) => `/api/v1/staff/${staffId}/permissions`,
  SET_OVERRIDES: (staffId: string) => `/api/v1/staff/${staffId}/permissions`,
  ASSIGN_ROLE: (staffId: string) => `/api/v1/staff/${staffId}/role`,
  BULK_ASSIGN_ROLE: "/api/v1/staff/bulk/role",
  BULK_RESET_OVERRIDES: "/api/v1/staff/bulk/reset-overrides",
} as const;
