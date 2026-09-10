import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { PAYMENT_SETTINGS } from "../../services/api/endpoints/pos-payment.endpoints";
import type { PaymentTerminal, PaymentProviderConfig } from "../../features/bookings/types";

function extractMessage(err: any, fallback: string): string {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

export const fetchPaymentTerminalsThunk = createAsyncThunk(
  "paymentSettings/fetchTerminals",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await api.get(PAYMENT_SETTINGS.TERMINALS);
      return (res.data?.data ?? []) as PaymentTerminal[];
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to fetch terminals"));
    }
  }
);

export const createPaymentTerminalThunk = createAsyncThunk(
  "paymentSettings/createTerminal",
  async (data: { branch_id?: string; provider: string; terminal_label: string; provider_terminal_id?: string; serial_number?: string }, { rejectWithValue }) => {
    try {
      const res = await api.post(PAYMENT_SETTINGS.TERMINALS, data);
      return res.data?.data as PaymentTerminal;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to create terminal"));
    }
  }
);

export const updatePaymentTerminalThunk = createAsyncThunk(
  "paymentSettings/updateTerminal",
  async ({ id, data }: { id: string; data: Partial<PaymentTerminal> }, { rejectWithValue }) => {
    try {
      const res = await api.put(PAYMENT_SETTINGS.TERMINAL_BY_ID(id), data);
      return res.data?.data as PaymentTerminal;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to update terminal"));
    }
  }
);

export const deletePaymentTerminalThunk = createAsyncThunk(
  "paymentSettings/deleteTerminal",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(PAYMENT_SETTINGS.TERMINAL_BY_ID(id));
      return id;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to delete terminal"));
    }
  }
);

export const fetchPaymentProviderConfigsThunk = createAsyncThunk(
  "paymentSettings/fetchProviders",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await api.get(PAYMENT_SETTINGS.PROVIDERS);
      return (res.data?.data ?? []) as PaymentProviderConfig[];
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to fetch provider configs"));
    }
  }
);

export const upsertPaymentProviderConfigThunk = createAsyncThunk(
  "paymentSettings/upsertProvider",
  async (data: {
    provider: string; environment?: "sandbox" | "production"; merchant_id?: string;
    credentials?: Record<string, string>; is_enabled?: boolean;
  }, { rejectWithValue }) => {
    try {
      const res = await api.post(PAYMENT_SETTINGS.PROVIDERS, data);
      return res.data?.data as PaymentProviderConfig;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to save provider configuration"));
    }
  }
);

export const testPaymentProviderConnectionThunk = createAsyncThunk(
  "paymentSettings/testProvider",
  async (provider: string, { rejectWithValue }) => {
    try {
      const res = await api.post(PAYMENT_SETTINGS.TEST_PROVIDER(provider));
      return res.data?.data as { ok: boolean; message: string };
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Connection test failed"));
    }
  }
);
