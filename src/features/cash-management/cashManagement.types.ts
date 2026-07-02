export type CashCounterStatus = "open" | "closed" | "reconciled" | string;

export interface OpenCounterPayload {
  opening_balance: number;
}

export interface CloseCounterPayload {
  cash_management_id: string;
  in_store_cash: number;
  remarks?: string;
}

export interface CashExpensePayload {
  cash_management_id: string;
  expense_type: string;
  description: string;
  amount: number;
  expense_date: string;
}

export interface UpdateCashExpensePayload extends CashExpensePayload {
  id: string;
}

export interface CashDashboardSummary {
  cashManagementId: string;
  status: CashCounterStatus;
  openingBalance: number;
  cashRevenue: number;
  cashExpense: number;
  closingBalance: number;
  inStoreCash: number;
  reconciliationAmount: number;
  openedAt: string | null;
  closedAt: string | null;
  remarks: string | null;
}

export interface CashTransactionRecord {
  id: string;
  createdBy: string;
  status: CashCounterStatus;
  date: string;
  updatedAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  openingBalance: number;
  cashRevenue: number;
  cashExpense: number;
  inStoreCash: number;
  closingBalance: number;
  reconciliationAmount: number;
  remarks: string | null;
}

export interface CashRevenueRecord {
  id: string;
  updatedAt: string;
  invoiceId: string;
  paymentId: string;
  client: string;
  staff: string;
  service: string;
  paymentMethod: string;
  cashReceived: number;
  totalPaid: number;
}

export interface CashExpenseRecord {
  id: string;
  cashManagementId: string;
  expenseDate: string;
  createdAt: string | null;
  updatedAt: string | null;
  expenseType: string;
  description: string;
  amount: number;
  createdBy: string;
  transactionStatus: CashCounterStatus;
  transactionOpenedAt: string | null;
  transactionClosedAt: string | null;
}

export interface CashManagementState {
  dashboard: CashDashboardSummary | null;
  transactions: CashTransactionRecord[];
  expenses: CashExpenseRecord[];
}
