import { api } from "@/services/api";
import { appointmentService } from "@/services/appointment.service";
import { salesService } from "@/services/sales.service";

jest.mock("@/services/api", () => ({ api: { get: jest.fn() } }));
jest.mock("@/services/appointment.service", () => ({ appointmentService: { getAppointment: jest.fn() } }));

const get = jest.mocked(api.get);
const booking = jest.mocked(appointmentService.getAppointment);
const sale = { id: "sale-1", appointment_id: "appointment-1", total_amount: "6565.00", invoice_date: "2026-11-10T10:35:00Z", payment_method: "split", status: "completed", items: [] };

beforeEach(() => jest.resetAllMocks());

it.each([[6565, 0], [2000, 4565], [0, 6565]])("uses recorded collection %s and balance %s when sale totals are absent", async (paidAmount, dueAmount) => {
  get.mockResolvedValue({ data: { data: { sale } } });
  booking.mockResolvedValue({ appointment: { paidAmount, dueAmount } } as Awaited<ReturnType<typeof appointmentService.getAppointment>>);
  const result = await salesService.getSale("sale-1");
  expect(result.amountPaid).toBe(paidAmount);
  expect(result.outstandingAmount).toBe(dueAmount);
  expect(booking).toHaveBeenCalledWith("appointment-1");
});

it("preserves explicit zero collection and server balance", async () => {
  get.mockResolvedValue({ data: { data: { sale: { ...sale, amount_paid: "0.00", due_amount: "6565.00" } } } });
  const result = await salesService.getSale("sale-1");
  expect(result.amountPaid).toBe(0);
  expect(result.outstandingAmount).toBe(6565);
  expect(booking).not.toHaveBeenCalled();
});

it("accepts paid_amount from the API without treating the sale as unpaid", async () => {
  get.mockResolvedValue({ data: { data: { sale: { ...sale, paid_amount: "6565.00", due_amount: "0.00" } } } });
  const result = await salesService.getSale("sale-1");
  expect(result.amountPaid).toBe(6565);
  expect(result.outstandingAmount).toBe(0);
  expect(booking).not.toHaveBeenCalled();
});
