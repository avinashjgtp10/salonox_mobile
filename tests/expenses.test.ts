import { api } from "@/services/api";
import { expensesService, type Expense } from "@/services/expenses.service";
import { expenseAmount, filterExpenses } from "@/features/expenses/expenseFilters";
import { isStaffAllowedRoute } from "@/utils/routeResolver";
import type { AuthUser } from "@/types/auth";

jest.mock("@/services/api", () => ({ api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

it("reads expense history and marks only open-counter entries editable", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: { items: [
    { id: "one", cash_management_id: "counter", expense_type: "Rent", amount: "1200.50", description: null, expense_date: "2026-11-10", transaction_status: "open" },
    { id: "two", expense_type: "Tax", amount: 50, expense_date: "2026-11-09", transaction_status: "closed" },
  ] } } });
  expect(await expensesService.list()).toEqual([
    { id: "one", counterId: "counter", type: "Rent", description: "", amount: 1200.5, date: "2026-11-10", counterStatus: "open" },
    { id: "two", counterId: undefined, type: "Tax", description: "", amount: 50, date: "2026-11-09", counterStatus: "closed" },
  ]);
});

it("uses the existing open counter and never opens one automatically", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: { items: [{ id: "counter", status: "open" }] } } });
  expect(await expensesService.openCounterId()).toBe("counter");
  expect(api.get).toHaveBeenCalledWith("/cash-management", { params: { status: "open", page: 1, limit: 1 } });
  jest.mocked(api.get).mockResolvedValue({ data: { data: { items: [] } } });
  expect(await expensesService.openCounterId()).toBeNull();
  expect(api.post).not.toHaveBeenCalled();
});

it("sends the web API's expense payload for create, edit and delete", async () => {
  const input = { expense_type: "Supplies", amount: 250.5, description: "Towels", expense_date: "2026-11-10" };
  await expensesService.create("counter", input);
  expect(api.post).toHaveBeenCalledWith("/cash-management/expenses", { ...input, cash_management_id: "counter" });
  await expensesService.update("expense", input);
  expect(api.put).toHaveBeenCalledWith("/cash-management/expenses/expense", input);
  await expensesService.remove("expense");
  expect(api.delete).toHaveBeenCalledWith("/cash-management/expenses/expense");
});

it("combines search, category and inclusive date filters", () => {
  const rows = [
    { id: "one", type: "Supplies", description: "Towels", date: "2026-11-01" },
    { id: "two", type: "Supplies", description: "Towels", date: "2026-10-31" },
    { id: "three", type: "Cleaning", description: "Towels", date: "2026-11-10" },
  ] as Expense[];
  expect(filterExpenses(rows, " towels ", "Supplies", "2026-11-01", "2026-11-30").map(row => row.id)).toEqual(["one"]);
  expect(filterExpenses(rows, "", null, null, null)).toHaveLength(3);
});

it.each(["", "0", "-10", "1e3", "NaN", "1.001"])("rejects invalid expense amount %s", value => {
  expect(expenseAmount(value)).toBeNull();
});

it("accepts a positive amount with cents", () => expect(expenseAmount("250.50")).toBe(250.5));

it("uses cash-management access for the expense route", () => {
  const staff: AuthUser = { id: "staff", email: "staff@example.com", role: "staff", effective_permissions: { view_dashboard: true, view_sales: true } };
  expect(isStaffAllowedRoute("expenses", staff)).toBe(false);
  expect(isStaffAllowedRoute("expenses", { ...staff, effective_permissions: { view_dashboard: true, view_cash_management: true } })).toBe(true);
});
