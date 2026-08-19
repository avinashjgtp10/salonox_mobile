import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  BulkConfigureCommissionsRequest,
  BulkConfigureCommissionsResponse,
  ExportCommissionsResponse,
  MarkCommissionPaidResponse,
  SalonCommissionListPagination,
  SalonCommissionListQuery,
  SalonCommissionListResponse,
  SalonCommissionRecord,
  SalonCommissionSummary,
  SalonEarnedEntry,
  SettleCommissionResponse,
} from "@/types/salonCommissions";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type SummaryApiData = UnknownRecord | { data?: UnknownRecord | null };
type SummaryApiResponse = ApiResponse<SummaryApiData>;
type EarnedApiData =
  | UnknownRecord[]
  | { data?: UnknownRecord[] | null; earned?: UnknownRecord[] | null; items?: UnknownRecord[] | null };
type EarnedApiResponse = ApiResponse<EarnedApiData>;
type ListApiData =
  | UnknownRecord[]
  | {
      commissions?: UnknownRecord[] | null;
      data?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
      pagination?: UnknownRecord | null;
      rows?: UnknownRecord[] | null;
      total?: number | string | null;
      totalCount?: number | string | null;
      total_count?: number | string | null;
    };
type ListApiResponse = ApiResponse<ListApiData>;
type MarkPaidApiResponse = ApiResponse<unknown>;
type SettleCommissionApiResponse = ApiResponse<unknown>;
type BulkConfigureApiData = UnknownRecord | { data?: UnknownRecord | null };
type BulkConfigureApiResponse = ApiResponse<BulkConfigureApiData>;
type ExportApiData = UnknownRecord | string | null;
type ExportApiResponse = ApiResponse<ExportApiData>;

const normalizeSummary = (entry: UnknownRecord): SalonCommissionSummary => ({
  paidAmount: toSafeNumber(firstValue(entry, ["paidAmount", "paid_amount"])),
  pendingAmount: toSafeNumber(firstValue(entry, ["pendingAmount", "pending_amount"])),
  totalAmount: toSafeNumber(firstValue(entry, ["totalAmount", "total_amount", "total"])),
  totalStaff: toSafeNumber(firstValue(entry, ["totalStaff", "total_staff", "staffCount", "staff_count"])),
});

const getEarnedArray = (payload: EarnedApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["earned", "items", "data"]);
};

const getStaffName = (entry: UnknownRecord) => {
  const staffValue = firstValue(entry, ["staff", "staffMember"]);
  const nested = asRecord(staffValue);

  return (
    toSafeString(firstValue(entry, ["staffName", "staff_name"])) ||
    toSafeString(firstValue(nested, ["name", "fullName", "full_name"])) ||
    "Staff Member"
  );
};

const normalizeEarnedEntry = (entry: UnknownRecord, index: number): SalonEarnedEntry => ({
  earnedAmount: toSafeNumber(firstValue(entry, ["earnedAmount", "earned_amount", "amount"])),
  id: toSafeString(firstValue(entry, ["id", "_id"]), `earned-${index}`),
  period: toSafeString(firstValue(entry, ["period", "month"])) || null,
  staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"])),
  staffName: getStaffName(entry),
});

const getListArray = (payload: ListApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return firstArray(asRecord(payload), ["commissions", "items", "rows", "data"]);
};

const getListTotalCount = (payload: ListApiData, fallbackCount: number): number => {
  if (Array.isArray(payload)) {
    return fallbackCount;
  }

  const record = asRecord(payload);

  return (
    toSafeNumber(firstValue(record, ["totalCount", "total_count", "total"])) ||
    toSafeNumber(firstValue(asRecord(record.pagination), ["totalCount", "total_count", "total"])) ||
    fallbackCount
  );
};

