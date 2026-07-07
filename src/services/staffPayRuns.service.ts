import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { PayRunEntry, UpsertPayRunRequest, UpsertPayRunResponse } from "@/types/staffPayRuns";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeNumber,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type PayRunListApiData =
  | UnknownRecord[]
  | {
      data?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
      pay_runs?: UnknownRecord[] | null;
      payRuns?: UnknownRecord[] | null;
      rows?: UnknownRecord[] | null;
    };
type PayRunListApiResponse = ApiResponse<PayRunListApiData>;
type PayRunApiData =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      pay_run?: UnknownRecord | null;
      payRun?: UnknownRecord | null;
    };
type PayRunApiResponse = ApiResponse<PayRunApiData>;

const getPayRunArray = (payload: PayRunListApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["payRuns", "pay_runs", "items", "rows", "data"]);
};

const getPayRunFromEnvelope = (payload: PayRunApiData): UnknownRecord => {
  const record = asRecord(payload);

  return asRecord(firstValue(record, ["payRun", "pay_run", "data"])) ?? record;
};

const normalizePayRun = (entry: UnknownRecord, staffId: string, index: number): PayRunEntry => {
  const rawNetAmount = firstValue(entry, ["netAmount", "net_amount"]);

  return {
    amount: toSafeNumber(firstValue(entry, ["amount", "gross_amount", "grossAmount"])),
    id: toSafeString(firstValue(entry, ["id", "_id"]), `pay-run-${index}`),
    netAmount: rawNetAmount !== undefined ? toSafeNumber(rawNetAmount) : null,
    notes: toSafeString(firstValue(entry, ["notes"])) || null,
    periodEnd: toSafeString(firstValue(entry, ["periodEnd", "period_end"])) || null,
    periodStart: toSafeString(firstValue(entry, ["periodStart", "period_start"])) || null,
    staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
    status: toSafeString(firstValue(entry, ["status"]), "pending"),
  };
};

export const staffPayRunsService = {
  async getPayRuns(staffId: string): Promise<PayRunEntry[]> {
    const response = await api.get<PayRunListApiResponse>(STAFF.PAY_RUNS(staffId));

    return getPayRunArray(response.data.data).map((entry, index) =>
      normalizePayRun(entry, staffId, index),
    );
  },

  async upsertPayRun(staffId: string, payload: UpsertPayRunRequest): Promise<UpsertPayRunResponse> {
    const response = await api.put<PayRunApiResponse>(STAFF.PAY_RUNS(staffId), payload);

    return {
      message: response.data.message,
      payRun: normalizePayRun(getPayRunFromEnvelope(response.data.data), staffId, 0),
    };
  },
};
