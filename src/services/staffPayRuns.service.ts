import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type { PayRunEntry, UpsertPayRunRequest, UpsertPayRunResponse } from "@/types/staffPayRuns";
import { asRecord, toSafeString } from "@/utils/apiNormalize";

const normalizeSettings = (data: unknown, staffId: string): PayRunEntry => {
  const entry = asRecord(data);
  return {
    id: toSafeString(entry.id, staffId), staffId,
    pay_runs_enabled: entry.pay_runs_enabled === true,
    payment_method: entry.payment_method === "bank_transfer" ? "bank_transfer" : "pay_manually",
    calculation_type: entry.calculation_type === "manual" ? "manual" : "automatic",
    deduct_payment_processing_fees: entry.deduct_payment_processing_fees === true,
    deduct_new_client_fees: entry.deduct_new_client_fees === true,
    record_cash_advances: entry.record_cash_advances === true,
  };
};

export const staffPayRunsService = {
  async getPayRuns(staffId: string): Promise<PayRunEntry[]> {
    const response = await api.get<ApiResponse<unknown>>(STAFF.PAY_RUNS(staffId));
    return response.data.data ? [normalizeSettings(response.data.data, staffId)] : [];
  },
  async upsertPayRun(staffId: string, payload: UpsertPayRunRequest): Promise<UpsertPayRunResponse> {
    const response = await api.put<ApiResponse<unknown>>(STAFF.PAY_RUNS(staffId), payload);
    return { message: response.data.message, payRun: normalizeSettings(response.data.data, staffId) };
  },
};
