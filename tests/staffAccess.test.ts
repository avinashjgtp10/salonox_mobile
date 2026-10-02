import { canReceivePush, canReceiveStaffNotification, isStaffBusinessWrite } from "@/utils/staffAccess";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import { normalizeAppointment } from "@/services/appointment.service";
import type { AuthUser } from "@/types/auth";
import type { StaffMember } from "@/data/teamData";
import { isStaffAllowedRoute } from "@/utils/routeResolver";

jest.mock("@/services/api", () => ({ api: {} }));
const shubham = { id: "shubham-user", role: "staff" } as AuthUser;
const owner = { id: "owner-user", role: "salon_owner" } as AuthUser;

test("staff uses personal in-app activity and does not display salon-wide remote pushes", () => {
  const data = { type: "appointment", recipient_user_ids: ["shubham-user"] };
  expect(canReceivePush(shubham, data)).toBe(false);
  expect(canReceivePush({ ...shubham, id: "other-user" }, data)).toBe(false);
  expect(canReceivePush(owner, data)).toBe(true);
  expect(canReceivePush(shubham, { type: "appointment" })).toBe(false);
  expect(canReceivePush(shubham, { type: "payment", recipient_user_ids: [shubham.id] })).toBe(false);
  expect(canReceiveStaffNotification(shubham, { type: "appointment", recipientUserIds: [shubham.id] })).toBe(true);
});

test("staff deep links allow only personal screens and account security", () => {
  for (const route of ["(staff)", "change-password", "privacy-policy", "notification-settings"]) expect(isStaffAllowedRoute(route)).toBe(true);
  for (const route of ["(tabs)", "inbox", "more", "quick-sale", "sales", "team", "clients", "today-revenue", "monthly-revenue", "salon-settings", "explore"]) expect(isStaffAllowedRoute(route)).toBe(false);
});

test("staff business writes are blocked even when they have custom permissions", () => {
  const user = { ...shubham, custom_permissions: ["create_sales", "edit_appointment"] };
  for (const url of ["/appointments/one", "/appointments/one/checkout", "/sales", "/staff/one", "/attendance/check-in", "/settings", "/bookings"]) {
    expect(isStaffBusinessWrite(user, "post", url)).toBe(true);
    expect(isStaffBusinessWrite(owner, "post", url)).toBe(false);
    expect(isStaffBusinessWrite(user, "get", url)).toBe(false);
  }
  expect(isStaffBusinessWrite(user, "patch", "/notifications/one/read")).toBe(false);
  expect(isStaffBusinessWrite(user, "post", "/auth/logout")).toBe(false);
});

test("staff assignment is checked by identity, including services, never by a shared name", () => {
  const staff = { id: "shubham-staff", userId: shubham.id, name: "Shubham", staffIdAliases: ["alias"] } as StaffMember;
  expect(isAssignedToStaff(normalizeAppointment({ staff_id: "other", staff_name: "Shubham" }), staff)).toBe(false);
  expect(isAssignedToStaff(normalizeAppointment({ services: [{ staff_id: "alias" }] }), staff)).toBe(true);
});
