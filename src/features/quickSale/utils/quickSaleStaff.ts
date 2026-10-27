import { pickableStaff, type StaffPresence } from "@/features/attendance/utils/staffPresence";
import type { PosStaffMember } from "@/types/sales";

/**
 * Staff offered in Quick Sale, by the web's rules (useStaffSchedule +
 * pickableStaff): only staff who allow calendar bookings, in the salon's
 * Reorder Staff sequence (never-sequenced staff keep their API order at the
 * end), and — with "show only checked-in staff" on — only staff checked in
 * today. The check-in filter keeps anyone in `keepIds` (already on this
 * bill), so an existing assignment never turns blank.
 */
export const quickSaleStaffOptions = (
  staff: PosStaffMember[],
  presence: StaffPresence,
  keepIds: (string | null | undefined)[],
  dateKey?: string | null,
): PosStaffMember[] => {
  const bookable = staff
    .filter((member) => member.allowCalendarBookings !== false)
    .map((member, index) => ({ index, member }))
    .sort((left, right) => {
      const a = left.member.schedulerOrder ?? null;
      const b = right.member.schedulerOrder ?? null;
      if (a === null && b === null) return left.index - right.index;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b || left.index - right.index;
    })
    .map(({ member }) => member);
  return pickableStaff(bookable, presence, keepIds, dateKey);
};
