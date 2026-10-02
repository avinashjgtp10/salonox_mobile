import { normalizeAppointment } from "@/services/appointment.service";
import { buildCalendarStaffOptions, buildCanonicalStaffIdByAlias, buildFallbackStaffIdByName, resolveAppointmentStaffId } from "@/features/appointments/utils/calendarStaff";
import type { StaffMember } from "@/data/teamData";

jest.mock("@/services/api", () => ({ api: {} }));

test("service-level staff assignments are preserved when loading appointments", () => {
  expect(normalizeAppointment({ services: [{ staff_id: "staff-1", staff_name: "Asha" }] })).toMatchObject({ staffId: "staff-1", staffName: "Asha" });
  expect(normalizeAppointment({ service: { staff_id: "staff-2", staff_name: "Priya" } })).toMatchObject({ staffId: "staff-2", staffName: "Priya" });
});

test("placeholder staff names do not create numbered staff and appointments stay in their groups", () => {
  const staff = [{ id: "staff-1", name: "Asha", staffIdAliases: ["alias-1"] }] as StaffMember[];
  const appointments = [
    normalizeAppointment({ id: "1", staff_id: "alias-1" }),
    normalizeAppointment({ id: "2", staff_id: "missing-1" }),
    normalizeAppointment({ id: "3", staff_id: "missing-2" }),
    normalizeAppointment({ id: "4" }),
    normalizeAppointment({ id: "5" }),
  ];
  const aliases = buildCanonicalStaffIdByAlias(staff, appointments);
  const options = buildCalendarStaffOptions(staff, appointments, aliases);
  expect(options.map(option => option.label)).toEqual(["Asha", "Staff unavailable", "Unassigned"]);
  const fallback = buildFallbackStaffIdByName(options);
  const ids = appointments.map(appointment => resolveAppointmentStaffId(appointment, fallback, aliases));
  expect(ids[0]).toBe("staff-1");
  expect(ids[1]).toBe(ids[2]);
  expect(ids[3]).toBe(ids[4]);
  expect(ids[1]).not.toBe(ids[3]);
  ids.forEach(id => expect(options.some(option => option.id === id)).toBe(true));
});

test("real staff sharing a name keep separate calendar columns", () => {
  const staff = [{ id: "staff-1", name: "Asha" }, { id: "staff-2", name: "Asha" }] as StaffMember[];
  const options = buildCalendarStaffOptions(staff, [], buildCanonicalStaffIdByAlias(staff, []));
  expect(options).toHaveLength(2);
  expect(options[0].label).not.toBe(options[1].label);
});
