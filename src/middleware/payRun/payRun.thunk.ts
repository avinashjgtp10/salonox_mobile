/**
 * payRun.thunk.ts
 *
 * NOTE: The backend does NOT yet have a Pay Runs route.
 * Confirmed via Swagger at http://34.234.206.201:3000/api-docs —
 * registered tags are: Auth, Salons, Branches, Categories, Staff, Users.
 *
 * These thunks persist data to localStorage so records survive page refreshes.
 * When the backend implements /api/v1/pay-runs, replace localStorage logic
 * with the api.get/post/put/delete calls marked with TODO comments.
 */
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { PayRun, PayRunSummary } from "../../types/payRun.types";

// ── localStorage persistence ──────────────────────────────────────────────────
const STORAGE_KEY = "salon_pay_runs";

function loadFromStorage(): PayRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PayRun[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(runs: PayRun[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // storage quota exceeded — fail silently
  }
}

function getNextId(runs: PayRun[]): number {
  if (runs.length === 0) return 1;
  const max = runs.reduce((m, r) => {
    const n = parseInt(String(r.id).replace("local-", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return max + 1;
}

function computeSummary(runs: PayRun[]): PayRunSummary {
  return runs.reduce(
    (acc, r) => ({
      earnings: acc.earnings + (r.earnings || 0),
      other:    acc.other    + (r.other    || 0),
      total:    acc.total    + (r.total    || 0),
      paid:     acc.paid     + (r.paid     || 0),
      toPay:    acc.toPay    + (r.toPay    || 0),
    }),
    { earnings: 0, other: 0, total: 0, paid: 0, toPay: 0 }
  );
}

// ── Fetch all ─────────────────────────────────────────────────────────────────
export const fetchPayRunsThunk = createAsyncThunk<
  { items: PayRun[]; summary: PayRunSummary; total: number },
  { search?: string; startDate?: string; endDate?: string; page?: number; limit?: number },
  { rejectValue: string }
>("payRun/fetchAll", async (params) => {
  // TODO: replace with → const res = await api.get(PAY_RUNS.BASE, { params });
  let items = loadFromStorage();
  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter((r) => r.employeeName?.toLowerCase().includes(q));
  }
  return { items, summary: computeSummary(items), total: items.length };
});

// ── Fetch by ID ───────────────────────────────────────────────────────────────
export const fetchPayRunByIdThunk = createAsyncThunk<
  PayRun,
  string | number,
  { rejectValue: string }
>("payRun/fetchById", async (id, { rejectWithValue }) => {
  // TODO: replace with → const res = await api.get(PAY_RUNS.BY_ID(id));
  const runs = loadFromStorage();
  const found = runs.find((r) => String(r.id) === String(id));
  if (!found) return rejectWithValue("Pay run not found");
  return found;
});

// ── Create ────────────────────────────────────────────────────────────────────
export const createPayRunThunk = createAsyncThunk<
  PayRun,
  Partial<PayRun & { staffId?: string | number }>,
  { rejectValue: string }
>("payRun/create", async (data, { rejectWithValue }) => {
  try {
    // TODO: replace with → const res = await api.post(PAY_RUNS.BASE, data);
    const runs = loadFromStorage();
    const net = (data.earnings || 0) + (data.other || 0) - (data.deductions || 0);
    const newRun: PayRun = {
      id: `local-${getNextId(runs)}`,
      staffId:        data.staffId,
      staff_id:       data.staffId,
      employeeName:   data.employeeName   || "Unknown",
      payPeriodStart: data.payPeriodStart || new Date().toISOString().split("T")[0],
      payPeriodEnd:   data.payPeriodEnd   || new Date().toISOString().split("T")[0],
      earnings:       data.earnings       || 0,
      deductions:     data.deductions     || 0,
      other:          data.other          || 0,
      total:          net,
      paid:           0,
      toPay:          net,
      paymentMethod:  data.paymentMethod  || "Bank Transfer",
      notes:          data.notes          || "",
      status:         "pending",
      createdAt:      new Date().toISOString(),
    };
    const updated = [newRun, ...runs];
    saveToStorage(updated);
    return newRun;
  } catch {
    return rejectWithValue("Failed to save pay run");
  }
});

// ── Update ────────────────────────────────────────────────────────────────────
export const updatePayRunThunk = createAsyncThunk<
  PayRun,
  { id: string | number; data: Partial<PayRun> },
  { rejectValue: string }
>("payRun/update", async ({ id, data }, { rejectWithValue }) => {
  // TODO: replace with → await api.put(PAY_RUNS.BY_ID(id), data);
  const runs = loadFromStorage();
  const idx = runs.findIndex((r) => String(r.id) === String(id));
  if (idx === -1) return rejectWithValue("Pay run not found");
  runs[idx] = { ...runs[idx], ...data };
  saveToStorage(runs);
  return runs[idx];
});

// ── Delete ────────────────────────────────────────────────────────────────────
export const deletePayRunThunk = createAsyncThunk<
  string | number,
  { id: string | number; staffId?: string | number },
  { rejectValue: string }
>("payRun/delete", async ({ id }, { rejectWithValue }) => {
  // TODO: replace with → await api.delete(PAY_RUNS.BY_ID(id));
  const runs = loadFromStorage();
  const filtered = runs.filter((r) => String(r.id) !== String(id));
  if (filtered.length === runs.length) return rejectWithValue("Pay run not found");
  saveToStorage(filtered);
  return id;
});
