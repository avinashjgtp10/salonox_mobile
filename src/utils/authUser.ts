import type { AuthUser } from "@/types/auth";
import { environmentConfig } from "@/config/environment";
import { resolveMediaUrl, withMediaVersion } from "@/utils/mediaUrl";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : {};

const toTrimmedString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmedValue = value.trim();

      if (trimmedValue) {
        return trimmedValue;
      }
    }
  }

  return null;
};

const toOptionalBoolean = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return undefined;
};

const toCustomPermissions = (...values: unknown[]) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value as string[];
    }

    if (typeof value === "object" && value !== null) {
      return value as Record<string, unknown>;
    }
  }

  return null;
};

export const normalizeAuthUser = (value: unknown): AuthUser => {
  const record = asRecord(value);
  const effectivePermissions = toCustomPermissions(record.effective_permissions, record.effectivePermissions);
  const effective = asRecord(effectivePermissions);
  const salonRecord = asRecord(record.salon);
  const currentSalonRecord = asRecord(record.currentSalon);
  const activeSalonRecord = asRecord(record.activeSalon);

  return {
    id: toTrimmedString(record.id, record._id) ?? "",
    email: toTrimmedString(record.email) ?? "",
    role: toTrimmedString(record.role, record.userRole, record.user_role) ?? "",
    roleName: toTrimmedString(record.roleName, record.role_name),
    phone: toTrimmedString(
      record.phone,
      record.phoneNumber,
      record.phone_number,
      record.mobile,
      record.mobileNumber,
      record.mobile_number,
    ),
    firstName: toTrimmedString(record.firstName, record.first_name),
    lastName: toTrimmedString(record.lastName, record.last_name),
    fullName: toTrimmedString(record.fullName, record.full_name, record.name),
    avatarUrl: withMediaVersion(
      resolveMediaUrl(toTrimmedString(record.avatarUrl, record.avatar_url, record.avatar), environmentConfig.apiBaseUrl),
      record.updatedAt ?? record.updated_at,
    ),
    businessName: toTrimmedString(
      record.businessName,
      record.business_name,
      record.salonName,
      record.salon_name,
    ),
    address: toTrimmedString(
      record.address,
      record.addressLine,
      record.address_line,
      record.address1,
      record.address_1,
    ),
    country: toTrimmedString(record.country),
    countryCode: toTrimmedString(record.countryCode, record.country_code),
    isVerified: toOptionalBoolean(
      record.isVerified,
      record.is_verified,
      record.isEmailVerified,
      record.is_email_verified,
      record.emailVerified,
      record.email_verified,
      record.verified,
    ),
    isActive: toOptionalBoolean(record.isActive, record.is_active),
    // Must survive a save/load round trip: the staff write guard in
    // services/api reads the stored user, and dropping this flag made every
    // Calendar Quick Sale payment fail as "read-only".
    mobileCalendarAccess: effective.view_calendar === true && effective.access_quick_sale === true,
    mobileProductAuditAccess: effective.view_product_audit === true && effective.create_product_audit === true,
    mobileClientNameAccess: effective.view_clients === true,
    isOnboardingComplete: toOptionalBoolean(
      record.isOnboardingComplete,
      record.is_onboarding_complete,
    ),
    effective_permissions: effectivePermissions as Record<string, boolean> | null,
    custom_permissions: effectivePermissions ?? toCustomPermissions(
      record.custom_permissions,
      record.customPermissions,
    ),
    clientId: toTrimmedString(
      record.clientId,
      record.client_id,
      asRecord(record.client).id,
      asRecord(record.client)._id,
      asRecord(record.profile).clientId,
      asRecord(record.profile).client_id,
    ),
    salonId: toTrimmedString(
      record.salonId,
      record.salon_id,
      salonRecord.id,
      salonRecord._id,
      salonRecord.salonId,
      salonRecord.salon_id,
      currentSalonRecord.id,
      currentSalonRecord._id,
      currentSalonRecord.salonId,
      currentSalonRecord.salon_id,
      activeSalonRecord.id,
      activeSalonRecord._id,
      activeSalonRecord.salonId,
      activeSalonRecord.salon_id,
    ),
  };
};

export const preserveSalonId = (
  incomingUser: AuthUser,
  fallbackUser: AuthUser | null | undefined,
): AuthUser => {
  if (incomingUser.salonId) {
    return incomingUser;
  }

  if (!fallbackUser?.salonId) {
    return incomingUser;
  }

  return {
    ...incomingUser,
    salonId: fallbackUser.salonId,
  };
};

// Compatibility for existing consumers; normalized web permissions take precedence.
export const preserveMobileCalendarAccess = (
  incomingUser: AuthUser,
  fallbackUser: AuthUser | null | undefined,
): AuthUser => {
  if (!fallbackUser || fallbackUser.id !== incomingUser.id) {
    return incomingUser;
  }

  return {
    ...incomingUser,
    mobileCalendarAccess: incomingUser.mobileCalendarAccess ?? fallbackUser.mobileCalendarAccess,
    mobileProductAuditAccess: incomingUser.mobileProductAuditAccess ?? fallbackUser.mobileProductAuditAccess,
    mobileClientNameAccess: incomingUser.mobileClientNameAccess ?? fallbackUser.mobileClientNameAccess,
  };
};
