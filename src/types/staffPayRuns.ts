export type PayRunEntry = {
  amount: number;
  id: string;
  netAmount: number | null;
  notes: string | null;
  periodEnd: string | null;
  periodStart: string | null;
  staffId: string;
  status: string;
};

export type UpsertPayRunRequest = {
  amount?: number;
  notes?: string;
  period_end?: string;
  period_start?: string;
  status?: string;
};

export type UpsertPayRunResponse = {
  message?: string;
  payRun: PayRunEntry;
};
