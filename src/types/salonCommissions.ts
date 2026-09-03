export type SalonCommissionSummary = {
  paidAmount: number;
  pendingAmount: number;
  totalAmount: number;
};

export type SalonEarnedEntry = {
  earnedAmount: number;
  id: string;
  paidAmount: number;
  pendingAmount: number;
  period: string | null;
  staffId: string;
  staffName: string;
  transactionCount: number;
};

export type SalonCommissionRecord = {
  amount: number;
  id: string;
  period: string | null;
  staffId: string;
  staffName: string;
  status: string;
  unpaidAmount?: number;
};

export type SettleCommissionRequest = {
  staffId: string;
  amount: number;
};

export type SettleCommissionResponse = {
  message?: string;
  staffId: string;
  remainingBalance?: number;
  settledAmount?: number;
  status?: string;
};
