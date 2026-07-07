import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  CreateLeaveRequest,
  CreateLeaveResponse,
  DeleteLeaveResponse,
  LeaveEntry,
  UpdateLeaveRequest,
  UpdateLeaveResponse,
} from "@/types/staffLeaves";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type LeaveListApiData =
  | UnknownRecord[]
  | {
      data?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
      leaves?: UnknownRecord[] | null;
      rows?: UnknownRecord[] | null;
    };
type LeaveListApiResponse = ApiResponse<LeaveListApiData>;
type LeaveApiData =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      leave?: UnknownRecord | null;
    };
type LeaveApiResponse = ApiResponse<LeaveApiData>;
type DeleteLeaveApiResponse = ApiResponse<unknown>;

const getLeaveArray = (payload: LeaveListApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["leaves", "items", "rows", "data"]);
};

const getLeaveFromEnvelope = (payload: LeaveApiData): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["leave", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeLeave = (entry: UnknownRecord, staffId: string, index: number): LeaveEntry => ({
  createdAt: toSafeString(firstValue(entry, ["createdAt", "created_at"])) || null,
  endDate: toSafeString(firstValue(entry, ["endDate", "end_date"])) || null,
  id: toSafeString(firstValue(entry, ["id", "_id"]), `leave-${index}`),
  notes: toSafeString(firstValue(entry, ["notes"])) || null,
  reason: toSafeString(firstValue(entry, ["reason"])) || null,
  staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
  startDate: toSafeString(firstValue(entry, ["startDate", "start_date"])) || null,
  status: toSafeString(firstValue(entry, ["status"]), "pending"),
  type: toSafeString(firstValue(entry, ["type", "leave_type", "leaveType"]), "General"),
});

export const staffLeavesService = {
  async getLeaves(staffId: string): Promise<LeaveEntry[]> {
    const response = await api.get<LeaveListApiResponse>(STAFF.LEAVES(staffId));

    return getLeaveArray(response.data.data).map((entry, index) =>
      normalizeLeave(entry, staffId, index),
    );
  },

  async createLeave(staffId: string, payload: CreateLeaveRequest): Promise<CreateLeaveResponse> {
    const response = await api.post<LeaveApiResponse>(STAFF.LEAVES(staffId), payload);

    return {
      leave: normalizeLeave(getLeaveFromEnvelope(response.data.data), staffId, 0),
      message: response.data.message,
      staffId,
    };
  },

  async updateLeave(
    staffId: string,
    recordId: string,
    payload: UpdateLeaveRequest,
  ): Promise<UpdateLeaveResponse> {
    const response = await api.patch<LeaveApiResponse>(STAFF.LEAVE(staffId, recordId), payload);

    return {
      leave: normalizeLeave(getLeaveFromEnvelope(response.data.data), staffId, 0),
      message: response.data.message,
      recordId,
      staffId,
    };
  },

  async deleteLeave(staffId: string, recordId: string): Promise<DeleteLeaveResponse> {
    const response = await api.delete<DeleteLeaveApiResponse>(STAFF.LEAVE(staffId, recordId));

    return {
      message: response.data.message,
      recordId,
      staffId,
    };
  },
};
