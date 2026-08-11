import type { AuthUser } from "@/types/auth";

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
  const salonRecord = asRecord(record.salon);
  const currentSalonRecord = asRecord(record.currentSalon);
  const activeSalonRecord = asRecord(record.activeSalon);

  return {
    id: toTrimmedString(record.id, record._id) ?? "",
    email: toTrimmedString(record.email) ?? "",
    role: toTrimmedString(record.role, record.userRole, record.user_role) ?? "",
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
    avatarUrl: toTrimmedString(record.avatarUrl, record.avatar_url, record.avatar),
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
    isOnboardingComplete: toOptionalBoolean(
      record.isOnboardingComplete,
      record.is_onboarding_complete,
    ),
    custom_permissions: toCustomPermissions(
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

export const summarizeAuthUser = (user: AuthUser | null | undefined) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    businessName: user.businessName,
    phone: user.phone,
    role: user.role,
    clientId: user.clientId,
    salonId: user.salonId,
    avatarUrl: user.avatarUrl,
    address: user.address,
    country: user.country,
    countryCode: user.countryCode,
    isVerified: user.isVerified,
    isActive: user.isActive,
    isOnboardingComplete: user.isOnboardingComplete,
    hasCustomPermissions:
      Array.isArray(user.custom_permissions)
        ? user.custom_permissions.length > 0
        : Boolean(user.custom_permissions),
  };
};
