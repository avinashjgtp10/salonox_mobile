import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CommissionDateRange,
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
type SettleCommissionApiResponse = ApiResponse<unknown>;

const normalizeSummary = (entry: UnknownRecord): SalonCommissionSummary => ({
  paidAmount: toSafeNumber(firstValue(entry, ["paidAmount", "paid_amount", "paid_out", "paidOut"])),
  pendingAmount: toSafeNumber(
    firstValue(entry, ["pendingAmount", "pending_amount", "pending_payout", "pendingPayout"]),
  ),
  totalAmount: toSafeNumber(
    firstValue(entry, ["totalAmount", "total_amount", "total_commission", "totalCommission"]),
  ),
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
  const firstName = toSafeString(firstValue(entry, ["staffFirstName", "staff_first_name"]));
  const lastName = toSafeString(firstValue(entry, ["staffLastName", "staff_last_name"]));
  const joinedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return (
    toSafeString(firstValue(entry, ["staffName", "staff_name"])) ||
    joinedName ||
    toSafeString(firstValue(nested, ["name", "fullName", "full_name"])) ||
    "Staff Member"
  );
};

const normalizeEarnedEntry = (entry: UnknownRecord, index: number): SalonEarnedEntry => ({
  earnedAmount: toSafeNumber(
    firstValue(entry, ["earnedAmount", "earned_amount", "total_earned", "totalEarned", "amount"]),
  ),
  id: toSafeString(firstValue(entry, ["id", "_id", "staffId", "staff_id"]), `earned-${index}`),
  paidAmount: toSafeNumber(firstValue(entry, ["paidAmount", "paid_amount", "paid_out", "paidOut"])),
  pendingAmount: toSafeNumber(
    firstValue(entry, ["pendingAmount", "pending_amount", "pending_payout", "pendingPayout"]),
  ),
  period: toSafeString(firstValue(entry, ["period", "month"])) || null,
  staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"])),
  staffName: getStaffName(entry),
  transactionCount: toSafeNumber(
    firstValue(entry, ["transactionCount", "transaction_count"]),
  ),
});

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** `monthOffset` 0 = this month, -1 = last month. */
export function getCalendarMonthRange(monthOffset = 0, now = new Date()): CommissionDateRange {
  const y = now.getFullYear();
  const m = now.getMonth() + monthOffset;

  return { start_date: toISODate(new Date(y, m, 1)), end_date: toISODate(new Date(y, m + 1, 0)) };
}

export const getCurrentCalendarMonthRange = (now = new Date()) => getCalendarMonthRange(0, now);

export type CommissionExportRow = {
  category: string;
  commissionAmount: number;
  commissionKind: string;
  commissionRate: number;
  earnedDate: string;
  revenueAmount: number;
  staffName: string;
  status: string;
};

export const salonCommissionsService = {
  async getSummary(range: CommissionDateRange = getCurrentCalendarMonthRange()): Promise<SalonCommissionSummary> {
    const response = await api.get<SummaryApiResponse>(STAFF.COMMISSIONS_SUMMARY, { params: range });
    const record = asRecord(response.data.data);
    const nested = firstValue(record, ["data"]);

    return normalizeSummary(nested !== undefined ? asRecord(nested) : record);
  },

  async getEarned(range: CommissionDateRange = getCurrentCalendarMonthRange()): Promise<SalonEarnedEntry[]> {
    const response = await api.get<EarnedApiResponse>(STAFF.COMMISSIONS_EARNED, { params: range });

    return getEarnedArray(response.data.data).map(normalizeEarnedEntry);
  },

  // Export is month-only on the backend (`month` = YYYY-MM), same as the web app.
  async exportCsv(month: string): Promise<string> {
    const response = await api.get<string>(STAFF.COMMISSIONS_EXPORT, { params: { month }, responseType: "text" });
    return response.data;
  },

  async exportExcel(month: string): Promise<ArrayBuffer> {
    const response = await api.get<ArrayBuffer>(STAFF.COMMISSIONS_EXPORT, {
      params: { format: "excel", month },
      responseType: "arraybuffer",
    });
    return response.data;
  },

  async exportRows(month: string): Promise<CommissionExportRow[]> {
    const response = await api.get<ApiResponse<UnknownRecord[]>>(STAFF.COMMISSIONS_EXPORT, {
      params: { format: "json", month },
    });
    const rows = Array.isArray(response.data.data) ? response.data.data.map(asRecord) : [];

    return rows.map((row) => ({
      category: toSafeString(row.category),
      commissionAmount: toSafeNumber(row.commission_amount),
      commissionKind: toSafeString(row.commission_kind),
      commissionRate: toSafeNumber(row.commission_rate),
      earnedDate: toSafeString(row.earned_date).slice(0, 10),
      revenueAmount: toSafeNumber(row.revenue_amount),
      staffName: toSafeString(row.staff_name).trim(),
      status: toSafeString(row.status),
    }));
  },

  async settleCommission(staffId: string, amount: number): Promise<SettleCommissionResponse> {
    const response = await api.post<SettleCommissionApiResponse>(STAFF.COMMISSIONS_MARK_PAID(staffId), {
      amount,
    });
    const record = asRecord(response.data.data);

    return {
      message: response.data.message,
      remainingBalance: toSafeNumber(
        firstValue(record, ["remainingBalance", "remaining_balance", "unpaidAmount", "unpaid_amount"]),
      ),
      settledAmount: toSafeNumber(firstValue(record, ["settledAmount", "settled_amount", "amount"])),
      staffId,
      status: toSafeString(firstValue(record, ["status"])),
    };
  },
};
