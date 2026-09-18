import api from "../../services/api/axios";
import type { DailySummaryData } from "./cashManagement.export";
import type {
  CashDashboardSummary,
  CashExpensePayload,
  CashExpenseRecord,
  CashIncomeEntryRecord,
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

const isCashCounterNotFoundError = (err: any) => {
  const message = String(err?.message ?? "").trim().toLowerCase();
  const code = String(err?.code ?? "").trim().toUpperCase();

  return code === "CASH_COUNTER_NOT_FOUND" || message === "no cash counter found for this salon";
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
  upiAmount: asNumber(raw?.upi_amount ?? raw?.upiAmount),
  cardAmount: asNumber(raw?.card_amount ?? raw?.cardAmount),
  cashAmount: asNumber(raw?.cash_amount ?? raw?.cashAmount),
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
  closedBy: raw?.closed_by_name ?? raw?.closedByName ?? raw?.closed_by ?? raw?.closedBy ?? null,
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
  try {
    const response = await api.post(`${BASE}/open`, payload);
    return normalizeDashboard(unwrapData<any>(response));
  } catch (err) {
    if (!isCashCounterNotFoundError(err)) {
      throw err;
    }

    const response = await api.post(BASE, payload);
    return normalizeDashboard(unwrapData<any>(response));
  }
}

export async function fetchCashDashboard() {
  const response = await api.get(`${BASE}/cashdashboard`);
  return normalizeDashboard(unwrapData<any>(response));
}

export async function fetchCashTransactions() {
  const response = await api.get(BASE);
  return unwrapList<any>(response).map(normalizeTransaction);
}

const normalizeIncomeEntry = (raw: any): CashIncomeEntryRecord => ({
  id: asString(raw?.id),
  occurredAt: asString(raw?.occurred_at ?? raw?.occurredAt),
  source: asString(raw?.source, "Cash Payment"),
  reference: raw?.reference ?? null,
  clientName: asString(raw?.client_name ?? raw?.clientName, "Walk-in"),
  amount: asNumber(raw?.amount),
});

export async function fetchCashIncomeEntries(cashManagementId: string) {
  const response = await api.get(`${BASE}/income`, {
    params: { cash_management_id: cashManagementId },
  });
  return unwrapList<any>(response).map(normalizeIncomeEntry);
}

export async function fetchCashExpenses() {
  const response = await api.get(`${BASE}/expenses`);
  return unwrapList<any>(response).map(normalizeExpense);
}

// Bundles what used to be 3 separate GETs (base counter list, /expenses,
// and /api/v1/dashboard/summary) into one POST — same "no params = all rows,
// filter client-side" contract as fetchCashTransactions/fetchCashExpenses
// above, just fetched together. Leaves fetchCashDashboard/cashdashboard out:
// that one flows through cashCounterSlice (see useCashManagement.loadDashboard)
// so the navbar's Close Counter shortcut stays in sync, and deduping that
// against this bundle isn't worth the added complexity.
export async function fetchCashSummaryBundle() {
  const response = await api.post(`${BASE}/summary-bundle`, {
    sections: ["cash_counters", "cash_expenses", "dashboard_summary"],
  });
  const data = unwrapData<any>(response);
  const transactions: any[] = Array.isArray(data?.cash_counters?.items) ? data.cash_counters.items : [];
  const expenses: any[] = Array.isArray(data?.cash_expenses?.items) ? data.cash_expenses.items : [];
  const dashboardSummary = data?.dashboard_summary;

  return {
    transactions: transactions.map(normalizeTransaction),
    expenses: expenses.map(normalizeExpense),
    todayRevenue: asNumber(dashboardSummary?.todayRevenue ?? dashboardSummary?.today_revenue),
  };
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
  try {
    const response = await api.post(`${BASE}/close`, payload);
    return normalizeDashboard(unwrapData<any>(response));
  } catch (err: any) {
    if (err?.response?.status === 409) {
      console.warn("[cash-management] Counter already closed (409 Conflict)");
      return {
        cashManagementId: payload.cash_management_id || "",
        status: "closed" as const,
        openingBalance: 0,
        cashRevenue: 0,
        cashExpense: 0,
        closingBalance: 0,
        inStoreCash: payload.in_store_cash || 0,
        reconciliationAmount: 0,
        openedAt: null,
        closedAt: new Date().toISOString(),
        remarks: payload.remarks || null,
        upiAmount: 0,
        cardAmount: 0,
        cashAmount: 0,
      };
    }
    throw err;
  }
}

export async function sendDailySummaryEmail(
  cashManagementId: string,
  summaryData?: Partial<DailySummaryData>,
  ownerEmail?: string
) {
  const payload = {
    cash_management_id: cashManagementId,
    email: ownerEmail,
    opening_balance: summaryData?.openingBalance ?? 0,
    cash_revenue: summaryData?.cashRevenue ?? 0,
    cash_expense: summaryData?.cashExpense ?? 0,
    closing_balance: summaryData?.closingBalance ?? 0,
    in_store_cash: summaryData?.inStoreCash ?? 0,
    reconciliation_amount: summaryData?.reconciliationAmount ?? 0,
    remarks: summaryData?.remarks ?? "",
    upi_payment_amount: summaryData?.upiAmount ?? summaryData?.paymentCounts?.amounts?.upi ?? 0,
    card_payment_amount: summaryData?.cardAmount ?? summaryData?.paymentCounts?.amounts?.card ?? 0,
  };

  try {
    const res = await api.post(`${BASE}/send-summary-email`, payload);
    return res.data;
  } catch (primaryErr: any) {
    console.warn("[Daily Summary Email] Primary endpoint returned:", primaryErr?.response?.status || primaryErr?.message);
    try {
      const fallbackRes = await api.post(`${BASE}/email-summary`, payload);
      return fallbackRes.data;
    } catch (fallbackErr: any) {
      const status = fallbackErr?.response?.status || primaryErr?.response?.status;
      const msg = fallbackErr?.response?.data?.message || primaryErr?.response?.data?.message || (status === 404 ? "Email API endpoint not found on server (404)" : "Email delivery failed");
      console.error("%c[Daily Summary Email] Error:", "color: #ef4444; font-weight: bold", msg);
      throw new Error(msg);
    }
  }
}

