import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";
import { parseAppDateTime } from "@/utils/dateTime";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type CommissionHistoryApiData =
  | UnknownRecord[]
  | {
      data?: UnknownRecord[] | null;
      history?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
    };
type CommissionHistoryApiResponse = ApiResponse<CommissionHistoryApiData>;

const getHistoryArray = (payload: CommissionHistoryApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["history", "items", "data"]);
};

const normalizeHistoryEntry = (entry: UnknownRecord, index: number): CommissionHistoryEntry => {
  const dateValue = toSafeString(firstValue(entry, ["earned_at", "earnedAt", "date", "commission_date", "commissionDate", "period"]));
  const normalizedDate = /^\d{4}-\d{2}-\d{2}/.test(dateValue) ? dateValue.slice(0, 10) : dateValue;
  const period = normalizedDate || toSafeString(firstValue(entry, ["month"]));

  return {
    amount: toSafeNumber(firstValue(entry, ["amount", "commission_amount", "commissionAmount"])),
    category: toSafeString(firstValue(entry, ["category", "source", "commission_source"])) || null,
    commissionKind: toSafeString(firstValue(entry, ["commission_kind", "commissionKind"])) || null,
    commissionRate: toSafeNumber(firstValue(entry, ["commission_rate", "commissionRate"])),
    createdAt: toSafeString(firstValue(entry, ["createdAt", "created_at", "earned_at", "earnedAt"])) || null,
    id: toSafeString(firstValue(entry, ["id", "_id"]), `commission-history-${index}`),
    notes: toSafeString(firstValue(entry, ["notes"])) || null,
    period: period || null,
    status: toSafeString(firstValue(entry, ["status"]), "pending"),
  };
};

const sortHistory = (payload: CommissionHistoryApiData) => getHistoryArray(payload)
  .map(normalizeHistoryEntry)
  .map((entry, index) => ({ entry, index, ...getHistorySortKey(entry) }))
  .sort((left, right) => right.dateTime - left.dateTime || right.createdTime - left.createdTime || left.index - right.index)
  .map(({ entry }) => entry);

const parseHistoryTimestamp = (value: string | null) => {
  if (!value) return Number.NaN;
  return parseAppDateTime(value)?.getTime() ?? Number.NaN;
};

const getHistorySortKey = (entry: CommissionHistoryEntry) => {
  const period = entry.period?.trim() ?? "";
  const hasExactDate = /^\d{4}-\d{2}-\d{2}(?:$|T)|^\d{1,2}-\d{1,2}-\d{2,4}(?:$|[ T])/.test(period);
  const periodTime = parseHistoryTimestamp(period);
  const createdTime = parseHistoryTimestamp(entry.createdAt);
  const dateTime = hasExactDate && Number.isFinite(periodTime)
    ? periodTime
    : Number.isFinite(createdTime) ? createdTime : periodTime;

  return {
    dateTime: Number.isFinite(dateTime) ? dateTime : 0,
    createdTime: Number.isFinite(createdTime) ? createdTime : 0,
  };
};

export const staffCommissionsService = {
  /** `month` is YYYY-MM; the web app also loads history one month at a time. */
  async getCommissionHistory(staffId: string, month: string): Promise<CommissionHistoryEntry[]> {
    const response = await api.get<CommissionHistoryApiResponse>(STAFF.COMMISSIONS_HISTORY(staffId), {
      params: { month },
    });

    return sortHistory(response.data.data);
  },

  async getCommissionHistoryForRange(staffId: string, startDate: string, endDate: string): Promise<CommissionHistoryEntry[]> {
    const response = await api.get<CommissionHistoryApiResponse>(STAFF.COMMISSIONS_HISTORY(staffId), {
      params: { start_date: startDate, end_date: endDate },
    });

    return sortHistory(response.data.data);
  },
};
