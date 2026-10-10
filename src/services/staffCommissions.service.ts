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
  const period =
    toSafeString(firstValue(entry, ["period", "month"])) ||
    toSafeString(firstValue(entry, ["earned_at", "earnedAt"])).slice(0, 10);

  return {
    amount: toSafeNumber(firstValue(entry, ["amount", "commission_amount", "commissionAmount"])),
    createdAt: toSafeString(firstValue(entry, ["createdAt", "created_at"])) || null,
    id: toSafeString(firstValue(entry, ["id", "_id"]), `commission-history-${index}`),
    notes: toSafeString(firstValue(entry, ["notes"])) || null,
    period: period || null,
    status: toSafeString(firstValue(entry, ["status"]), "pending"),
  };
};

export const staffCommissionsService = {
  /** `month` is YYYY-MM; the web app also loads history one month at a time. */
  async getCommissionHistory(staffId: string, month: string): Promise<CommissionHistoryEntry[]> {
    const response = await api.get<CommissionHistoryApiResponse>(STAFF.COMMISSIONS_HISTORY(staffId), {
      params: { month },
    });

    return getHistoryArray(response.data.data).map(normalizeHistoryEntry);
  },
};
