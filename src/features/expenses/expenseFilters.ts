import type { Expense } from "@/services/expenses.service";
import { parseAppDateTime } from "@/utils/dateTime";

export const EXPENSE_TYPES = ["Rent", "Electricity", "Water Bill", "Internet", "Staff Salary", "Staff Advance", "Supplies", "Product Purchase", "Maintenance", "Cleaning", "Marketing", "Transportation", "Office Expenses", "Equipment", "Tax", "Miscellaneous"];

export function expenseDateKey(value: string): string {
  const date = parseAppDateTime(value);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : value.slice(0, 10);
}

export function filterExpenses(rows: Expense[], search: string, type: string | null, start: string | null, end: string | null) {
  const query = search.trim().toLowerCase();
  return rows.filter(row => {
    const day = expenseDateKey(row.date);
    return (!type || row.type === type) && (!start || day >= start) && (!end || day <= end)
      && (!query || `${row.type} ${row.description}`.toLowerCase().includes(query));
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function expenseAmount(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
