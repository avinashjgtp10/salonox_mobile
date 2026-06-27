const STAFF_BASE = "/api/v1/staff";

export const BLOCKED_TIME = {
  // Staff-scoped routes — all create/update/delete go through staff
  FOR_STAFF: (staffId: string | number) => `${STAFF_BASE}/${staffId}/blocked-times`,
  FOR_STAFF_BY_ID: (staffId: string | number, id: string | number) =>
    `${STAFF_BASE}/${staffId}/blocked-times/${id}`,
};
