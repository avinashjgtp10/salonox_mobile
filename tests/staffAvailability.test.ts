import { staffAvailabilityService } from "@/services/staffAvailability.service";
import { staffScheduleService } from "@/services/staffSchedule.service";
import { staffBlockedTimesService } from "@/services/staffBlockedTimes.service";

jest.mock("@/services/api", () => ({ ApiError: class extends Error {} }));
jest.mock("@/services/staffSchedule.service", () => ({ staffScheduleService: { getSchedule: jest.fn() } }));
jest.mock("@/services/staffBlockedTimes.service", () => ({ staffBlockedTimesService: { getBlockedTimes: jest.fn() } }));

beforeEach(() => {
  jest.mocked(staffBlockedTimesService.getBlockedTimes).mockResolvedValue([]);
});

test.each([
  ["09:00 AM", "07:00 PM", "09:00", "18:30", 20],
  ["12:00 AM", "12:00 PM", "00:00", "11:30", 24],
  ["09:00:00", "19:00:00", "09:00", "18:30", 20],
])("builds selectable times for a shift from %s to %s", async (startTime, endTime, first, last, count) => {
  jest.mocked(staffScheduleService.getSchedule).mockResolvedValue({
    staffId: "staff-1", updatedAt: null,
    days: [{ day: "tuesday", startTime, endTime, isOff: false }],
  });
  const result = await staffAvailabilityService.getAvailability("staff-1", "2026-10-06");
  expect(result.availableSlots).toHaveLength(count);
  expect(result.availableSlots[0].value).toBe(first);
  expect(result.availableSlots[result.availableSlots.length - 1].value).toBe(last);
  expect(result.isAvailable).toBe(true);
});

test("keeps explicitly off days unavailable", async () => {
  jest.mocked(staffScheduleService.getSchedule).mockResolvedValue({
    staffId: "staff-1", updatedAt: null,
    days: [{ day: "tuesday", startTime: "09:00 AM", endTime: "07:00 PM", isOff: true }],
  });
  const result = await staffAvailabilityService.getAvailability("staff-1", "2026-10-06");
  expect(result.availableSlots).toEqual([]);
  expect(result.isHoliday).toBe(true);
});
