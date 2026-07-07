import { api } from "@/services/api";
import { USER } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  DeleteUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UpdateUserRoleResponse,
  UserApiItem,
  UserDetail,
  UserDetailApiData,
  UserDetailApiItem,
  UserDetailField,
  UserListApiData,
  UserListItem,
  UserListPagination,
  UserListQuery,
  UserListResponse,
} from "@/types/user";

type UserListApiResponse = ApiResponse<UserListApiData>;
type UserDetailApiResponse = ApiResponse<UserDetailApiData>;

const AVATAR_PALETTE = [
  { background: "#FBF3E5", color: "#8A5A0E" },
  { background: "#EAF5EF", color: "#2E7049" },
  { background: "#F1EEF8", color: "#6B52C1" },
  { background: "#FAECE7", color: "#712B13" },
  { background: "#EEF4F1", color: "#365046" },
] as const;

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

const toSafeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
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

  return false;
};

const getUserArray = (payload: UserListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.users ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const getTotalCount = (payload: UserListApiData, fallbackCount: number) => {
  if (Array.isArray(payload)) {
    return fallbackCount;
  }

  return (
    toSafeNumber(payload.totalCount) ||
    toSafeNumber(payload.total_count) ||
    toSafeNumber(payload.total) ||
    toSafeNumber(payload.count) ||
    toSafeNumber(payload.pagination?.totalCount) ||
    toSafeNumber(payload.pagination?.total_count) ||
    toSafeNumber(payload.pagination?.total) ||
    fallbackCount
  );
};

const getFullName = (user: UserApiItem) => {
  const joined = [toSafeString(user.firstName ?? user.first_name), toSafeString(user.lastName ?? user.last_name)]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    toSafeString(user.fullName) ||
    toSafeString(user.full_name) ||
    toSafeString(user.name) ||
    joined ||
    toSafeString(user.email) ||
    "User"
  );
};

