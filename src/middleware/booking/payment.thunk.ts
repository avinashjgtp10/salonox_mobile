import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { PAYMENT } from "../../services/api/endpoints/payment.endpoints";
import { COUPON } from "../../services/api/endpoints/coupon.endpoints";
import { patchPaymentStatus } from "../../store/schedulerSlice";
import type { PaymentPayload, ClearDueResult } from "../../features/bookings/types";

// ─── Post a payment for an appointment ───────────────────────────────────────
export const postPaymentThunk = createAsyncThunk(
  "payment/post",
  async (payload: PaymentPayload, { rejectWithValue }) => {
    try {
      const res = await api.post(PAYMENT.BASE, payload);
      return res.data;
    } catch (err: any) {
      const msg: string = err?.response?.data?.error?.message || err?.message || "Payment failed";
      // "already completed" is not an error — caller handles it
      if (msg.toLowerCase().includes("already completed")) return { alreadyCompleted: true };
      return rejectWithValue(msg);
    }
  }
);

// ─── Apply coupon code ────────────────────────────────────────────────────────
export const applyCouponThunk = createAsyncThunk(
  "payment/applyCoupon",
  async (
    { code, subtotal, salonId }: { code: string; subtotal: number; salonId?: string },
    { rejectWithValue }
  ) => {
    try {
      // Backend derives salon scoping from the JWT, not the body — salon_id
      // here is accepted but ignored server-side; kept for parity with other
      // payment-related calls that do send it explicitly.
      const res = await api.post(COUPON.VALIDATE, { code, orderAmount: subtotal, salon_id: salonId });
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.error?.message || err?.message || "Invalid coupon"
      );
    }
  }
);

// ─── Clear all prior dues for a client in one shot ───────────────────────────
/** Finds every Partial/Unpaid booking for this client in the Redux store,
 *  posts a payment to clear each one, and dispatches patchPaymentStatus. */
export const clearClientDuesThunk = createAsyncThunk(
  "payment/clearClientDues",
  async (
    {
      clientId,
      salonId,
      paymentMethod,
      partialBookings,
    }: {
      clientId: string;
      salonId?: string;
      paymentMethod: string;
      partialBookings: Array<{ id: string | number; dueAmount: number; grandTotal: number }>;
    },
    { dispatch }
  ) => {
    const results: ClearDueResult[] = [];

    await Promise.allSettled(
      partialBookings.map(async (pb) => {
        try {
          await api.post(PAYMENT.BASE, {
            salon_id: salonId || undefined,
            appointment_id: pb.id,
            client_id: clientId,
            gross_amount: pb.grandTotal || pb.dueAmount,
            paid_amount: pb.dueAmount,
            due_amount: 0,
            net_amount: pb.dueAmount,
            payment_method: paymentMethod,
            split_details: { [paymentMethod]: pb.dueAmount },
            status: "completed",
            notes: "Cleared via 'Clear Pending Due' during another appointment payment",
          } satisfies PaymentPayload);

          // Patch Redux immediately — chip turns green before next refresh
          dispatch(patchPaymentStatus({
            id: String(pb.id),
            status: "paid",
            payingNow: pb.grandTotal,
            dueAmount: 0,
            grandTotal: pb.grandTotal,
          }));

          results.push({ bookingId: pb.id, clearedAmount: pb.dueAmount, success: true });
        } catch {
          results.push({ bookingId: pb.id, clearedAmount: 0, success: false });
        }
      })
    );

    return results;
  }
);
