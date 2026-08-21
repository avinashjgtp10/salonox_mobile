export const STAFF = {
  ADDRESS: (staffId: string, recordId: string) => `/staff/${staffId}/addresses/${recordId}`,
  ADDRESSES: (staffId: string) => `/staff/${staffId}/addresses`,
  ACTIVATE: (staffId: string) => `/staff/${staffId}/activate`,
  CREATE: "/staff",
  DEACTIVATE: (staffId: string) => `/staff/${staffId}/deactivate`,
  DELETE: "/staff",
  UPLOAD_AVATAR: "/staff/upload-avatar",
  EMERGENCY_CONTACT: (staffId: string, recordId: string) =>
    `/staff/${staffId}/emergency-contacts/${recordId}`,
  EMERGENCY_CONTACTS: (staffId: string) => `/staff/${staffId}/emergency-contacts`,
  LIST: "/staff",
  UPDATE: "/staff",

  // Wages
  WAGES: (staffId: string) => `/staff/${staffId}/wages`,

  // Pay runs
  PAY_RUNS: (staffId: string) => `/staff/${staffId}/pay-runs`,

  // Schedule
  SCHEDULED: (staffId: string) => `/staff/${staffId}/scheduled`,

  // Leaves
  LEAVE: (staffId: string, recordId: string) => `/staff/${staffId}/leaves/${recordId}`,
  LEAVES: (staffId: string) => `/staff/${staffId}/leaves`,

  // Blocked times
  BLOCKED_TIME: (staffId: string, recordId: string) =>
    `/staff/${staffId}/blocked-times/${recordId}`,
  BLOCKED_TIMES: (staffId: string) => `/staff/${staffId}/blocked-times`,

  // Commissions (per staff) — rule creation/configuration is Web-only; Mobile
  // only reads past commission transactions for display.
  COMMISSIONS_HISTORY: (staffId: string) => `/staff/${staffId}/commissions/history`,

  // Commissions (salon-wide) — list + settle only, per staff earnings computed
  // from the Web-configured commission rules.
  COMMISSIONS_EARNED: "/staff/commissions/earned",
  COMMISSIONS_MARK_PAID: (staffId: string) => `/staff/commissions/${staffId}/mark-paid`,
  COMMISSIONS_SUMMARY: "/staff/commissions/summary",

  // Invitations
  CANCEL_INVITE: (staffId: string) => `/staff/${staffId}/cancel-invite`,
  INVITATION_STATUS: (staffId: string) => `/staff/${staffId}/invitation-status`,
  INVITE_ACCEPT: "/staff/invite/accept",
  INVITE_VERIFY: (token: string) => `/staff/invite/${token}/verify`,
  RESEND_INVITE: (staffId: string) => `/staff/${staffId}/resend-invite`,
} as const;
