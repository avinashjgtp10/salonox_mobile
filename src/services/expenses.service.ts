import { api } from "@/services/api";

export type Expense = {
  id: string;
  counterId: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  counterStatus: "open" | "closed";
};
export type ExpenseInput = { expense_type: string; description: string; amount: number; expense_date: string };
type ExpenseRecord = {
  id: string; cash_management_id: string; expense_type: string; description?: string | null;
  amount: number | string; expense_date: string; transaction_status?: string;
};
type Envelope<T> = { data: T };
const BASE = "/cash-management";

export const expensesService = {
  async list(): Promise<Expense[]> {
    // Match the web: fetch the complete history, then filter by expense date.
    const response = await api.get<Envelope<{ items: ExpenseRecord[] }>>(`${BASE}/expenses`, {
      params: { sort_by: "expense_date", sort_order: "desc" },
    });
    return response.data.data.items.map(row => ({
      id: row.id, counterId: row.cash_management_id, type: row.expense_type,
      description: row.description ?? "", amount: Number(row.amount), date: row.expense_date,
      counterStatus: row.transaction_status === "open" ? "open" : "closed",
    }));
  },
  async openCounterId(): Promise<string | null> {
    const response = await api.get<Envelope<{ items: { id: string; status: string }[] }>>(BASE, {
      params: { status: "open", page: 1, limit: 1 },
    });
    return response.data.data.items.find(row => row.status === "open")?.id ?? null;
  },
  async create(counterId: string, input: ExpenseInput): Promise<void> {
    await api.post(`${BASE}/expenses`, { ...input, cash_management_id: counterId });
  },
  async update(id: string, input: ExpenseInput): Promise<void> {
    await api.put(`${BASE}/expenses/${encodeURIComponent(id)}`, input);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/expenses/${encodeURIComponent(id)}`);
  },
};
