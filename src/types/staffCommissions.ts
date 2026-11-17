export type CommissionHistoryEntry = {
  amount: number;
  category?: string | null;
  commissionKind?: string | null;
  commissionRate?: number | null;
  createdAt: string | null;
  id: string;
  notes: string | null;
  /** Payment method the settlement was recorded against (web: payment_method); null until paid/partial. */
  paymentMethod: string | null;
  period: string | null;
  /** The sale's billed amount this entry's commission was calculated from (web: revenue_amount). */
  revenueAmount: number;
  status: string;
};
