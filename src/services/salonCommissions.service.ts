import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
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
});

// Web's commission Settle tab defaults its date filter to "This month"
// (calendar month, local time — see DateRangeFilter.tsx's this_month case)
// and always scopes /commissions/summary and /commissions/earned to that
// range. The backend applies no date filter at all when start_date/end_date
// are omitted (it sums every commission_earned row ever created), so without
// this Mobile would show all-time totals instead of Web's current-month
// totals for the same staff/salon. Matching the same local-date math here
// keeps the two apps' default numbers identical.
export function getCurrentCalendarMonthRange(now = new Date()): { start_date: string; end_date: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return { start_date: toISO(new Date(y, m, 1)), end_date: toISO(new Date(y, m + 1, 0)) };
}

export const salonCommissionsService = {
  async getSummary(): Promise<SalonCommissionSummary> {
    const response = await api.get<SummaryApiResponse>(STAFF.COMMISSIONS_SUMMARY, {
      params: getCurrentCalendarMonthRange(),
    });
    const record = asRecord(response.data.data);
    const nested = firstValue(record, ["data"]);

    return normalizeSummary(nested !== undefined ? asRecord(nested) : record);
  },

  // The commission list shown to Owners/Managers is derived entirely from
  // this per-staff earnings endpoint (backend-computed from the Web-configured
  // commission rules) — Mobile does not fetch or expose the rule-configuration
  // endpoint (/staff/commissions/all), since commission rule setup is Web-only.
  async getEarned(): Promise<SalonEarnedEntry[]> {
    const response = await api.get<EarnedApiResponse>(STAFF.COMMISSIONS_EARNED, {
      params: getCurrentCalendarMonthRange(),
    });

    return getEarnedArray(response.data.data).map(normalizeEarnedEntry);
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
