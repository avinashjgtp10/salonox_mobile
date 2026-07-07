import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  CancelInviteResponse,
  InvitationStatus,
  ResendInviteResponse,
  VerifyInviteResult,
} from "@/types/staffInvitations";
import { asRecord, firstValue, toSafeString, type UnknownRecord } from "@/utils/apiNormalize";

type InvitationStatusApiData =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      invitation?: UnknownRecord | null;
    };
type InvitationStatusApiResponse = ApiResponse<InvitationStatusApiData>;
type ResendInviteApiResponse = ApiResponse<unknown>;
type CancelInviteApiResponse = ApiResponse<unknown>;
type VerifyInviteApiData =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      invitation?: UnknownRecord | null;
    };
type VerifyInviteApiResponse = ApiResponse<VerifyInviteApiData>;
type AcceptInviteApiResponse = ApiResponse<unknown>;

const getInvitationFromEnvelope = (payload: InvitationStatusApiData): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["invitation", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeInvitationStatus = (entry: UnknownRecord, staffId: string): InvitationStatus => ({
  email: toSafeString(firstValue(entry, ["email"])) || null,
  expiresAt: toSafeString(firstValue(entry, ["expiresAt", "expires_at"])) || null,
  invitedAt: toSafeString(firstValue(entry, ["invitedAt", "invited_at", "created_at"])) || null,
  staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
  status: toSafeString(firstValue(entry, ["status"]), "none"),
});

export const staffInvitationsService = {
  async getInvitationStatus(staffId: string): Promise<InvitationStatus> {
    const response = await api.get<InvitationStatusApiResponse>(STAFF.INVITATION_STATUS(staffId));

    return normalizeInvitationStatus(getInvitationFromEnvelope(response.data.data), staffId);
  },

  async resendInvite(staffId: string): Promise<ResendInviteResponse> {
    const response = await api.post<ResendInviteApiResponse>(STAFF.RESEND_INVITE(staffId));

    return {
      message: response.data.message,
      staffId,
    };
  },

  async cancelInvite(staffId: string): Promise<CancelInviteResponse> {
    const response = await api.delete<CancelInviteApiResponse>(STAFF.CANCEL_INVITE(staffId));

    return {
      message: response.data.message,
      staffId,
    };
  },

  async verifyInviteToken(token: string): Promise<VerifyInviteResult> {
    const response = await api.get<VerifyInviteApiResponse>(STAFF.INVITE_VERIFY(token));
    const entry = getInvitationFromEnvelope(response.data.data);

    return {
      email: toSafeString(firstValue(entry, ["email"])) || null,
      fullName:
        toSafeString(firstValue(entry, ["fullName", "full_name", "name"])) || null,
      staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"])) || null,
      valid: true,
    };
  },

  async acceptInvite(payload: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    const response = await api.post<AcceptInviteApiResponse>(STAFF.INVITE_ACCEPT, payload);

    return {
      message: response.data.message,
    };
  },
};
