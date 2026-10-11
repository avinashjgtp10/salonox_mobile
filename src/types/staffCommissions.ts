export type CommissionHistoryEntry = {
  amount: number;
  category?: string | null;
  commissionKind?: string | null;
  commissionRate?: number | null;
  createdAt: string | null;
  id: string;
  notes: string | null;
  period: string | null;
  status: string;
};
