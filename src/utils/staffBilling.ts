import type { StaffMember } from "@/data/teamData";
import type { AppointmentListItem } from "@/types/appointment";
import type { SaleDetail } from "@/types/sales";

type StaffIdentity = Pick<StaffMember, "id" | "userId" | "staffIdAliases">;
const money = (value: number) => Math.round(Math.max(0, Number.isFinite(value) ? value : 0) * 100) / 100;

export function isOwnBillingItem(staff: StaffIdentity | null | undefined, staffId: string | null | undefined) {
  return Boolean(staff && staffId && [staff.id, staff.userId, ...(staff.staffIdAliases ?? [])].includes(staffId));
}

export function getStaffAppointmentBilling(appointment: AppointmentListItem, staff: StaffIdentity | null | undefined) {
  const items = appointment.billedItems.filter((item) =>
    isOwnBillingItem(staff, item.staffId ?? (item.type === "service" ? appointment.staffId : null)),
  );
  const itemTotal = items.reduce((sum, item) => sum + (item.totalAmount ?? item.price), 0);
  // When every row belongs to this staff member, honor a discounted/free
  // appointment total without allowing an aggregate total to increase it.
  const explicitTotal = appointment.raw.total;
  const total = money(items.length > 0 && items.length === appointment.billedItems.length &&
    explicitTotal != null && explicitTotal !== "" && Number.isFinite(Number(explicitTotal))
    ? Math.min(Number(explicitTotal), itemTotal) : itemTotal);
  // paidAmount may belong to a linked invoice containing OTHER appointments.
  // Never compare that value with this staff member's smaller service total.
  const paid = appointment.paymentStatus.toLowerCase() === "paid";
  return {
    items,
    total,
    paid,
    amountPaid: paid ? total : appointment.paidAmount === 0 ? 0 : null,
  };
}

export function getStaffSaleBilling(sale: SaleDetail, staff: StaffIdentity | null | undefined) {
  const items = sale.lineItems.filter((item) => isOwnBillingItem(staff, item.staffId));
  const total = money(items.reduce((sum, item) => sum + item.totalPrice, 0));
  const paid = sale.status === "completed" && sale.amountPaid >= sale.total && sale.outstandingAmount <= 0;
  // Payments are recorded at invoice level, with no per-staff allocation.
  const amountPaid = paid ? total : sale.amountPaid === 0 ? 0 : null;
  return { items, total, paid, amountPaid, outstandingAmount: amountPaid === null ? null : money(total - amountPaid) };
}
