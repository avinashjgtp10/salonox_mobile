import { api } from "@/services/api";

export type Expense = {
  id: string;
  counterId: string | null;
  type: string;
  description: string;
  amount: number;
  date: string;
  /**
   * The cash counter this expense came from, for the ones recorded through
   * Cash Management. null for a manually added expense, which belongs to no
   * counter at all — the API records those with cash_management_id NULL.
   */
  counterStatus: "open" | "closed" | null;
};
export type ExpenseInput = { expense_type: string; description: string; amount: number; expense_date: string };
type ExpenseRecord = {
  id: string; cash_management_id: string | null; expense_type: string; description?: string | null;
  amount: number | string; expense_date: string; transaction_status?: string | null;
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
      id: row.id, counterId: row.cash_management_id ?? null, type: row.expense_type,
      description: row.description ?? "", amount: Number(row.amount), date: row.expense_date,
      counterStatus: row.transaction_status === "open" ? "open" : row.transaction_status ? "closed" : null,
    }));
  },
  /**
    * A manually added expense stands on its own: the API records it with no
    * cash_management_id, so there is no counter to open first and no counter
    * balance to recalculate. Same contract as the web's expense form.
    */
  async create(input: ExpenseInput): Promise<void> {
    await api.post(`${BASE}/expenses`, input);
  },
  async update(id: string, input: ExpenseInput): Promise<void> {
    await api.put(`${BASE}/expenses/${encodeURIComponent(id)}`, input);
  },
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/expenses/${encodeURIComponent(id)}`);
  },
};
