export type InvitationStatus = {
  email: string | null;
  expiresAt: string | null;
  invitedAt: string | null;
  staffId: string;
  status: string;
};

export type ResendInviteResponse = {
  message?: string;
  staffId: string;
};

export type CancelInviteResponse = {
  message?: string;
  staffId: string;
};

export type VerifyInviteResult = {
  email: string | null;
  fullName: string | null;
  staffId: string | null;
  valid: boolean;
};

export type AcceptInviteRequest = {
  password: string;
  token: string;
};

export type AcceptInviteResponse = {
  message?: string;
};
