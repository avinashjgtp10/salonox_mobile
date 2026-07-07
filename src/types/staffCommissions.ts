export type CommissionSettings = {
  rate: number;
  staffId: string;
  type: string;
  updatedAt: string | null;
};

export type UpdateCommissionSettingsRequest = {
  rate?: number;
  type?: string;
};

export type UpdateCommissionSettingsResponse = {
  commission: CommissionSettings;
  message?: string;
};

export type CommissionSlab = {
  id: string;
  maxAmount: number | null;
  minAmount: number;
  rate: number;
};

export type CommissionSlabRequest = {
  id?: string;
  max_amount?: number;
  min_amount: number;
  rate: number;
};

export type UpdateCommissionSlabsRequest = {
  slabs: CommissionSlabRequest[];
};

export type UpdateCommissionSlabsResponse = {
  message?: string;
  slabs: CommissionSlab[];
};

export type CommissionHistoryEntry = {
  amount: number;
  createdAt: string | null;
  id: string;
  notes: string | null;
  period: string | null;
  status: string;
};
