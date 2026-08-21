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
  | UnknownRecord[]
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

// The backend models commission settings per revenue category (services,
// products, memberships, gift_cards, cancellation) and requires "category" on
// every write. The mobile UI only exposes a single rate/type pair, so it
// always reads/writes the "services" category — the primary commission use
// case — rather than introducing a category picker.
const DEFAULT_COMMISSION_CATEGORY = "services";

// Wire enum is "fixed_rate", not "fixed" — the UI keeps "fixed" as its
// internal value since that's already wired through validation/labels.
const COMMISSION_KIND_TO_TYPE: Record<string, string> = {
  fixed_rate: "fixed",
  percentage: "percentage",
};
const TYPE_TO_COMMISSION_KIND: Record<string, string> = {
  fixed: "fixed_rate",
  percentage: "percentage",
};

const pickPrimaryCommissionEntry = (payload: CommissionApiData): UnknownRecord => {
  if (Array.isArray(payload)) {
    const records = payload.map(asRecord);

    return (
      records.find((record) => toSafeString(firstValue(record, ["category"])) === DEFAULT_COMMISSION_CATEGORY) ??
      records[0] ??
      {}
    );
  }

  const record = asRecord(payload);
  const nested = firstValue(record, ["commission", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeCommissionSettings = (entry: UnknownRecord, staffId: string): CommissionSettings => {
  const kind = toSafeString(
    firstValue(entry, ["commission_kind", "commissionKind", "type", "commission_type"]),
    "percentage",
  );

  return {
    rate: toSafeNumber(
      firstValue(entry, ["default_rate", "defaultRate", "rate", "commission_rate", "commissionRate"]),
    ),
    staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
    type: COMMISSION_KIND_TO_TYPE[kind] ?? kind,
    updatedAt: toSafeString(firstValue(entry, ["updatedAt", "updated_at"])) || null,
  };
};

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

    return normalizeCommissionSettings(pickPrimaryCommissionEntry(response.data.data), staffId);
  },

  async updateCommissionSettings(
    staffId: string,
    payload: UpdateCommissionSettingsRequest,
  ): Promise<UpdateCommissionSettingsResponse> {
    const requestBody: UnknownRecord = {
      category: DEFAULT_COMMISSION_CATEGORY,
      is_enabled: true,
    };

    if (payload.rate !== undefined) {
      requestBody.default_rate = payload.rate;
    }

    if (payload.type !== undefined) {
      requestBody.commission_kind = TYPE_TO_COMMISSION_KIND[payload.type] ?? payload.type;
    }

    const response = await api.put<CommissionApiResponse>(STAFF.COMMISSIONS(staffId), requestBody);

    return {
      commission: normalizeCommissionSettings(pickPrimaryCommissionEntry(response.data.data), staffId),
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
