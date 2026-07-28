import type { BlockedTimeEntry } from "@/types/staffBlockedTimes";

export type StaffAvailabilitySlot = {
  display: string;
  endTime: string | null;
  value: string;
};

export type StaffAvailability = {
  availableSlots: StaffAvailabilitySlot[];
  availabilityLabel: string | null;
  blockedTimes: BlockedTimeEntry[];
  checkedInLabel: string | null;
  checkedOutLabel: string | null;
  currentStatusLabel: string | null;
  existingAppointments: unknown[];
  holidayLabel: string | null;
  isAvailable: boolean;
  isHoliday: boolean;
  isOnLeave: boolean;
  leaveStatus: string | null;
  onLeaveLabel: string | null;
  raw: unknown;
  shiftEndLabel: string | null;
  shiftEndTime: string | null;
  shiftStartLabel: string | null;
  shiftStartTime: string | null;
  staffId: string;
  workingHoursLabel: string | null;
};

export type StaffAvailabilityRequest = {
  date: string;
  staffId: string;
};
