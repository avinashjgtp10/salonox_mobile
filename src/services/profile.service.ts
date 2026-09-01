import { ApiError, api } from "@/services/api";
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
    email: toOptionalString(profile.email),
    firstName: toOptionalString(profile.firstName ?? profile.first_name),
    fullName,
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
    requestBody.phone = payload.phone.trim() || null;
  }

  if (payload.businessName !== undefined) {
    requestBody.businessName = payload.businessName.trim() || null;
  }

  if (payload.address !== undefined) {
    requestBody.address = payload.address.trim() || null;
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
      transformRequest: (data) => data,
    });

    const apiProfile = getProfileFromEnvelope(response.data.data);
    const normalizedProfile = normalizeProfile(apiProfile);
    // Prefer an avatar url found directly on the payload; fall back to the normalized profile.
    const avatarUrl = extractAvatarUrl(apiProfile) ?? normalizedProfile.avatarUrl;

    if (!avatarUrl) {
      throw new ApiError("The server did not return an uploaded image URL.", response.status);
    }

    return {
      avatarUrl,
      message: response.data.message,
      profile: normalizedProfile.id ? normalizedProfile : null,
    };
  },
};
