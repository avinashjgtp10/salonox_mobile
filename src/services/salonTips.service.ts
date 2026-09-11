import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  SalonTipEarnedEntry,
  SalonTipSettlement,
  SalonTipSummary,
  SettleTipResponse,
} from "@/types/salonTips";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";
import { getCurrentCalendarMonthRange } from "@/services/salonCommissions.service";

type SummaryApiData = UnknownRecord | { data?: UnknownRecord | null };
type SummaryApiResponse = ApiResponse<SummaryApiData>;
type EarnedApiData =
  | UnknownRecord[]
  | { data?: UnknownRecord[] | null; earned?: UnknownRecord[] | null; items?: UnknownRecord[] | null };
type EarnedApiResponse = ApiResponse<EarnedApiData>;
type SettlementsApiData =
  | UnknownRecord[]
  | {
      data?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
      payouts?: UnknownRecord[] | null;
      settlements?: UnknownRecord[] | null;
    };
type SettlementsApiResponse = ApiResponse<SettlementsApiData>;
type SettleTipApiResponse = ApiResponse<unknown>;

const normalizeSummary = (entry: UnknownRecord): SalonTipSummary => ({
  paidAmount: toSafeNumber(firstValue(entry, ["paidAmount", "paid_amount", "paid_out", "paidOut"])),
  pendingAmount: toSafeNumber(
    firstValue(entry, ["pendingAmount", "pending_amount", "pending_payout", "pendingPayout"]),
  ),
  totalAmount: toSafeNumber(
    firstValue(entry, ["totalAmount", "total_amount", "total_tip", "totalTip", "tips", "tip_amount"]),
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

const normalizeEarnedEntry = (entry: UnknownRecord, index: number): SalonTipEarnedEntry => ({
  earnedAmount: toSafeNumber(
    firstValue(entry, ["earnedAmount", "earned_amount", "total_earned", "totalEarned", "amount", "tip_amount"]),
  ),
  id: toSafeString(firstValue(entry, ["id", "_id", "staffId", "staff_id"]), `tip-earned-${index}`),
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

const getSettlementsArray = (payload: SettlementsApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["settlements", "payouts", "items", "data"]);
};

const normalizeSettlement = (entry: UnknownRecord, index: number): SalonTipSettlement => ({
  amount: toSafeNumber(
    firstValue(entry, ["amount", "settledAmount", "settled_amount", "paidAmount", "paid_amount"]),
  ),
  id: toSafeString(firstValue(entry, ["id", "_id", "settlementId", "settlement_id"]), `tip-settlement-${index}`),
  notes: toSafeString(firstValue(entry, ["notes", "note", "remarks"])) || null,
  paymentMethod:
    toSafeString(firstValue(entry, ["paymentMethod", "payment_method", "paymentMode", "payment_mode"])) ||
    null,
  settledAt:
    toSafeString(
      firstValue(entry, ["settledAt", "settled_at", "paidAt", "paid_at", "createdAt", "created_at", "date"]),
    ) || null,
  status: toSafeString(firstValue(entry, ["status"]), "paid"),
});

export const salonTipsService = {
  async getSummary(): Promise<SalonTipSummary> {
    const response = await api.get<SummaryApiResponse>(STAFF.TIPS_SUMMARY, {
      params: getCurrentCalendarMonthRange(),
    });
    const record = asRecord(response.data.data);
    const nested = firstValue(record, ["data"]);

    return normalizeSummary(nested !== undefined ? asRecord(nested) : record);
  },

  async getEarned(): Promise<SalonTipEarnedEntry[]> {
    const response = await api.get<EarnedApiResponse>(STAFF.TIPS_EARNED, {
      params: getCurrentCalendarMonthRange(),
    });

    return getEarnedArray(response.data.data).map(normalizeEarnedEntry);
  },

  async getSettlements(staffId: string): Promise<SalonTipSettlement[]> {
    const response = await api.get<SettlementsApiResponse>(STAFF.TIPS_SETTLEMENTS(staffId));

    return getSettlementsArray(response.data.data).map(normalizeSettlement);
  },

  async settleTip(staffId: string, amount: number, paymentMethod?: string): Promise<SettleTipResponse> {
    const response = await api.post<SettleTipApiResponse>(STAFF.TIPS_SETTLE(staffId), {
      amount,
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
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
