import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";
import type {
  CreateSalonRequest,
  CreateSalonResponse,
  GetSalonResponse,
  SalonApiItem,
  SalonListApiData,
  SalonListItem,
  SalonListPagination,
  SalonListQuery,
  SalonListResponse,
  UpdateSalonFormFields,
  UpdateSalonRequest,
  UpdateSalonResponse,
} from "@/types/salon";

type SalonListApiResponse = ApiResponse<SalonListApiData>;
type CreateSalonApiData =
  | SalonApiItem
  | {
      data?: SalonApiItem | null;
      salon?: SalonApiItem | null;
    };
type CreateSalonApiResponse = ApiResponse<CreateSalonApiData>;

type GetSalonApiData =
  | SalonApiItem
  | {
      data?: SalonApiItem | null;
      salon?: SalonApiItem | null;
    };
type GetSalonApiResponse = ApiResponse<GetSalonApiData>;
type UpdateSalonApiResponse = ApiResponse<GetSalonApiData>;

const SALON_CREATE_ENDPOINT = "/salons";
const SALON_LIST_ENDPOINT = "/salons";
const SALON_ME_ENDPOINT = "/salons/me";
const SALON_UPDATE_ENDPOINT = "/salons";

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

const toOptionalBoolean = (value: unknown, fallback = true) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
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

const getSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getSalonArray = (payload: SalonListApiData) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.salons ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const isCreatedSalonEnvelope = (
  payload: CreateSalonApiData,
): payload is { data?: SalonApiItem | null; salon?: SalonApiItem | null } =>
  "data" in payload || "salon" in payload;

const getCreatedSalon = (payload: CreateSalonApiData): SalonApiItem => {
  if (isCreatedSalonEnvelope(payload)) {
    return payload.salon ?? payload.data ?? {};
  }

  return payload;
};

const getTotalCount = (payload: SalonListApiData, fallbackCount: number) => {
  if (Array.isArray(payload)) {
    return fallbackCount;
  }

  return (
    toSafeNumber(payload.totalCount) ||
    toSafeNumber(payload.total_count) ||
    toSafeNumber(payload.total) ||
    toSafeNumber(payload.pagination?.totalCount) ||
    toSafeNumber(payload.pagination?.total_count) ||
    toSafeNumber(payload.pagination?.total) ||
    fallbackCount
  );
};

const normalizeSalon = (salon: SalonApiItem): SalonListItem => {
  const name = toSafeString(salon.name) || toSafeString(salon.business_name, "Salon");

  return {
    address: toSafeString(salon.address),
    businessName: toSafeString(salon.business_name) || name,
    city: toSafeString(salon.city),
    country: toSafeString(salon.country),
    countryCode: toSafeString(salon.country_code),
    createdAt: toSafeString(salon.created_at) || null,
    email: toSafeString(salon.email),
    id: toSafeString(salon.id, getSlug(name) || "salon"),
    isActive: toOptionalBoolean(salon.is_active),
    name,
    ownerId: toSafeString(salon.owner_id) || null,
    phone: toSafeString(salon.phone) || toSafeString(salon.phone_number),
    postalCode: toSafeString(salon.postal_code),
    state: toSafeString(salon.state),
    status: toSafeString(salon.status, "Active"),
    timezone: toSafeString(salon.timezone),
    updatedAt: toSafeString(salon.updated_at) || null,
  };
};

const getPagination = (
  payload: SalonListApiData,
  query: SalonListQuery,
  pageCount: number,
  totalCount: number,
): SalonListPagination => {
  const payloadPagination = Array.isArray(payload) ? null : payload.pagination;
  const page = toSafeNumber(payloadPagination?.page) || query.page;
  const limit = toSafeNumber(payloadPagination?.limit) || query.limit;
  const totalPages =
    toSafeNumber(payloadPagination?.totalPages) ||
    toSafeNumber(payloadPagination?.total_pages) ||
    (totalCount > 0 ? Math.ceil(totalCount / limit) : null);
  const nextPage =
    toSafeNumber(payloadPagination?.nextPage) ||
    toSafeNumber(payloadPagination?.next_page) ||
    page + 1;
  const explicitHasMore =
    toOptionalBoolean(payloadPagination?.hasMore, false) ||
    toOptionalBoolean(payloadPagination?.has_more, false);
  const hasMore =
    explicitHasMore ||
    (totalPages ? page < totalPages : totalCount > 0 ? page * limit < totalCount : pageCount >= limit);

  return {
    hasMore,
    limit,
    nextPage,
    page,
    totalCount,
    totalPages,
  };
};

const setDefined = <T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
) => {
  if (value !== undefined) {
    target[key] = value;
  }
};

export const mapSalonFormFieldsToUpdateRequest = (
  formFields: UpdateSalonFormFields,
): UpdateSalonRequest => {
  const payload: UpdateSalonRequest = {};

  setDefined(payload, "address", formFields.address);
  setDefined(payload, "business_name", formFields.businessName);
  setDefined(payload, "city", formFields.city);
  setDefined(payload, "country", formFields.country);
  setDefined(payload, "country_code", formFields.countryCode);
  setDefined(payload, "email", formFields.email);
  setDefined(payload, "latitude", formFields.latitude);
  setDefined(payload, "longitude", formFields.longitude);
  setDefined(payload, "name", formFields.name);
  setDefined(payload, "phone", formFields.phone);
  setDefined(payload, "phone_number", formFields.phoneNumber);
  setDefined(payload, "place_id", formFields.placeId);
  setDefined(payload, "postal_code", formFields.postalCode);
  setDefined(payload, "primary_category_id", formFields.primaryCategoryId);
  setDefined(payload, "referral_source", formFields.referralSource);
  setDefined(payload, "related_category_ids", formFields.relatedCategoryIds);
  setDefined(payload, "state", formFields.state);
  setDefined(payload, "status", formFields.status);
  setDefined(payload, "team_size", formFields.teamSize);
  setDefined(payload, "team_type", formFields.teamType);
  setDefined(payload, "timezone", formFields.timezone);
  setDefined(payload, "website", formFields.website);

  return payload;
};

export const salonService = {
  async createSalon(payload: CreateSalonRequest): Promise<CreateSalonResponse> {
    const response = await api.post<CreateSalonApiResponse>(SALON_CREATE_ENDPOINT, payload);
    const salon = normalizeSalon(getCreatedSalon(response.data.data));

    return {
      message: response.data.message,
      salon,
    };
  },

  async getSalonMe(): Promise<GetSalonResponse> {
    const response = await api.get<GetSalonApiResponse>(SALON_ME_ENDPOINT);
    const salon = normalizeSalon(getCreatedSalon(response.data.data));

    return salon;
  },

  async getSalons(query: SalonListQuery): Promise<SalonListResponse> {
    const response = await api.get<SalonListApiResponse>(SALON_LIST_ENDPOINT, {
      params: query,
    });
    const apiSalons = getSalonArray(response.data.data);
    const salons = apiSalons.map(normalizeSalon);
    const totalCount = getTotalCount(response.data.data, salons.length);
    const pagination = getPagination(response.data.data, query, salons.length, totalCount);

    return {
      pagination,
      query,
      salons,
      totalCount,
    };
  },

  async updateSalon(
    salonId: string,
    payload: UpdateSalonRequest,
  ): Promise<UpdateSalonResponse> {
    const response = await api.patch<UpdateSalonApiResponse>(
      `${SALON_UPDATE_ENDPOINT}/${salonId}`,
      payload,
    );
    const salon = normalizeSalon(getCreatedSalon(response.data.data));

    return {
      message: response.data.message,
      salon,
    };
  },
};
