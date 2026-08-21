export const STAFF = {
  // ── Core CRUD ──────────────────────────────────────────────────────────────
  BASE: "/api/v1/staff",
  BY_ID: (id: string | number) => `/api/v1/staff/${id}`,

  // ── Export ─────────────────────────────────────────────────────────────────
  EXPORT: (format: "excel" | "csv") => `/api/v1/staff/export/${format}`,

  // ── Import ─────────────────────────────────────────────────────────────────
  IMPORT: "/api/v1/staff/import",

  // ── Avatar ─────────────────────────────────────────────────────────────────
  UPLOAD_AVATAR: "/api/v1/staff/upload-avatar",

  // ── Invitation ─────────────────────────────────────────────────────────────
  VERIFY_TOKEN: (token: string) => `/api/v1/staff/invite/${token}/verify`,
  ACCEPT_INVITATION: "/api/v1/staff/invite/accept",
  INVITATION_STATUS: (id: string | number) => `/api/v1/staff/${id}/invitation-status`,
  RESEND_INVITE: (id: string | number) => `/api/v1/staff/${id}/resend-invite`,
  CANCEL_INVITE: (id: string | number) => `/api/v1/staff/${id}/cancel-invite`,

  // ── Addresses ──────────────────────────────────────────────────────────────
  ADDRESSES: (staffId: string | number) => `/api/v1/staff/${staffId}/addresses`,
  ADDRESS_BY_ID: (staffId: string | number, id: string | number) =>
    `/api/v1/staff/${staffId}/addresses/${id}`,

  // ── Emergency Contacts ─────────────────────────────────────────────────────
  EMERGENCY_CONTACTS: (staffId: string | number) =>
    `/api/v1/staff/${staffId}/emergency-contacts`,
  EMERGENCY_CONTACT_BY_ID: (staffId: string | number, id: string | number) =>
    `/api/v1/staff/${staffId}/emergency-contacts/${id}`,

  // ── Wages ──────────────────────────────────────────────────────────────────
  WAGES: (staffId: string | number) => `/api/v1/staff/${staffId}/wages`,

  // ── Commissions ────────────────────────────────────────────────────────────
  COMMISSIONS:             (staffId: string | number) => `/api/v1/staff/${staffId}/commissions`,
  COMMISSIONS_BULK:        "/api/v1/staff/commissions/bulk-configure",
  SETTLE_COMMISSION:       (staffId: string | number) => `/api/v1/staff/commissions/${staffId}/mark-paid`,

  // ── Tips (Tip Settle) ──────────────────────────────────────────────────────
  TIP_SUMMARY:             "/api/v1/staff/tips/summary",
  TIP_EARNED:              "/api/v1/staff/tips/earned",
  SETTLE_TIP:              (staffId: string | number) => `/api/v1/staff/tips/${staffId}/settle`,
  TIP_SETTLEMENTS:         (staffId: string | number) => `/api/v1/staff/tips/${staffId}/settlements`,

  // ── Pay Runs ───────────────────────────────────────────────────────────────
  PAY_RUNS: (staffId: string | number) => `/api/v1/staff/${staffId}/pay-runs`,
  PAY_RUN_BY_ID: (staffId: string | number, id: string | number) => `/api/v1/staff/${staffId}/pay-runs/${id}`,

  // ── Schedules ──────────────────────────────────────────────────────────────
  SCHEDULES: (staffId: string | number) => `/api/v1/staff/${staffId}/scheduled`,

  // ── Leaves ─────────────────────────────────────────────────────────────────
  LEAVES: (staffId: string | number) => `/api/v1/staff/${staffId}/leaves`,
  LEAVE_BY_ID: (staffId: string | number, id: string | number) =>
    `/api/v1/staff/${staffId}/leaves/${id}`,

  // ── Legacy (kept for compatibility) ────────────────────────────────────────
  SEARCH: (query: string) => `/api/v1/staff?search=${encodeURIComponent(query)}`,
  ACTIVATE: (id: string | number) => `/api/v1/staff/${id}/activate`,
  DEACTIVATE: (id: string | number) => `/api/v1/staff/${id}/deactivate`,
  SERVICES: (id: string | number) => `/api/v1/staff/${id}/services`,
  SCHEDULE: (id: string | number) => `/api/v1/staff/${id}/schedule`,
  STATS: (id: string | number) => `/api/v1/staff/${id}/stats`,
} as const;
