export const MEMBERSHIP = {
  CREATE: "/memberships",
  DELETE: (id: string) => `/memberships/${id}`,
  DETAIL: (id: string) => `/memberships/${id}`,
  EXPORT_CSV: "/memberships/export/csv",
  EXPORT_EXCEL: "/memberships/export/excel",
  EXPORT_PDF: "/memberships/export/pdf",
  LIST: "/memberships",
  UPDATE: (id: string) => `/memberships/${id}`,
} as const;

export const CLIENT_MEMBERSHIP = {
  ASSIGN: "/client-memberships",
  CANCEL: (assignmentId: string) => `/client-memberships/${assignmentId}/cancel`,
  CHANGE: (assignmentId: string) => `/client-memberships/${assignmentId}`,
  CLIENT_ASSIGNMENTS: "/client-memberships",
  DETAIL: (assignmentId: string) => `/client-memberships/${assignmentId}`,
  MEMBERSHIP_CLIENTS: (membershipId: string) => `/memberships/${membershipId}/clients`,
  RENEW: (assignmentId: string) => `/client-memberships/${assignmentId}/renew`,
} as const;
