const STAFF_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STAFF_ID_PLACEHOLDERS = new Set([
  "",
  "staff",
  "staff-member",
  "team",
  "employee",
  "member",
]);

export const isValidStaffId = (staffId?: string | null) => {
  const normalizedStaffId = staffId?.trim();

  if (!normalizedStaffId || STAFF_ID_PLACEHOLDERS.has(normalizedStaffId.toLowerCase())) {
    return false;
  }

  return STAFF_UUID_PATTERN.test(normalizedStaffId);
};

export const normalizeStaffId = (staffId?: string | number | null) => {
  if (typeof staffId === "number" && Number.isFinite(staffId)) {
    return String(staffId);
  }

  if (typeof staffId !== "string") {
    return "";
  }

  return staffId.trim();
};
