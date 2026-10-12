import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { StaffWage, UpdateWageRequest, UpdateWageResponse } from "@/types/staffWages";
import {
  asRecord,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type WageApiData =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      wage?: UnknownRecord | null;
    };
type WageApiResponse = ApiResponse<WageApiData>;

const isWageEnvelope = (
  payload: WageApiData,
): payload is { data?: UnknownRecord | null; wage?: UnknownRecord | null } =>
  Boolean(payload) && typeof payload === "object" && ("data" in payload || "wage" in payload);

const getWageFromEnvelope = (payload: WageApiData): UnknownRecord => {
  if (isWageEnvelope(payload)) {
    return asRecord(payload.wage ?? payload.data);
  }

  return asRecord(payload);
};

const normalizeWage = (entry: UnknownRecord, staffId: string): StaffWage | null => {
  if (Object.keys(entry).length === 0) {
    return null;
  }

  return {
    baseAmount: toSafeNumber(entry.compensation_type === "hourly" ? entry.hourly_rate : entry.salary_amount),
    wagesEnabled: entry.wages_enabled === true,
    currency: toSafeString(firstValue(entry, ["currency"]), "INR"),
    effectiveFrom:
      toSafeString(firstValue(entry, ["effectiveFrom", "effective_from"])) || null,
    notes: toSafeString(firstValue(entry, ["notes"])) || null,
    staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
    type: toSafeString(entry.compensation_type, "none"),
    updatedAt: toSafeString(firstValue(entry, ["updatedAt", "updated_at"])) || null,
  };
};

export const staffWagesService = {
  async getWage(staffId: string): Promise<StaffWage | null> {
    const response = await api.get<WageApiResponse>(STAFF.WAGES(staffId));

    return normalizeWage(getWageFromEnvelope(response.data.data), staffId);
  },

  async updateWage(staffId: string, payload: UpdateWageRequest): Promise<UpdateWageResponse> {
    const response = await api.put<WageApiResponse>(STAFF.WAGES(staffId), payload);
    const wage = normalizeWage(getWageFromEnvelope(response.data.data), staffId);

    return {
      message: response.data.message,
      wage: wage ?? {
        baseAmount: toSafeNumber(payload.compensation_type === "hourly" ? payload.hourly_rate : payload.salary_amount),
        wagesEnabled: payload.wages_enabled ?? false,
        currency: "INR",
        effectiveFrom: null,
        notes: null,
        staffId,
        type: payload.compensation_type ?? "none",
        updatedAt: null,
      },
    };
  },
};
