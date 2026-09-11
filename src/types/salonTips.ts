export type SalonTipSummary = {
  paidAmount: number;
  pendingAmount: number;
  totalAmount: number;
};

export type SalonTipEarnedEntry = {
  earnedAmount: number;
  id: string;
  paidAmount: number;
  pendingAmount: number;
  period: string | null;
  staffId: string;
  staffName: string;
  transactionCount: number;
};

export type SalonTipRecord = {
  amount: number;
  id: string;
  period: string | null;
  staffId: string;
  staffName: string;
  status: string;
  unpaidAmount?: number;
};

export type SalonTipSettlement = {
  amount: number;
  id: string;
  notes: string | null;
  paymentMethod: string | null;
  settledAt: string | null;
  status: string;
};

export type SettleTipRequest = {
  amount: number;
  paymentMethod?: string;
  staffId: string;
};

export type SettleTipResponse = {
  message?: string;
  remainingBalance?: number;
  settledAmount?: number;
  staffId: string;
  status?: string;
};
