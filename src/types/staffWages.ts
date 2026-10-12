export type StaffWage = {
  baseAmount: number;
  wagesEnabled: boolean;
  currency: string;
  effectiveFrom: string | null;
  notes: string | null;
  staffId: string;
  type: string;
  updatedAt: string | null;
};

export type UpdateWageRequest = {
  wages_enabled?: boolean;
  compensation_type?: "none" | "hourly" | "salary" | "commission";
  hourly_rate?: number | null;
  salary_amount?: number | null;
};

export type UpdateWageResponse = {
  message?: string;
  wage: StaffWage;
};
