// ── User entity ───────────────────────────────────────────────────────────────
import type { EntityId } from "./common.types";

export interface User {
  id: EntityId;
  email: string;
  fullName: string;
  phone?: string;
  businessName?: string;
  address?: string;
  country?: string;
  countryCode?: string;
  avatarUrl?: string;
  isOnboardingComplete?: boolean;
  custom_permissions?: Record<string, boolean> | null;
  /** Real-time resolved permission map computed by the backend (staff only) —
   * see permission.middleware.ts's getEffectivePermissionsForUser(). This is
   * usePermissions()'s primary source of truth, not custom_permissions. */
  effective_permissions?: Record<string, boolean> | null;
  role?: string;
  /** Staff's assigned role NAME from Roles & Permissions (e.g. "Manager",
   * "Staff") — display only. `role` above stays the fixed authorization
   * value ("staff" for any non-owner/admin account) — never "manager". */
  roleName?: string | null;
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface UpdateUserPayload {
  fullName?: string;
  phone?: string;
  businessName?: string;
  address?: string;
  country?: string;
  countryCode?: string;
  avatarUrl?: string;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface UserResponse {
  data: User;
}