const getInitials = (fullName: string) => {
  const parts = fullName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "US";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

const getIsActive = (user: UserApiItem) => {
  if (typeof user.isActive === "boolean") {
    return user.isActive;
  }

  if (typeof user.is_active === "boolean") {
    return user.is_active;
  }

  const status = toSafeString(user.status).toLowerCase();

  if (status) {
    return status !== "inactive" && status !== "disabled" && status !== "suspended";
  }

  return true;
};

const getStatusLabel = (user: UserApiItem, isActive: boolean) => {
  const rawStatus = toSafeString(user.status);

  if (rawStatus) {
    return rawStatus.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
  }

  return isActive ? "Active" : "Inactive";
};

const formatCreatedDate = (createdAt: string | null) => {
  if (!createdAt) {
    return "-";
  }

  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const normalizeUser = (user: UserApiItem): UserListItem => {
  const fullName = getFullName(user);
  const isActive = getIsActive(user);

  return {
    avatarUrl: toSafeString(user.avatarUrl ?? user.avatar_url ?? user.avatar) || null,
    createdDateLabel: formatCreatedDate(toSafeString(user.created_at) || null),
    email: toSafeString(user.email, "-"),
    fullName,
    id: toSafeString(user.id ?? user._id, fullName.toLowerCase().replace(/\s+/g, "-")),
    initials: getInitials(fullName),
    isActive,
    phone: toSafeString(user.phone ?? user.phoneNumber ?? user.phone_number ?? user.mobile, "-"),
    role: toSafeString(user.role, "-"),
    status: getStatusLabel(user, isActive),
  };
};

const getPagination = (
  payload: UserListApiData,
  query: UserListQuery,
  pageCount: number,
  totalCount: number,
): UserListPagination => {
  const payloadOffset = Array.isArray(payload) ? query.offset : toSafeNumber(payload.pagination?.offset);
  const payloadLimit = Array.isArray(payload) ? query.limit : toSafeNumber(payload.pagination?.limit);
  const payloadNextOffset = Array.isArray(payload)
    ? query.offset + pageCount
    : toSafeNumber(payload.pagination?.next_offset);
  const payloadHasMore = Array.isArray(payload) ? false : toOptionalBoolean(payload.pagination?.has_more);

  const offset = payloadOffset || query.offset;
  const limit = payloadLimit || query.limit;
  const nextOffset = payloadNextOffset || offset + limit;
  const hasMore = payloadHasMore || (totalCount > 0 ? nextOffset < totalCount : pageCount >= limit);

  return {
    hasMore,
    limit,
    nextOffset,
    offset,
  };
};

const isUserDetailEnvelope = (
  payload: UserDetailApiData,
): payload is { data?: UserDetailApiItem | null; user?: UserDetailApiItem | null } =>
  Boolean(payload) && typeof payload === "object" && ("data" in payload || "user" in payload);

const getUserFromDetailPayload = (payload: UserDetailApiData): UserDetailApiItem => {
  if (isUserDetailEnvelope(payload)) {
    return payload.user ?? payload.data ?? {};
  }

  return payload;
};

// Keys already surfaced by dedicated rows, or internal — excluded from "extra fields".
const HANDLED_DETAIL_KEYS = new Set([
  "_id",
  "address",
  "avatar",
  "avatar_url",
  "avatarUrl",
  "business_name",
  "businessName",
  "country",
  "country_code",
  "countryCode",
  "created_at",
  "date_of_birth",
  "dateOfBirth",
  "dob",
  "email",
  "first_name",
  "firstName",
  "full_name",
  "fullName",
  "gender",
  "id",
  "is_active",
  "is_verified",
  "isActive",
  "isVerified",
  "last_name",
  "lastName",
  "mobile",
  "name",
  "password",
  "phone",
  "phone_number",
  "phoneNumber",
  "role",
  "salon_id",
  "salon_name",
  "salonId",
  "status",
  "updated_at",
]);

const humanizeKey = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const toDisplayValue = (value: unknown): string | null => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return null;
};

const getExtraFields = (user: UserDetailApiItem): UserDetailField[] => {
  const fields: UserDetailField[] = [];

  Object.keys(user).forEach((key) => {
    if (HANDLED_DETAIL_KEYS.has(key)) {
      return;
    }

    const displayValue = toDisplayValue(user[key]);

    if (displayValue !== null) {
      fields.push({ label: humanizeKey(key), value: displayValue });
    }
  });

  return fields;
};

const normalizeUserDetail = (user: UserDetailApiItem): UserDetail => {
  const fullName = getFullName(user);
  const isActive = getIsActive(user);
  const isVerifiedValue =
    typeof user.isVerified === "boolean"
      ? user.isVerified
      : typeof user.is_verified === "boolean"
        ? user.is_verified
        : null;

  return {
    address: toSafeString(user.address) || null,
    avatarUrl: toSafeString(user.avatarUrl ?? user.avatar_url ?? user.avatar) || null,
    businessName: toSafeString(user.businessName ?? user.business_name ?? user.salon_name) || null,
    country: toSafeString(user.country) || null,
    createdDateLabel: formatCreatedDate(toSafeString(user.created_at) || null),
    dateOfBirth: toSafeString(user.dateOfBirth ?? user.date_of_birth ?? user.dob) || null,
    email: toSafeString(user.email, "-"),
    extraFields: getExtraFields(user),
    fullName,
    gender: toSafeString(user.gender) || null,
    id: toSafeString(user.id ?? user._id, fullName.toLowerCase().replace(/\s+/g, "-")),
    initials: getInitials(fullName),
    isActive,
    isVerified: isVerifiedValue,
    phone: toSafeString(user.phone ?? user.phoneNumber ?? user.phone_number ?? user.mobile, "-"),
    role: toSafeString(user.role, "-"),
    status: getStatusLabel(user, isActive),
  };
};

export const usersService = {
  getAvatarTone(userId: string) {
    const hash = userId.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  },

  async getUsers(query: UserListQuery, salonId?: string | null): Promise<UserListResponse> {
    const requestParams = {
      ...query,
      search: query.search ?? "",
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await api.get<UserListApiResponse>(USER.LIST, {
      params: requestParams,
    });

    const apiUsers = getUserArray(response.data.data);
    const users = apiUsers.map(normalizeUser);
    const totalCount = getTotalCount(response.data.data, users.length);
    const pagination = getPagination(response.data.data, query, users.length, totalCount);

    return {
      pagination,
      query,
      totalCount,
      users,
    };
  },

  async getUser(userId: string): Promise<UserDetail> {
    const response = await api.get<UserDetailApiResponse>(`${USER.LIST}/${userId}`);

    return normalizeUserDetail(getUserFromDetailPayload(response.data.data));
  },

  async updateUser(userId: string, payload: UpdateUserRequest): Promise<UpdateUserResponse> {
    const requestBody: Record<string, string> = {};

    // The backend field-naming contract is undocumented, so send common camelCase
    // and snake_case variants together to maximise compatibility.
    if (payload.fullName !== undefined) {
      requestBody.fullName = payload.fullName;
      requestBody.full_name = payload.fullName;
      requestBody.name = payload.fullName;
    }

    if (payload.email !== undefined) {
      requestBody.email = payload.email;
    }

    if (payload.phone !== undefined) {
      requestBody.phone = payload.phone;
      requestBody.phone_number = payload.phone;
    }

    if (payload.gender !== undefined) {
      requestBody.gender = payload.gender;
    }

    if (payload.dateOfBirth !== undefined) {
      requestBody.dateOfBirth = payload.dateOfBirth;
      requestBody.date_of_birth = payload.dateOfBirth;
      requestBody.dob = payload.dateOfBirth;
    }

    if (payload.address !== undefined) {
      requestBody.address = payload.address;
    }

    const response = await api.patch<UserDetailApiResponse>(`${USER.LIST}/${userId}`, requestBody);

    return {
      message: response.data.message,
      user: normalizeUserDetail(getUserFromDetailPayload(response.data.data)),
    };
  },

  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    const response = await api.delete<ApiResponse<unknown>>(`${USER.LIST}/${userId}`);

    return {
      message: response.data.message,
      userId,
    };
  },

  async updateUserRole(userId: string, role: string): Promise<UpdateUserRoleResponse> {
    const response = await api.patch<UserDetailApiResponse>(`${USER.LIST}/${userId}/role`, {
      role,
    });

    const apiUser = getUserFromDetailPayload(response.data.data);
    const returnedRole = toSafeString(apiUser.role) || role;

    return {
      message: response.data.message,
      role: returnedRole,
      userId,
    };
  },
};
