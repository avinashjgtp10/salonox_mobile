import type { StaffMember } from "@/data/teamData";
import type { AppointmentListItem } from "@/types/appointment";

export type CalendarStaffOption = {
  id: string;
  /** Raw staff name — display label and legacy name-matching key. */
  name: string;
  /** `name`, suffixed only when another staff member shares that same name. */
  label: string;
};

export const SYNTHETIC_STAFF_ID_PREFIX = "name:";

export const isMeaningfulStaffDetail = (value?: string | null) => {
  const trimmed = (value ?? "").trim();

  return trimmed.length > 0 && trimmed !== "-";
};

export const getStaffDisambiguator = (staffMember: StaffMember | undefined) => {
  const phoneDigits = staffMember?.phone?.replace(/\D/g, "") ?? "";
  const candidates = [
    staffMember?.designation,
    staffMember?.employeeCode,
    staffMember?.email?.split("@")[0],
    phoneDigits.length >= 4 ? phoneDigits.slice(-4) : null,
    staffMember?.role,
  ];

  return candidates.find(isMeaningfulStaffDetail)?.trim();
};

export const normalizeCalendarStaffName = (name?: string | null) =>
  (name ?? "").trim().toLocaleLowerCase();

export const buildCanonicalStaffIdByAlias = (
  staffMembers: StaffMember[],
  appointments: AppointmentListItem[],
) => {
  const canonicalIdByAlias = new Map<string, string>();
  const staffIdsByName = new Map<string, string[]>();

  staffMembers.forEach((staffMember) => {
    if (!staffMember.id) return;

    canonicalIdByAlias.set(staffMember.id, staffMember.id);
    staffMember.staffIdAliases?.forEach((alias) => {
      if (alias) canonicalIdByAlias.set(alias, staffMember.id);
    });

    const normalizedName = normalizeCalendarStaffName(staffMember.name);
    if (normalizedName) {
      staffIdsByName.set(normalizedName, [
        ...(staffIdsByName.get(normalizedName) ?? []),
        staffMember.id,
      ]);
    }
  });

  // Some appointment responses use a different staff identifier than the
  // staff-list endpoint. A unique name match safely links that identifier to
  // the existing record instead of creating a duplicate Calendar column.
  appointments.forEach((appointment) => {
    if (!appointment.staffId || canonicalIdByAlias.has(appointment.staffId)) return;

    const matchingIds = staffIdsByName.get(normalizeCalendarStaffName(appointment.staffName)) ?? [];
    const uniqueMatchingIds = [...new Set(matchingIds)];
    if (uniqueMatchingIds.length === 1) {
      canonicalIdByAlias.set(appointment.staffId, uniqueMatchingIds[0]);
    }
  });

  return canonicalIdByAlias;
};

export const buildCalendarStaffOptions = (
  staffMembers: StaffMember[],
  appointments: AppointmentListItem[],
  canonicalIdByAlias: Map<string, string>,
): CalendarStaffOption[] => {
  const byId = new Map<string, { id: string; name: string; staffMember?: StaffMember }>();

  staffMembers.forEach((staffMember) => {
    if (!staffMember.id || byId.has(staffMember.id)) return;
    byId.set(staffMember.id, { id: staffMember.id, name: staffMember.name, staffMember });
  });

  appointments.forEach((appointment) => {
    const name = appointment.staffName?.trim() ?? "";

    if (appointment.staffId) {
      const canonicalId = canonicalIdByAlias.get(appointment.staffId) ?? appointment.staffId;
      if (!byId.has(canonicalId)) {
        byId.set(canonicalId, { id: canonicalId, name });
      }
      return;
    }

    if (!name) return;

    const hasExistingName = [...byId.values()].some(
      (option) => normalizeCalendarStaffName(option.name) === normalizeCalendarStaffName(name),
    );
    if (hasExistingName) return;

    const syntheticId = `${SYNTHETIC_STAFF_ID_PREFIX}${normalizeCalendarStaffName(name)}`;

    if (!byId.has(syntheticId)) {
      byId.set(syntheticId, { id: syntheticId, name });
    }
  });

  const nameCounts = new Map<string, number>();
  byId.forEach((option) => nameCounts.set(option.name, (nameCounts.get(option.name) ?? 0) + 1));
  const disambiguatorCounts = new Map<string, number>();

  byId.forEach((option) => {
    const detail = getStaffDisambiguator(option.staffMember);

    if (detail) {
      const key = `${option.name}\u0000${detail}`;
      disambiguatorCounts.set(key, (disambiguatorCounts.get(key) ?? 0) + 1);
    }
  });
  const duplicateOrdinalById = new Map<string, number>();
  const duplicateGroups = new Map<string, string[]>();

  byId.forEach((option) => {
    if ((nameCounts.get(option.name) ?? 0) <= 1) return;
    duplicateGroups.set(option.name, [...(duplicateGroups.get(option.name) ?? []), option.id]);
  });
  duplicateGroups.forEach((ids) => {
    [...ids].sort().forEach((id, index) => duplicateOrdinalById.set(id, index + 1));
  });

  return [...byId.values()].map((option) => {
    const hasDuplicateName = (nameCounts.get(option.name) ?? 0) > 1;
    const detail = getStaffDisambiguator(option.staffMember);
    const detailIsUnique = detail
      ? disambiguatorCounts.get(`${option.name}\u0000${detail}`) === 1
      : false;
    const disambiguator = detailIsUnique
      ? detail
      : `#${duplicateOrdinalById.get(option.id) ?? 1}`;

    return {
      id: option.id,
      name: option.name,
      label: hasDuplicateName ? `${option.name} · ${disambiguator}` : option.name,
    };
  });
};

export const buildFallbackStaffIdByName = (options: CalendarStaffOption[]) => {
  const idsByName = new Map<string, string[]>();

  options.forEach((option) => {
    const normalizedName = normalizeCalendarStaffName(option.name);
    if (!normalizedName) return;
    idsByName.set(normalizedName, [...(idsByName.get(normalizedName) ?? []), option.id]);
  });

  const byName = new Map<string, string>();
  idsByName.forEach((ids, name) => {
    const uniqueIds = [...new Set(ids)].sort();
    const syntheticId = uniqueIds.find((id) => id.startsWith(SYNTHETIC_STAFF_ID_PREFIX));
    byName.set(name, syntheticId ?? uniqueIds[0]);
  });

  return byName;
};

export const resolveAppointmentStaffId = (
  appointment: AppointmentListItem,
  fallbackStaffIdByName: Map<string, string>,
  canonicalIdByAlias: Map<string, string>,
) =>
  canonicalIdByAlias.get(appointment.staffId) ||
  appointment.staffId ||
  fallbackStaffIdByName.get(normalizeCalendarStaffName(appointment.staffName)) ||
  "";
