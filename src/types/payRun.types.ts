export interface PayRun {
  id: string | number;
  staffId?: string | number;
  staff_id?: string | number;
  employeeName: string;
  employeeAvatar?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  earnings: number;
  deductions: number;
  other: number;
  total: number;
  paid: number;
  toPay: number;
  paymentMethod: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayRunSummary {
  earnings: number;
  other: number;
  total: number;
  paid: number;
  toPay: number;
}

export interface PayRunState {
  payRuns: PayRun[];
  summary: PayRunSummary;
  loading: boolean;
  error: string | null;
  success: boolean;
  totalItems: number;
  currentPage: number;
  totalPages: number;
}

export interface PayRunResponse {
  success: boolean;
  message: string;
  data: {
    items: PayRun[];
    summary: PayRunSummary;
    total: number;
  };
}

export interface SinglePayRunResponse {
  success: boolean;
  message: string;
  data: PayRun;
}
