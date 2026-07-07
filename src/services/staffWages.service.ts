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
    baseAmount: toSafeNumber(firstValue(entry, ["baseAmount", "base_amount", "amount"])),
    currency: toSafeString(firstValue(entry, ["currency"]), "INR"),
    effectiveFrom:
      toSafeString(firstValue(entry, ["effectiveFrom", "effective_from"])) || null,
    notes: toSafeString(firstValue(entry, ["notes"])) || null,
    staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
    type: toSafeString(firstValue(entry, ["type", "wage_type", "wageType"]), "monthly"),
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
        baseAmount: toSafeNumber(payload.base_amount),
        currency: toSafeString(payload.currency, "INR"),
        effectiveFrom: payload.effective_from ?? null,
        notes: payload.notes ?? null,
        staffId,
        type: toSafeString(payload.type, "monthly"),
        updatedAt: null,
      },
    };
  },
};
