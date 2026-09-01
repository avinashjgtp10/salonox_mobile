import type { StaffMember } from "@/data/teamData";
import type { AppointmentListItem } from "@/types/appointment";

export const toComparableId = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") {
    const id = String(value).trim();
    return id.length > 0 ? id : null;
  }

  return null;
};

export const collectPayloadStaffIds = (payload: unknown): string[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const nestedRecords = [record.data, record.record, record.staff, record.employee].filter(
    (value): value is Record<string, unknown> => Boolean(value) && typeof value === "object",
  );
  const candidates = [
    record.staffId,
    record.staff_id,
    record.employeeId,
    record.employee_id,
    record.staffRefId,
    record.staff_ref_id,
    record.userId,
    record.user_id,
    ...nestedRecords.flatMap((nested) => [
      nested.id,
      nested._id,
      nested.staffId,
      nested.staff_id,
      nested.employeeId,
      nested.employee_id,
      nested.userId,
      nested.user_id,
    ]),
  ];

  return candidates.map(toComparableId).filter((id): id is string => Boolean(id));
};

export const realtimePayloadMatchesStaff = (payload: unknown, staffId: string) => {
  const payloadStaffIds = collectPayloadStaffIds(payload);
  return payloadStaffIds.length === 0 || payloadStaffIds.includes(staffId);
};

export const staffIdMatches = (staffMember: StaffMember, staffId?: string | null) =>
  Boolean(staffId && (staffMember.id === staffId || staffMember.staffIdAliases?.includes(staffId)));

export const isAssignedToStaff = (appointment: AppointmentListItem, staff: StaffMember) => {
  const staffIds = [staff.id, staff.userId, staff.employeeCode, ...(staff.staffIdAliases ?? [])]
    .map(toComparableId)
    .filter(Boolean);
  const appointmentStaffIds = [
    appointment.staffId,
    appointment.raw.staff_id,
    appointment.raw.staff?.id,
    ...((appointment.raw.services ?? []).map((service) => service.staff_id)),
  ]
    .map(toComparableId)
    .filter(Boolean);

  return appointmentStaffIds.some((staffId) => staffIds.includes(staffId));
};
