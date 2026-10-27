import { breakAt, isCheckedOut, localTodayKey, NO_STAFF_PRESENCE, type StaffPresence } from "@/features/attendance/utils/staffPresence";
import { quickSaleStaffOptions } from "@/features/quickSale/utils/quickSaleStaff";
import type { PosStaffMember } from "@/types/sales";

const member = (id: string, extra: Partial<PosStaffMember> = {}): PosStaffMember => ({
  avatarBg: "", avatarColor: "", id, initials: "", name: id, role: null, status: "Available", ...extra,
});
const ids = (staff: PosStaffMember[]) => staff.map((item) => item.id);
const presence = (byStaffId: StaffPresence["byStaffId"], enabled = true): StaffPresence => ({ breaks: {}, byStaffId, enabled });

// Same rules as the web's Quick Sale (useStaffSchedule + pickableStaff).
describe("Quick Sale staff options", () => {
  it("drops staff who don't allow calendar bookings", () => {
    const staff = [member("a"), member("b", { allowCalendarBookings: false }), member("c", { allowCalendarBookings: true })];
    expect(ids(quickSaleStaffOptions(staff, NO_STAFF_PRESENCE, []))).toEqual(["a", "c"]);
  });

  it("follows Reorder Staff, keeping never-sequenced staff at the end in API order", () => {
    const staff = [member("x"), member("b", { schedulerOrder: 2 }), member("y"), member("a", { schedulerOrder: 1 })];
    expect(ids(quickSaleStaffOptions(staff, NO_STAFF_PRESENCE, []))).toEqual(["a", "b", "x", "y"]);
  });

  it("hides staff not checked in today only when the salon uses check-in visibility", () => {
    const staff = [member("in"), member("out"), member("none"), member("break")];
    const states = { break: "on_break", in: "checked_in", out: "checked_out" } as const;
    expect(ids(quickSaleStaffOptions(staff, presence(states), [], localTodayKey()))).toEqual(["in", "out", "break"]);
    expect(ids(quickSaleStaffOptions(staff, presence(states, false), [], localTodayKey()))).toEqual(["in", "out", "none", "break"]);
  });

  it("does not filter an appointment on another date", () => {
    const staff = [member("in"), member("none")];
    expect(ids(quickSaleStaffOptions(staff, presence({ in: "checked_in" }), [], "2001-01-01"))).toEqual(["in", "none"]);
  });

  it("keeps staff already on the bill through the check-in filter only", () => {
    const staff = [member("none"), member("off", { allowCalendarBookings: false })];
    expect(ids(quickSaleStaffOptions(staff, presence({}), ["none", "off"], localTodayKey()))).toEqual(["none"]);
  });
});

describe("staff presence prompts", () => {
  it("flags checked-out staff only with check-in visibility on", () => {
    expect(isCheckedOut(presence({ a: "checked_out" }), "a")).toBe(true);
    expect(isCheckedOut(presence({ a: "checked_out" }, false), "a")).toBe(false);
  });

  it("flags breaks for today only, whatever the visibility setting", () => {
    const onBreak: StaffPresence = { ...NO_STAFF_PRESENCE, breaks: { a: { since: "2026-01-01T08:00:00Z", until: "2026-01-01T08:30:00Z" } } };
    expect(breakAt(onBreak, "a", localTodayKey())).not.toBeNull();
    expect(breakAt(onBreak, "a", "2001-01-01")).toBeNull();
    expect(breakAt(onBreak, "b", localTodayKey())).toBeNull();
  });
});
