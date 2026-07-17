import api from "../../services/api/axios";
import type {
  CashDashboardSummary,
  CashExpensePayload,
  CashExpenseRecord,
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
