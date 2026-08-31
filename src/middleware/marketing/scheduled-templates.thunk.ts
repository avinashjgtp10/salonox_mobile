import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { WA_AUTOMATION_ENDPOINTS as WA_AUTOMATION } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type { ScheduledMessage, ScheduledMessagesListResponse } from "../../types/marketing.types";

export interface FetchScheduledMessagesParams {
  salonId:    string;
  status?:    string;
  eventType?: string;
  clientId?:  string;
  dateFrom?:  string;
  dateTo?:    string;
  search?:    string;
  page?:      number;
  limit?:     number;
}

export const fetchScheduledMessagesThunk = createAsyncThunk<
  { data: ScheduledMessage[]; total: number },
  FetchScheduledMessagesParams,
  { rejectValue: string }
>(
  "marketing/fetchScheduledMessages",
  async ({ salonId, ...filters }, { rejectWithValue }) => {
    try {
      const res = await api.get<ScheduledMessagesListResponse>(WA_AUTOMATION.SCHEDULED_LIST(salonId), {
        params: filters,
      });
      return res.data.data ?? { data: [], total: 0 };
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to load scheduled messages");
    }
  }
);

export const sendNowThunk = createAsyncThunk<void, { salonId: string; id: string }, { rejectValue: string }>(
  "marketing/scheduledSendNow",
  async ({ salonId, id }, { rejectWithValue }) => {
    try {
      await api.post(WA_AUTOMATION.SCHEDULED_SEND_NOW(salonId, id));
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to send now");
    }
  }
);

export const retryNowThunk = createAsyncThunk<void, { salonId: string; id: string }, { rejectValue: string }>(
  "marketing/scheduledRetryNow",
  async ({ salonId, id }, { rejectWithValue }) => {
    try {
      await api.post(WA_AUTOMATION.SCHEDULED_RETRY_NOW(salonId, id));
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to retry");
    }
  }
);

export const rescheduleThunk = createAsyncThunk<
  void,
  { salonId: string; id: string; scheduledAt: string },
  { rejectValue: string }
>(
  "marketing/scheduledReschedule",
  async ({ salonId, id, scheduledAt }, { rejectWithValue }) => {
    try {
      await api.put(WA_AUTOMATION.SCHEDULED_RESCHEDULE(salonId, id), { scheduled_at: scheduledAt });
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to reschedule");
    }
  }
);

export const skipThunk = createAsyncThunk<void, { salonId: string; id: string }, { rejectValue: string }>(
  "marketing/scheduledSkip",
  async ({ salonId, id }, { rejectWithValue }) => {
    try {
      await api.post(WA_AUTOMATION.SCHEDULED_SKIP(salonId, id));
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to skip");
    }
  }
);

export const cancelScheduledThunk = createAsyncThunk<void, { salonId: string; id: string }, { rejectValue: string }>(
  "marketing/scheduledCancel",
  async ({ salonId, id }, { rejectWithValue }) => {
    try {
      await api.post(WA_AUTOMATION.SCHEDULED_CANCEL(salonId, id));
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to cancel");
    }
  }
);

export const resendScheduledThunk = createAsyncThunk<void, { salonId: string; id: string }, { rejectValue: string }>(
  "marketing/scheduledResend",
  async ({ salonId, id }, { rejectWithValue }) => {
    try {
      await api.post(WA_AUTOMATION.SCHEDULED_RESEND(salonId, id));
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to resend");
    }
  }
);
