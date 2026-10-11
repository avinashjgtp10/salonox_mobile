import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { CommissionHistoryEntry } from "@/types/staffCommissions";
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
    createdAt: toSafeString(firstValue(entry, ["createdAt", "created_at", "earned_at", "earnedAt"])) || null,
    id: toSafeString(firstValue(entry, ["id", "_id"]), `commission-history-${index}`),
    notes: toSafeString(firstValue(entry, ["notes"])) || null,
    period: period || null,
    status: toSafeString(firstValue(entry, ["status"]), "pending"),
  };
};

const getHistoryTimestamp = (entry: CommissionHistoryEntry) => {
  const period = entry.period?.trim() ?? "";
  const hasExactDate = /^\d{4}-\d{2}-\d{2}/.test(period);
  const periodTime = period ? Date.parse(period) : Number.NaN;
  const createdTime = entry.createdAt ? Date.parse(entry.createdAt) : Number.NaN;
  let timestamp = Number.isFinite(periodTime) ? periodTime : createdTime;
  if (!hasExactDate && Number.isFinite(createdTime)) timestamp = createdTime;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const staffCommissionsService = {
  /** `month` is YYYY-MM; the web app also loads history one month at a time. */
  async getCommissionHistory(staffId: string, month: string): Promise<CommissionHistoryEntry[]> {
    const response = await api.get<CommissionHistoryApiResponse>(STAFF.COMMISSIONS_HISTORY(staffId), {
      params: { month },
    });

    return getHistoryArray(response.data.data)
      .map(normalizeHistoryEntry)
      .map((entry, index) => ({ entry, index, timestamp: getHistoryTimestamp(entry) }))
      .sort((left, right) => right.timestamp - left.timestamp || left.index - right.index)
      .map(({ entry }) => entry);
  },
};
