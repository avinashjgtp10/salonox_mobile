import { describe, expect, it } from "@jest/globals";
import { CHECKOUT_REMINDER_DELAY_MS, getCheckoutReminder } from "@/features/attendance/utils/checkoutReminder";
import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";

const SHIFT_START = "2026-11-16T09:00:00+05:30";
const SHIFT_END = "2026-11-16T17:00:00+05:30";
const shiftEndMs = new Date(SHIFT_END).getTime();

/** A staff member who checked in and has not checked out yet. */
const buildState = (serverTime: string, overrides: Partial<StaffSelfAttendance> = {}): StaffSelfAttendance => ({
  staff_id: "staff-1",
  date: "2026-11-16",
  server_time: serverTime,
  shift_start: SHIFT_START,
  shift_end: SHIFT_END,
  reminder_at: null,
  can_check_in: false,
  blocked_reason: null,
  checked_in: true,
  current_status: "CHECKED_IN",
  record: { check_in: "2026-11-16T09:02:00+05:30", check_out: null, status: "CHECKED_IN" },
  ...overrides,
});

describe("staff checkout reminder", () => {
  it("falls due 10 minutes after the shift ends", () => {
    expect(CHECKOUT_REMINDER_DELAY_MS).toBe(10 * 60 * 1000);

    const reminder = getCheckoutReminder(buildState(SHIFT_END));
    expect(reminder?.dueAt).toBe(shiftEndMs + 10 * 60 * 1000);
  });

  it("is not due until the 10 minutes have passed", () => {
    const nineMinutesAfter = new Date(shiftEndMs + 9 * 60 * 1000).toISOString();
    expect(getCheckoutReminder(buildState(nineMinutesAfter))?.due).toBe(false);
  });

  it("is due once 10 minutes have passed", () => {
    const tenMinutesAfter = new Date(shiftEndMs + 10 * 60 * 1000).toISOString();
    expect(getCheckoutReminder(buildState(tenMinutesAfter))?.due).toBe(true);
  });

  it("stops once the checkout is recorded", () => {
    const late = new Date(shiftEndMs + 30 * 60 * 1000).toISOString();
    const checkedOut = buildState(late, {
      current_status: "CHECKED_OUT",
      record: { check_in: "2026-11-16T09:02:00+05:30", check_out: "2026-11-16T17:05:00+05:30", status: "CHECKED_OUT" },
    });

    expect(getCheckoutReminder(checkedOut)).toBeNull();
  });

  it("keys the reminder to the shift, so a new shift reminds again", () => {
    const first = getCheckoutReminder(buildState(SHIFT_END));
    const nextDay = getCheckoutReminder(buildState("2026-11-17T17:00:00+05:30", {
      date: "2026-11-17",
      shift_start: "2026-11-17T09:00:00+05:30",
      shift_end: "2026-11-17T17:00:00+05:30",
    }));

    expect(first?.key).not.toBe(nextDay?.key);
  });

  it("ignores a shift with no recorded check-in", () => {
    expect(getCheckoutReminder(buildState(SHIFT_END, { checked_in: false, record: null }))).toBeNull();
  });
});
