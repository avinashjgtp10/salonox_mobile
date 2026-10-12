export type PayRunEntry = {
  id: string;
  staffId: string;
  pay_runs_enabled: boolean;
  payment_method: "pay_manually" | "bank_transfer";
  calculation_type: "automatic" | "manual";
  deduct_payment_processing_fees: boolean;
  deduct_new_client_fees: boolean;
  record_cash_advances: boolean;
};

export type UpsertPayRunRequest = Partial<Omit<PayRunEntry, "id" | "staffId">>;
export type UpsertPayRunResponse = { message?: string; payRun: PayRunEntry };
