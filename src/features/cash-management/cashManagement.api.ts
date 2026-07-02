import api from "../../services/api/axios";
import type {
  CashDashboardSummary,
  CashExpensePayload,
  CashExpenseRecord,
  CashRevenueRecord,
  CashTransactionRecord,
  CloseCounterPayload,
  OpenCounterPayload,
  UpdateCashExpensePayload,
} from "./cashManagement.types";

const BASE = "/api/v1/cash-management";

const asNumber = (value: unknown) => {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
};

const asString = (value: unknown, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const pickNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return 0;
};

const parseSplitDetails = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Record<string, unknown> | unknown[];
  return null;
};

const getSplitCashAmount = (value: unknown) => {
  const splitDetails = parseSplitDetails(value);
  if (!splitDetails) return null;

  if (Array.isArray(splitDetails)) {
    for (const item of splitDetails) {
      const method = asString(
        (item as any)?.payment_method ??
          (item as any)?.method ??
          (item as any)?.type ??
          (item as any)?.name,
      ).toLowerCase();
      if (method === "cash") {
        return pickNumber(
          (item as any)?.amount,
          (item as any)?.paid_amount,
          (item as any)?.value,
        );
      }
    }
    return null;
  }

  return pickNumber(
    (splitDetails as any)?.Cash,
    (splitDetails as any)?.cash,
    (splitDetails as any)?.CASH,
  );
};

const unwrapData = <T,>(payload: any): T => {
  return (payload?.data?.data ?? payload?.data ?? payload) as T;
};

