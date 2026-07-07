import { api } from "@/services/api";
import { STAFF } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  BlockedTimeEntry,
  CreateBlockedTimeRequest,
  CreateBlockedTimeResponse,
  DeleteBlockedTimeResponse,
  UpdateBlockedTimeRequest,
  UpdateBlockedTimeResponse,
} from "@/types/staffBlockedTimes";
import {
  asRecord,
  firstArray,
  firstValue,
  toSafeString,
  type UnknownRecord,
} from "@/utils/apiNormalize";

type BlockedTimeListApiData =
  | UnknownRecord[]
  | {
      blocked_times?: UnknownRecord[] | null;
      blockedTimes?: UnknownRecord[] | null;
      data?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
      rows?: UnknownRecord[] | null;
    };
type BlockedTimeListApiResponse = ApiResponse<BlockedTimeListApiData>;
type BlockedTimeApiData =
  | UnknownRecord
  | {
      blocked_time?: UnknownRecord | null;
      blockedTime?: UnknownRecord | null;
      data?: UnknownRecord | null;
    };
type BlockedTimeApiResponse = ApiResponse<BlockedTimeApiData>;
type DeleteBlockedTimeApiResponse = ApiResponse<unknown>;

const getBlockedTimeArray = (payload: BlockedTimeListApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(asRecord(payload), ["blockedTimes", "blocked_times", "items", "rows", "data"]);
};

const getBlockedTimeFromEnvelope = (payload: BlockedTimeApiData): UnknownRecord => {
  const record = asRecord(payload);
  const nested = firstValue(record, ["blockedTime", "blocked_time", "data"]);

  return nested !== undefined ? asRecord(nested) : record;
};

const normalizeBlockedTime = (
  entry: UnknownRecord,
  staffId: string,
  index: number,
): BlockedTimeEntry => ({
  createdAt: toSafeString(firstValue(entry, ["createdAt", "created_at"])) || null,
  endAt: toSafeString(firstValue(entry, ["endAt", "end_at", "end_time", "endTime"])) || null,
  id: toSafeString(firstValue(entry, ["id", "_id"]), `blocked-time-${index}`),
  notes: toSafeString(firstValue(entry, ["notes"])) || null,
  reason: toSafeString(firstValue(entry, ["reason", "title"])) || null,
  staffId: toSafeString(firstValue(entry, ["staffId", "staff_id"]), staffId),
  startAt: toSafeString(firstValue(entry, ["startAt", "start_at", "start_time", "startTime"])) || null,
});

export const staffBlockedTimesService = {
  async getBlockedTimes(staffId: string): Promise<BlockedTimeEntry[]> {
    const response = await api.get<BlockedTimeListApiResponse>(STAFF.BLOCKED_TIMES(staffId));

    return getBlockedTimeArray(response.data.data).map((entry, index) =>
      normalizeBlockedTime(entry, staffId, index),
    );
  },

  async createBlockedTime(
    staffId: string,
    payload: CreateBlockedTimeRequest,
  ): Promise<CreateBlockedTimeResponse> {
    const response = await api.post<BlockedTimeApiResponse>(STAFF.BLOCKED_TIMES(staffId), payload);

    return {
      blockedTime: normalizeBlockedTime(getBlockedTimeFromEnvelope(response.data.data), staffId, 0),
      message: response.data.message,
      staffId,
    };
  },

  async updateBlockedTime(
    staffId: string,
    recordId: string,
    payload: UpdateBlockedTimeRequest,
  ): Promise<UpdateBlockedTimeResponse> {
    const response = await api.patch<BlockedTimeApiResponse>(
      STAFF.BLOCKED_TIME(staffId, recordId),
      payload,
    );

    return {
      blockedTime: normalizeBlockedTime(getBlockedTimeFromEnvelope(response.data.data), staffId, 0),
      message: response.data.message,
      recordId,
      staffId,
    };
  },

  async deleteBlockedTime(staffId: string, recordId: string): Promise<DeleteBlockedTimeResponse> {
    const response = await api.delete<DeleteBlockedTimeApiResponse>(
      STAFF.BLOCKED_TIME(staffId, recordId),
    );

    return {
      message: response.data.message,
      recordId,
      staffId,
    };
  },
};
