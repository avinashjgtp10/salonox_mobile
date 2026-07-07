import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CommissionHistoryEntry,
  CommissionSettings,
  CommissionSlab,
  UpdateCommissionSettingsRequest,
  UpdateCommissionSettingsResponse,
  UpdateCommissionSlabsRequest,
  UpdateCommissionSlabsResponse,
} from "@/types/staffCommissions";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type CommissionApiData =
  | UnknownRecord
  | {
      commission?: UnknownRecord | null;
      data?: UnknownRecord | null;
    };
type CommissionApiResponse = ApiResponse<CommissionApiData>;
type CommissionSlabsApiData =
  | UnknownRecord[]
  | {
      data?: UnknownRecord[] | null;
      slabs?: UnknownRecord[] | null;
    };
type CommissionSlabsApiResponse = ApiResponse<CommissionSlabsApiData>;
type CommissionHistoryApiData =
  | UnknownRecord[]
  | {
      data?: UnknownRecord[] | null;
      history?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
    };
type CommissionHistoryApiResponse = ApiResponse<CommissionHistoryApiData>;

const getCommissionFromEnvelope = (payload: CommissionApiData): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["commission", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeCommissionSettings = (entry: UnknownRecord, staffId: string): CommissionSettings => ({
  rate: toSafeNumber(firstValue(entry, ["rate", "commission_rate", "commissionRate"])),
  staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
  type: toSafeString(firstValue(entry, ["type", "commission_type"]), "percentage"),
  updatedAt: toSafeString(firstValue(entry, ["updatedAt", "updated_at"])) || null,
});

const getSlabArray = (payload: CommissionSlabsApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["slabs", "data"]);
};

const normalizeSlab = (entry: UnknownRecord, index: number): CommissionSlab => {
  const rawMax = firstValue(entry, ["maxAmount", "max_amount"]);

  return {
    id: toSafeString(firstValue(entry, ["id", "_id"]), `slab-${index}`),
    maxAmount: rawMax !== undefined ? toSafeNumber(rawMax) : null,
    minAmount: toSafeNumber(firstValue(entry, ["minAmount", "min_amount"])),
    rate: toSafeNumber(firstValue(entry, ["rate"])),
  };
};

const getHistoryArray = (payload: CommissionHistoryApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["history", "items", "data"]);
};

const normalizeHistoryEntry = (entry: UnknownRecord, index: number): CommissionHistoryEntry => ({
  amount: toSafeNumber(firstValue(entry, ["amount"])),
  createdAt: toSafeString(firstValue(entry, ["createdAt", "created_at"])) || null,
  id: toSafeString(firstValue(entry, ["id", "_id"]), `commission-history-${index}`),
  notes: toSafeString(firstValue(entry, ["notes"])) || null,
  period: toSafeString(firstValue(entry, ["period", "month"])) || null,
  status: toSafeString(firstValue(entry, ["status"]), "pending"),
});

export const staffCommissionsService = {
  async getCommissionSettings(staffId: string): Promise<CommissionSettings> {
    const response = await api.get<CommissionApiResponse>(STAFF.COMMISSIONS(staffId));

    return normalizeCommissionSettings(getCommissionFromEnvelope(response.data.data), staffId);
  },

  async updateCommissionSettings(
    staffId: string,
    payload: UpdateCommissionSettingsRequest,
  ): Promise<UpdateCommissionSettingsResponse> {
    const response = await api.put<CommissionApiResponse>(STAFF.COMMISSIONS(staffId), payload);

    return {
      commission: normalizeCommissionSettings(getCommissionFromEnvelope(response.data.data), staffId),
      message: response.data.message,
    };
  },

  async getCommissionSlabs(staffId: string): Promise<CommissionSlab[]> {
    const response = await api.get<CommissionSlabsApiResponse>(STAFF.COMMISSIONS_SLABS(staffId));

    return getSlabArray(response.data.data).map(normalizeSlab);
  },

  async updateCommissionSlabs(
    staffId: string,
    payload: UpdateCommissionSlabsRequest,
  ): Promise<UpdateCommissionSlabsResponse> {
    const response = await api.put<CommissionSlabsApiResponse>(
      STAFF.COMMISSIONS_SLABS(staffId),
      payload,
    );

    return {
      message: response.data.message,
      slabs: getSlabArray(response.data.data).map(normalizeSlab),
    };
  },

  async getCommissionHistory(staffId: string): Promise<CommissionHistoryEntry[]> {
    const response = await api.get<CommissionHistoryApiResponse>(STAFF.COMMISSIONS_HISTORY(staffId));

    return getHistoryArray(response.data.data).map(normalizeHistoryEntry);
  },
};
