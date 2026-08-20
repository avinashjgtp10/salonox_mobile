export type SalonCommissionSummary = {
  paidAmount: number;
  pendingAmount: number;
  totalAmount: number;
  totalStaff: number;
};

export type SalonEarnedEntry = {
  earnedAmount: number;
  id: string;
  period: string | null;
  staffId: string;
  staffName: string;
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

export type SalonCommissionListQuery = {
  limit: number;
  offset: number;
  search?: string;
  status?: string;
};

export type SalonCommissionListPagination = {
  hasMore: boolean;
  limit: number;
  nextOffset: number;
  offset: number;
};

export type SalonCommissionListResponse = {
  pagination: SalonCommissionListPagination;
  query: SalonCommissionListQuery;
  records: SalonCommissionRecord[];
  totalCount: number;
};

export type MarkCommissionPaidResponse = {
  message?: string;
  staffId: string;
};

export type SettleCommissionRequest = {
  staffId: string;
  amount: number;
};

export type SettleCommissionResponse = {
  message?: string;
  staffId: string;
  remainingBalance?: number;
  status?: string;
};

export type BulkConfigureCommissionsRequest = {
  rate: number;
  type: string;
};

export type BulkConfigureCommissionsResponse = {
  affectedCount: number;
  message?: string;
};

export type ExportCommissionsResponse = {
  message?: string;
  url: string | null;
};
