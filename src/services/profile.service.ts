import { api } from "@/services/api";
import { PROFILE, USER } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  AvatarUploadAsset,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UploadAvatarResponse,
  UserProfile,
  UserProfileApiData,
  UserProfileApiItem,
} from "@/types/profile";

type ProfileApiResponse = ApiResponse<UserProfileApiData>;

const guessFileName = (uri: string, fallback: string) => {
  const fromUri = uri.split("/").pop()?.split("?")[0];
  return fromUri && fromUri.includes(".") ? fromUri : fallback;
};

const guessMimeType = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "heic") return "image/heic";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
};

const toSafeString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const toOptionalString = (value: unknown) => toSafeString(value) || null;

const MONTH_INDEX_BY_NAME: Record<string, string> = {
  apr: "04",
  aug: "08",
  dec: "12",
  feb: "02",
  jan: "01",
  jul: "07",
  jun: "06",
  mar: "03",
  may: "05",
  nov: "11",
  oct: "10",
  sep: "09",
};

const toDateOnlyString = (value: unknown) => {
  const rawValue = toSafeString(value);

  if (!rawValue) {
    return null;
  }

  const isoDateMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const dateStringMatch = rawValue.match(/^(?:[A-Za-z]{3}\s+)?([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);

  if (dateStringMatch) {
    const [, monthName, day, year] = dateStringMatch;
    const month = MONTH_INDEX_BY_NAME[monthName.toLowerCase()];

    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  return rawValue;
};

const toOptionalBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
};

const isProfileEnvelope = (
  payload: UserProfileApiData,
): payload is {
  data?: UserProfileApiItem | null;
  profile?: UserProfileApiItem | null;
  user?: UserProfileApiItem | null;
} => Boolean(payload) && typeof payload === "object" && ("data" in payload || "profile" in payload || "user" in payload);

const getProfileFromEnvelope = (payload: UserProfileApiData): UserProfileApiItem => {
  if (isProfileEnvelope(payload)) {
    return payload.profile ?? payload.user ?? payload.data ?? {};
  }

  return payload;
};

const getFullName = (profile: UserProfileApiItem) => {
  const joined = [toSafeString(profile.firstName ?? profile.first_name), toSafeString(profile.lastName ?? profile.last_name)]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    toSafeString(profile.fullName) ||
    toSafeString(profile.full_name) ||
    toSafeString(profile.name) ||
    joined ||
    toSafeString(profile.email) ||
    "Salon Owner"
  );
};

const normalizeProfile = (profile: UserProfileApiItem): UserProfile => {
  const fullName = getFullName(profile);

  return {
    address: toOptionalString(profile.address ?? profile.address_line),
    avatarUrl: toOptionalString(profile.avatarUrl ?? profile.avatar_url ?? profile.avatar),
    businessName: toOptionalString(profile.businessName ?? profile.business_name ?? profile.salon_name),
    country: toOptionalString(profile.country),
    countryCode: toOptionalString(profile.countryCode ?? profile.country_code),
    dateOfBirth: toDateOnlyString(profile.dateOfBirth ?? profile.date_of_birth ?? profile.dob),
    email: toOptionalString(profile.email),
    firstName: toOptionalString(profile.firstName ?? profile.first_name),
    fullName,
    gender: toOptionalString(profile.gender ?? profile.sex),
    id: toSafeString(profile.id ?? profile._id),
    isActive: toOptionalBoolean(profile.isActive ?? profile.is_active),
    isVerified: toOptionalBoolean(profile.isVerified ?? profile.is_verified),
    lastName: toOptionalString(profile.lastName ?? profile.last_name),
    phone: toOptionalString(profile.phone ?? profile.phoneNumber ?? profile.phone_number ?? profile.mobile),
    role: toOptionalString(profile.role),
  };
};

const splitFullName = (fullName: string) => {
  const [firstName = "", ...lastNameParts] = fullName.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(" ") || null,
  };
};

const buildUpdatePayload = (payload: UpdateProfileRequest) => {
  const requestBody: Record<string, string | null> = {};

  if (payload.fullName !== undefined) {
    const { firstName, lastName } = splitFullName(payload.fullName);

    requestBody.firstName = firstName;
    requestBody.lastName = lastName;
  }

  if (payload.phone !== undefined) {
    requestBody.phone = payload.phone;
  }

  if (payload.gender !== undefined) {
    requestBody.gender = payload.gender || null;
  }

  if (payload.dateOfBirth !== undefined) {
    requestBody.dateOfBirth = payload.dateOfBirth || null;
  }

  if (payload.businessName !== undefined) {
    requestBody.businessName = payload.businessName;
  }

  if (payload.address !== undefined) {
    requestBody.address = payload.address;
  }

  return requestBody;
};

const extractAvatarUrl = (profile: UserProfileApiItem): string | null =>
  toOptionalString(profile.avatarUrl ?? profile.avatar_url ?? profile.avatar);

export const profileService = {
  async getProfile(userId: string): Promise<UserProfile> {
    const response = await api.get<ProfileApiResponse>(PROFILE.DETAIL(userId));

    return normalizeProfile(getProfileFromEnvelope(response.data.data));
  },

  async updateProfile(userId: string, payload: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    const response = await api.put<ProfileApiResponse>(PROFILE.DETAIL(userId), buildUpdatePayload(payload));

    return {
      message: response.data.message,
      profile: normalizeProfile(getProfileFromEnvelope(response.data.data)),
    };
  },

  async uploadAvatar(asset: AvatarUploadAsset): Promise<UploadAvatarResponse> {
    const fileName = asset.fileName?.trim() || guessFileName(asset.uri, "avatar.jpg");
    const mimeType = asset.mimeType?.trim() || guessMimeType(fileName);

    const formData = new FormData();
    // React Native FormData file part shape (uri/name/type).
    formData.append("avatar", {
      name: fileName,
      type: mimeType,
      uri: asset.uri,
    } as unknown as Blob);

    const response = await api.post<ProfileApiResponse>(`${USER.ME}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (data) => data,
    });

    const apiProfile = getProfileFromEnvelope(response.data.data);
    const normalizedProfile = normalizeProfile(apiProfile);
    // Prefer an avatar url found directly on the payload; fall back to the normalized profile.
    const avatarUrl = extractAvatarUrl(apiProfile) ?? normalizedProfile.avatarUrl;

    return {
      avatarUrl,
      message: response.data.message,
      profile: normalizedProfile.id ? normalizedProfile : null,
    };
  },
};
