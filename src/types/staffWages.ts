export type StaffWage = {
  baseAmount: number;
  currency: string;
  effectiveFrom: string | null;
  notes: string | null;
  staffId: string;
  type: string;
  updatedAt: string | null;
};

export type UpdateWageRequest = {
  base_amount?: number;
  currency?: string;
  effective_from?: string;
  notes?: string;
  type?: string;
};

export type UpdateWageResponse = {
  message?: string;
  wage: StaffWage;
};
