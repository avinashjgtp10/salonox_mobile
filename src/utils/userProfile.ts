import type { AuthUser } from "@/types/auth";

export const DEFAULT_BUSINESS_NAME = "SalonOX";
export const DEFAULT_USER_INITIALS = "SO";

const toCleanValue = (value?: string | null) => {
  const nextValue = value?.trim();

  return nextValue ? nextValue : null;
};

export const getUserFullName = (user: AuthUser | null) => {
  const fullName = toCleanValue(user?.fullName);

  if (fullName) {
    return fullName;
  }

  const joinedName = [toCleanValue(user?.firstName), toCleanValue(user?.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (joinedName) {
    return joinedName;
  }

  return toCleanValue(user?.email) ?? "Salon Owner";
};

export const getUserBusinessName = (user: AuthUser | null) =>
  toCleanValue(user?.businessName) ?? DEFAULT_BUSINESS_NAME;

export const getUserRoleLabel = (user: AuthUser | null) =>
  toCleanValue(user?.role) ?? "Salon Dashboard";

// The backend role enum is undocumented in-repo, so this only blocks roles we
// can positively identify as non-privileged rather than requiring an allow-list
// — an unrecognized/missing role fails open, consistent with the rest of the
// app's defensive handling of the unconfirmed role contract.
const NON_PRIVILEGED_STAFF_ROLES = ["staff", "employee", "stylist", "team_member", "team-member"];

export const canManageStaffLifecycle = (role?: string | null) => {
  const normalizedRole = (role ?? "").trim().toLowerCase();

  if (!normalizedRole) {
    return true;
  }

  return !NON_PRIVILEGED_STAFF_ROLES.includes(normalizedRole);
};

// Commission settlement (POST /staff/commissions/:staffId/mark-paid) is
// gated server-side by roleMiddleware("salon_owner", "admin") only — there is
// no custom-permission escape hatch for "staff" on that route, unlike the
// granular requirePermission() checks used elsewhere. A staff-role user who
// passes this check would still get a 403 from the backend, so this must
// mirror the same owner/admin-only rule exactly rather than special-casing a
// "commission.settle" custom permission that the backend doesn't recognize.
export const canSettleCommission = (role?: string | null) => {
  const normalizedRole = (role ?? "").trim().toLowerCase();

  return normalizedRole === "salon_owner" || normalizedRole === "admin";
};

export const getUserInitials = (user: AuthUser | null) => {
  const nameSeed = getUserFullName(user);
  const initials = nameSeed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || DEFAULT_USER_INITIALS;
};

export const getUserAddressLine = (user: AuthUser | null) =>
  toCleanValue(user?.address) ?? "Address not added yet";
