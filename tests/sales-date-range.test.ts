import { api } from "@/services/api";
import { salesService } from "@/services/sales.service";
import { appointmentService } from "@/services/appointment.service";
import { invoiceDateLabel } from "@/utils/receipt";
import type { SalesListQuery } from "@/types/sales";

jest.mock("@/services/api", () => ({ api: { get: jest.fn() } }));
jest.mock("@/services/appointment.service", () => ({ appointmentService: { getAppointment: jest.fn() } }));

const query: SalesListQuery = { limit: 10, offset: 0, search: "", sort_by: "total", sort_order: "asc" };
const rows = [
  { id: "before", created_at: "2026-11-05T23:59:59", total: 5, client_name: "Alex" },
  { id: "start", created_at: "2026-11-06T00:00:00", total: 10, client_name: "Alex" },
  { id: "end", created_at: "2026-11-07T23:59:59", total: 20, client_name: "Sam" },
  { id: "after", created_at: "2026-11-08T00:00:00", total: 30, client_name: "Alex" },
  { id: "unknown", total: 40, client_name: "Alex" },
];

beforeEach(() => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: rows } });
});

it("includes both complete boundary days and excludes unknown dates", async () => {
  const result = await salesService.getSales({ ...query, startDate: "2026-11-06", endDate: "2026-11-07" }, "range-boundaries");
  expect(result.sales.map(sale => sale.id)).toEqual(["start", "end"]);
  expect(result.totalCount).toBe(2);
});

it("clears the range using the full cached list without changing API parameters", async () => {
  await salesService.getSales({ ...query, startDate: "2026-11-06", endDate: "2026-11-07" }, "range-clear");
  const result = await salesService.getSales({ ...query, startDate: null, endDate: null }, "range-clear", { reuseList: true });
  expect(result.sales).toHaveLength(5);
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(jest.mocked(api.get).mock.calls[0][1]).toEqual({ params: { status: undefined, salon_id: "range-clear" } });
});

it("combines dates with client search and amount sorting", async () => {
  const result = await salesService.getSales({ ...query, search: "alex", sort_order: "desc", startDate: "2026-11-06", endDate: "2026-11-08" }, "range-search");
  expect(result.sales.map(sale => sale.id)).toEqual(["after", "start"]);
});

it("uses the saved booking date when the invoice is reopened", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: { id: "sale-1", appointment_id: "booking-1", created_at: "2026-11-07T12:00:00" } } });
  jest.mocked(appointmentService.getAppointment).mockResolvedValue({ appointment: { scheduledAt: "2026-11-05T10:00:00" } } as Awaited<ReturnType<typeof appointmentService.getAppointment>>);
  const sale = await salesService.getSale("sale-1");
  expect(appointmentService.getAppointment).toHaveBeenCalledWith("booking-1");
  expect(invoiceDateLabel(sale)).toBe("05-11-26");
});

it("keeps an explicit invoice date and falls back to the recorded date when booking lookup fails", async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { data: { id: "sale-2", appointment_id: "booking-2", invoice_date: "2026-11-04", created_at: "2026-11-07T12:00:00" } } });
  expect(invoiceDateLabel(await salesService.getSale("sale-2"))).toBe("04-11-26");
  expect(appointmentService.getAppointment).not.toHaveBeenCalled();
  jest.mocked(api.get).mockResolvedValue({ data: { data: { id: "sale-2", appointment_id: "booking-2", created_at: "2026-11-07T12:00:00" } } });
  jest.mocked(appointmentService.getAppointment).mockRejectedValue(new Error("Unavailable"));
  expect(invoiceDateLabel(await salesService.getSale("sale-2"))).toBe("07-11-26");
});
