import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { NOTIFICATION_CHANNELS_ENDPOINTS as NOTIF_CHANNELS } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  NotificationChannelTemplate,
  NotificationChannelTemplatesListResponse,
  NotificationChannelTemplateResponse,
} from "../../types/marketing.types";

export const fetchNotificationChannelTemplatesThunk = createAsyncThunk<
  NotificationChannelTemplate[], string, { rejectValue: string }
>(
  "marketing/fetchNotificationChannelTemplates",
  async (salonId, { rejectWithValue }) => {
    try {
      const res = await api.get<NotificationChannelTemplatesListResponse>(NOTIF_CHANNELS.LIST(salonId));
      return res.data.data ?? [];
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to fetch notification channel templates");
    }
  }
);

export const updateSmsTemplateThunk = createAsyncThunk<
  NotificationChannelTemplate,
  { salonId: string; eventType: string; body: string },
  { rejectValue: string }
>(
  "marketing/updateSmsTemplate",
  async ({ salonId, eventType, body }, { rejectWithValue }) => {
    try {
      const res = await api.patch<NotificationChannelTemplateResponse>(
        NOTIF_CHANNELS.UPDATE_SMS(salonId, eventType), { body }
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to save SMS wording");
    }
  }
);

export const updateEmailTemplateThunk = createAsyncThunk<
  NotificationChannelTemplate,
  { salonId: string; eventType: string; subject: string; body: string },
  { rejectValue: string }
>(
  "marketing/updateEmailTemplate",
  async ({ salonId, eventType, subject, body }, { rejectWithValue }) => {
    try {
      const res = await api.patch<NotificationChannelTemplateResponse>(
        NOTIF_CHANNELS.UPDATE_EMAIL(salonId, eventType), { subject, body }
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to save email content");
    }
  }
);

// Fires one real send right now via whichever provider is currently
// configured, outside the template/event system — for the "Send Test"
// button. rejectValue carries the real provider error message (e.g. an
// SMS gateway rejection) straight through so the user sees exactly why it
// failed, not a generic message.
export const sendTestMessageThunk = createAsyncThunk<
  { providerId: string | null },
  { salonId: string; channel: "sms" | "email"; to: string },
  { rejectValue: string }
>(
  "marketing/sendTestMessage",
  async ({ salonId, channel, to }, { rejectWithValue }) => {
    try {
      const res = await api.post<{ data: { providerId: string | null } }>(
        NOTIF_CHANNELS.SEND_TEST(salonId, channel), { to }
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue(`Failed to send test ${channel === "sms" ? "SMS" : "email"}`);
    }
  }
);

export const setChannelEnabledThunk = createAsyncThunk<
  NotificationChannelTemplate,
  { salonId: string; eventType: string; channel: "sms" | "email"; enabled: boolean },
  { rejectValue: string }
>(
  "marketing/setChannelEnabled",
  async ({ salonId, eventType, channel, enabled }, { rejectWithValue }) => {
    try {
      const res = await api.patch<NotificationChannelTemplateResponse>(
        NOTIF_CHANNELS.SET_ENABLED(salonId, eventType, channel), { enabled }
      );
      return res.data.data;
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to update channel setting");
    }
  }
);
