import { appointmentService, normalizeAppointment } from "@/services/appointment.service";
import { api } from "@/services/api";
import { buildStaffAppointmentActivity } from "@/utils/staffAppointmentActivity";
import type { StaffMember } from "@/data/teamData";
import type { AppointmentListQuery } from "@/types/appointment";

jest.mock("@/services/api", () => ({
  api: { get: jest.fn() },
  ApiError: Error,
}));
const staff = { id: "staff-self", userId: "user-self", name: "Shubham", staffIdAliases: [] } as unknown as StaffMember;
const query: AppointmentListQuery = { limit: 1, page: 1, search: "", sort_by: "scheduled_at", sort_order: "ASC" };
const other = (id: string) => ({ id, staff_id: "staff-other", staff_name: "Shubham", status: "booked", scheduled_at: "2026-10-02T10:00:00+05:30" });
const serviceAssigned = { ...other("own-secondary"), services: [{ staff_id: staff.id }], updated_at: "2026-10-01T10:00:00+05:30" };
const ownPrimary = { ...other("own-primary"), staff_id: staff.id, scheduled_at: "2026-10-02T11:00:00+05:30" };
const response = (data: unknown[]) => ({ data: { data: { data, totalRecords: 202, totalPages: 2, currentPage: 1 } } });

beforeEach(() => jest.resetAllMocks());

test("mobile scans existing API pages, includes secondary assignments, and paginates only own appointments", async () => {
  jest.mocked(api.get).mockResolvedValueOnce(response(Array.from({ length: 200 }, (_, index) => other("other-" + index))))
    .mockResolvedValueOnce(response([serviceAssigned, ownPrimary]));
  const result = await appointmentService.getStaffAppointments(query, staff, "salon");
  expect(result.appointments.map(item => item.id)).toEqual(["own-secondary"]);
  expect(result.totalCount).toBe(2);
  expect(result.pagination).toMatchObject({ page: 1, totalPages: 2, hasMore: true });
  expect(result.appointments[0].staffName).toBe(staff.name);
  expect(api.get).toHaveBeenNthCalledWith(1, expect.any(String), { params: expect.objectContaining({ page: 1, staff_id: undefined }) });
  expect(api.get).toHaveBeenNthCalledWith(2, expect.any(String), { params: expect.objectContaining({ page: 2, staff_id: undefined }) });
});

test("changing staff_id in the caller cannot expose other staff appointments", async () => {
  jest.mocked(api.get).mockResolvedValue(response([other("other"), ownPrimary]));
  const result = await appointmentService.getStaffAppointments({ ...query, limit: 10, staff_id: "staff-other" }, staff);
  expect(result.appointments.map(item => item.id)).toEqual(["own-primary"]);
  expect(result.totalCount).toBe(1);
});

test("personal activity needs no backend recipient metadata and read state belongs to this app", () => {
  const appointments = [normalizeAppointment(other("other")), normalizeAppointment(serviceAssigned)];
  const activity = buildStaffAppointmentActivity(appointments, staff, staff.userId!, []);
  expect(activity.map(item => item.referenceId)).toEqual(["own-secondary"]);
  expect(activity[0].isRead).toBe(false);
  expect(buildStaffAppointmentActivity(appointments, staff, staff.userId!, [activity[0].id])[0].isRead).toBe(true);
  expect(buildStaffAppointmentActivity(appointments, { ...staff, id: "no-match", userId: "no-match" }, "other-user", []).length).toBe(0);
});

test("a repeated API page fails instead of silently returning incomplete own totals", async () => {
  const page = response(Array.from({ length: 200 }, (_, index) => other("other-" + index)));
  jest.mocked(api.get).mockResolvedValue(page);
  await expect(appointmentService.getStaffAppointments(query, staff)).rejects.toThrow("Unable to load all of your appointments");
});