const getListPagination = (
  payload: ListApiData,
  query: SalonCommissionListQuery,
  pageCount: number,
  totalCount: number,
): SalonCommissionListPagination => {
  const paginationRecord = Array.isArray(payload) ? {} : asRecord(asRecord(payload).pagination);
  const offset = toSafeNumber(firstValue(paginationRecord, ["offset"])) || query.offset;
  const limit = toSafeNumber(firstValue(paginationRecord, ["limit"])) || query.limit;
  const nextOffset =
    toSafeNumber(firstValue(paginationRecord, ["next_offset", "nextOffset"])) || offset + pageCount;
  const hasMoreRaw = firstValue(paginationRecord, ["has_more", "hasMore"]);
  const hasMore =
    hasMoreRaw === true || (totalCount > 0 ? nextOffset < totalCount : pageCount >= limit);

  return { hasMore, limit, nextOffset, offset };
};

const toOptionalSafeNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }
  return undefined;
};

const normalizeRecord = (entry: UnknownRecord, index: number): SalonCommissionRecord => ({
  amount: toSafeNumber(firstValue(entry, ["amount"])),
  id: toSafeString(firstValue(entry, ["id", "_id"]), `commission-${index}`),
  period: toSafeString(firstValue(entry, ["period", "month"])) || null,
  staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"])),
  staffName: getStaffName(entry),
  status: toSafeString(firstValue(entry, ["status"]), "pending"),
  unpaidAmount: toOptionalSafeNumber(firstValue(entry, ["unpaidAmount", "unpaid_amount", "remainingAmount", "remaining_amount"])),
});

export const salonCommissionsService = {
  async getSummary(): Promise<SalonCommissionSummary> {
    const response = await api.get<SummaryApiResponse>(STAFF.COMMISSIONS_SUMMARY);
    const record = asRecord(response.data.data);
    const nested = firstValue(record, ["data"]);

    return normalizeSummary(nested !== undefined ? asRecord(nested) : record);
  },

  async getEarned(): Promise<SalonEarnedEntry[]> {
    const response = await api.get<EarnedApiResponse>(STAFF.COMMISSIONS_EARNED);

    return getEarnedArray(response.data.data).map(normalizeEarnedEntry);
  },

  async getAll(query: SalonCommissionListQuery): Promise<SalonCommissionListResponse> {
    const response = await api.get<ListApiResponse>(STAFF.COMMISSIONS_ALL, { params: query });
    const apiRecords = getListArray(response.data.data);
    const records = apiRecords.map(normalizeRecord);
    const totalCount = getListTotalCount(response.data.data, records.length);
    const pagination = getListPagination(response.data.data, query, records.length, totalCount);

    return { pagination, query, records, totalCount };
  },

  async markPaid(staffId: string): Promise<MarkCommissionPaidResponse> {
    const response = await api.post<MarkPaidApiResponse>(STAFF.COMMISSIONS_MARK_PAID(staffId));

    return {
      message: response.data.message,
      staffId,
    };
  },

  async settleCommission(staffId: string, amount: number): Promise<SettleCommissionResponse> {
    const response = await api.post<SettleCommissionApiResponse>(STAFF.COMMISSIONS_MARK_PAID(staffId), {
      amount,
    });

    return {
      message: response.data.message,
      staffId,
      remainingBalance: toSafeNumber(firstValue(asRecord(response.data.data), ["remainingBalance", "remaining_balance", "unpaidAmount", "unpaid_amount"])),
      status: toSafeString(firstValue(asRecord(response.data.data), ["status"])),
    };
  },

  async bulkConfigure(
    payload: BulkConfigureCommissionsRequest,
  ): Promise<BulkConfigureCommissionsResponse> {
    const response = await api.post<BulkConfigureApiResponse>(
      STAFF.COMMISSIONS_BULK_CONFIGURE,
      payload,
    );
    const record = asRecord(response.data.data);

    return {
      affectedCount: toSafeNumber(
        firstValue(record, ["affectedCount", "affected_count", "count", "updatedCount"]),
      ),
      message: response.data.message,
    };
  },

  async exportCommissions(query?: Partial<SalonCommissionListQuery>): Promise<ExportCommissionsResponse> {
    const response = await api.get<ExportApiResponse>(STAFF.COMMISSIONS_EXPORT, { params: query });
    const rawData = response.data.data;
    const url =
      typeof rawData === "string"
        ? rawData
        : toSafeString(firstValue(asRecord(rawData), ["url", "file_url", "fileUrl", "download_url"]));

    return {
      message: response.data.message,
      url: url || null,
    };
  },
};
