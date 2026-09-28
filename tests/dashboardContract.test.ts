import { api } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";

jest.mock("@/services/api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));

test("dashboard posts filters and normalizes enriched appointment rows", async () => {
  jest.mocked(api.post).mockResolvedValueOnce({ data: { success: true, data: {
    summary: { totalRevenue: 1150, todayRevenue: 900, todayAppointmentsCount: 1 },
    todayAppointments: [{
      id: "appointment-1", client_name: "Test Client", staff_name: "Test Staff", staff_id: "staff-1",
      scheduled_at: "2026-09-27T09:00:00Z", status: "paid", computed_grand_total: "900",
      services: [{ name: "Haircut" }, { name: "Wash" }],
    }],
  } } });
  const result = await dashboardService.getOwnerDashboard(new Date(2026, 8, 27), "salon-1");
  expect(api.post).toHaveBeenCalledWith("/dashboard", {
    period: "monthly", date: "2026-09-27", salon_id: "salon-1",
  });
  expect(api.get).not.toHaveBeenCalled();
  expect(result.todayAppointments[0]).toMatchObject({
    id: "appointment-1", clientName: "Test Client", staffName: "Test Staff", staffId: "staff-1",
    service: "Haircut, Wash", amount: 900, status: "completed",
  });
  expect(result.metrics.monthlyRevenue).toBe(1150);
});

test("zero computed appointment totals are not replaced by catalog amounts", async () => {
  jest.mocked(api.post).mockResolvedValueOnce({ data: { success: true, data: {
    todayAppointments: [{ id: "covered", computed_grand_total: 0, amount: 1000, status: "booked" }],
  } } });
  const result = await dashboardService.getOwnerDashboard();
  expect(result.todayAppointments[0].amount).toBe(0);
  expect(result.inventoryAlerts).toEqual([]);
});