const unwrapList = <T,>(payload: any): T[] => {
  const data = unwrapData<any>(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeDashboard = (raw: any): CashDashboardSummary => ({
  cashManagementId: asString(raw?.cash_management_id ?? raw?.cashManagementId ?? raw?.id),
  status: asString(raw?.status ?? raw?.counter_status ?? raw?.counterStatus, "closed"),
  openingBalance: asNumber(raw?.opening_balance ?? raw?.openingBalance),
  cashRevenue: asNumber(raw?.cash_revenue ?? raw?.cashRevenue),
  cashExpense: asNumber(raw?.cash_expense ?? raw?.cashExpense),
  closingBalance: asNumber(raw?.closing_balance ?? raw?.closingBalance),
  inStoreCash: asNumber(raw?.in_store_cash ?? raw?.inStoreCash),
  reconciliationAmount: asNumber(raw?.reconciliation_amount ?? raw?.reconciliationAmount),
  openedAt: raw?.opened_at ?? raw?.openedAt ?? null,
  closedAt: raw?.closed_at ?? raw?.closedAt ?? null,
  remarks: raw?.remarks ?? null,
});

const normalizeTransaction = (raw: any): CashTransactionRecord => ({
  id: asString(raw?.id ?? raw?.cash_management_id),
  createdBy: asString(
    raw?.created_by_name ??
      raw?.createdByName ??
      raw?.created_by ??
      raw?.createdBy ??
      raw?.user_name ??
      raw?.staff_name,
    "System",
  ),
  status: asString(raw?.status, "closed"),
  date: asString(raw?.date ?? raw?.created_at ?? raw?.opened_at ?? raw?.openedAt),
  updatedAt: raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? raw?.createdAt ?? null,
  openedAt: raw?.opened_at ?? raw?.openedAt ?? null,
  closedAt: raw?.closed_at ?? raw?.closedAt ?? null,
  openingBalance: asNumber(raw?.opening_balance ?? raw?.openingBalance),
  cashRevenue: asNumber(raw?.cash_revenue ?? raw?.cashRevenue),
  cashExpense: asNumber(raw?.cash_expense ?? raw?.cashExpense),
  inStoreCash: asNumber(raw?.in_store_cash ?? raw?.inStoreCash),
  closingBalance: asNumber(raw?.closing_balance ?? raw?.closingBalance),
  reconciliationAmount: asNumber(raw?.reconciliation_amount ?? raw?.reconciliationAmount),
  remarks: raw?.remarks ?? null,
});

const normalizeRevenue = (raw: any): CashRevenueRecord => ({
  id: asString(
    raw?.id ?? raw?.payment_id ?? raw?.paymentId ?? raw?.invoice_number ?? raw?.invoiceNo,
  ),
  updatedAt: asString(
    raw?.updated_at ?? raw?.updatedAt ?? raw?.time ?? raw?.created_at ?? raw?.createdAt,
  ),
  paymentId: asString(
    raw?.payment_id ??
      raw?.paymentId ??
      raw?.invoice_number ??
      raw?.invoiceNo ??
      raw?.invoice_id,
    "-",
  ),
  invoiceId: asString(
    raw?.invoice_id ??
      raw?.invoiceId ??
      raw?.invoice_number ??
      raw?.invoiceNo ??
      raw?.payment_id ??
      raw?.paymentId,
    "-",
  ),
  client: asString(raw?.client_name ?? raw?.client ?? raw?.clientName, "Walk-in"),
  staff: asString(raw?.staff_name ?? raw?.staff ?? raw?.staffName, "-"),
  service: asString(
    raw?.service_name ??
      raw?.service ??
      raw?.serviceName ??
      raw?.service_title ??
      raw?.serviceTitle,
    "-",
  ),
  paymentMethod: asString(
    raw?.payment_method ?? raw?.paymentMethod ?? raw?.payment_mode ?? raw?.paymentMode,
    "-",
  ),
  cashReceived:
    getSplitCashAmount(raw?.split_details ?? raw?.splitDetails) ??
    (asString(raw?.payment_method ?? raw?.paymentMethod).toLowerCase().includes("cash")
      ? pickNumber(
          raw?.cash_received,
          raw?.cashReceived,
          raw?.cash_amount,
          raw?.cashAmount,
          raw?.paid_amount,
          raw?.paidAmount,
          raw?.total_paid,
          raw?.totalPaid,
          raw?.amount,
        )
      : pickNumber(raw?.cash_received, raw?.cashReceived, raw?.cash_amount, raw?.cashAmount)),
  totalPaid: pickNumber(
    raw?.paid_amount,
    raw?.paidAmount,
    raw?.total_paid,
    raw?.totalPaid,
    raw?.amount,
  ),
});

const normalizeExpense = (raw: any): CashExpenseRecord => ({
  id: asString(raw?.id),
  cashManagementId: asString(raw?.cash_management_id ?? raw?.cashManagementId),
  expenseDate: asString(raw?.expense_date ?? raw?.expenseDate),
  createdAt: raw?.created_at ?? raw?.createdAt ?? null,
  updatedAt: raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? raw?.createdAt ?? null,
  expenseType: asString(raw?.expense_type ?? raw?.expenseType, "Expense"),
  description: asString(raw?.description, "-"),
  amount: asNumber(raw?.amount),
  createdBy: asString(
    raw?.created_by_name ??
      raw?.createdByName ??
      raw?.created_by ??
      raw?.createdBy ??
      raw?.user_name,
    "System",
  ),
  transactionStatus: asString(
    raw?.transaction_status ?? raw?.transactionStatus ?? raw?.status,
    "open",
  ),
  transactionOpenedAt:
    raw?.transaction_opened_at ??
    raw?.transactionOpenedAt ??
    raw?.opened_at ??
    raw?.openedAt ??
    null,
  transactionClosedAt:
    raw?.transaction_closed_at ??
    raw?.transactionClosedAt ??
    raw?.closed_at ??
    raw?.closedAt ??
    null,
});

export async function openCashCounter(payload: OpenCounterPayload) {
  const response = await api.post(`${BASE}/open`, payload);
  return normalizeDashboard(unwrapData<any>(response));
}

export async function fetchCashDashboard() {
  const response = await api.get(`${BASE}/cashdashboard`);
  return normalizeDashboard(unwrapData<any>(response));
}

export async function fetchCashTransactions() {
  const response = await api.get(BASE);
  return unwrapList<any>(response).map(normalizeTransaction);
}

export async function fetchCashRevenue() {
  const response = await api.get(`${BASE}/revenue`);
  return unwrapList<any>(response).map(normalizeRevenue);
}

export async function fetchCashExpenses() {
  const response = await api.get(`${BASE}/expenses`);
  return unwrapList<any>(response).map(normalizeExpense);
}

export async function createCashExpense(payload: CashExpensePayload) {
  const response = await api.post(`${BASE}/expenses`, payload);
  return normalizeExpense(unwrapData<any>(response));
}

export async function updateCashExpense(payload: UpdateCashExpensePayload) {
  const { id, ...body } = payload;
  const response = await api.put(`${BASE}/expenses/${id}`, body);
  return normalizeExpense(unwrapData<any>(response));
}

export async function deleteCashExpense(id: string) {
  await api.delete(`${BASE}/expenses/${id}`);
}

export async function closeCashCounter(payload: CloseCounterPayload) {
  const response = await api.post(`${BASE}/close`, payload);
  return normalizeDashboard(unwrapData<any>(response));
}
