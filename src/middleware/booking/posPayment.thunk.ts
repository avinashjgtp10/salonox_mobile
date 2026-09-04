import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { POS_PAYMENT } from "../../services/api/endpoints/pos-payment.endpoints";
import type { CreatePosPaymentPayload, PosPaymentRequest } from "../../features/bookings/types";

function extractMessage(err: any, fallback: string): string {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

export const createPosPaymentThunk = createAsyncThunk(
  "posPayment/create",
  async (payload: CreatePosPaymentPayload, { rejectWithValue }) => {
    try {
      const res = await api.post(POS_PAYMENT.BASE, payload);
      return res.data?.data as PosPaymentRequest;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to start Payment Machine request"));
    }
  }
);

export const getPosPaymentStatusThunk = createAsyncThunk(
  "posPayment/status",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get(POS_PAYMENT.STATUS(id));
      return res.data?.data as PosPaymentRequest;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to check payment status"));
    }
  }
);

export const cancelPosPaymentThunk = createAsyncThunk(
  "posPayment/cancel",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.post(POS_PAYMENT.CANCEL(id));
      return res.data?.data as PosPaymentRequest;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to cancel payment request"));
    }
  }
);

export const confirmManualPosPaymentThunk = createAsyncThunk(
  "posPayment/confirmManual",
  async ({ id, providerTransactionId }: { id: string; providerTransactionId: string }, { rejectWithValue }) => {
    try {
      const res = await api.post(POS_PAYMENT.CONFIRM_MANUAL(id), { provider_transaction_id: providerTransactionId });
      return res.data?.data as PosPaymentRequest;
    } catch (err: any) {
      return rejectWithValue(extractMessage(err, "Failed to confirm payment"));
    }
  }
);
