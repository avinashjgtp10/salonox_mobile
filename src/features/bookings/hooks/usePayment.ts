import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { patchPaymentStatus } from "../../../store/schedulerSlice";
import { postPaymentThunk, clearClientDuesThunk } from "../../../middleware/booking/payment.thunk";
import { selectBookings } from "../../../store/selectors/scheduler.selectors";
import { buildMethodLabel, isRealId } from "../utils/paymentUtils";
import type { SingleMethod, SplitEntry } from "../types";

interface CompletePaymentParams {
  appointmentId: string | number;
  clientId?: string | null;
  salonId?: string;
  // Totals
  grandTotal: number;
  effectiveTotal: number;
  alreadyPaidAmount: number;
  eWalletAmt: number;
  couponDiscount: number;
  couponApplied: string;
  // Method
  paymentMode: "single" | "split";
  singleMethod: SingleMethod | null;
  splitEntries: SplitEntry[];
  partialAmtInput: string; // empty = full amount, or a custom partial value
  // Clear due
  includeClearDue: boolean;
  priorDueAmt: number;
  useEWallet: boolean;
}

/**
 * Handles the full payment confirmation flow:
 * 1. Posts payment for the current appointment
 * 2. If includeClearDue, clears each partial booking for this client
 * 3. Dispatches patchPaymentStatus to update Redux immediately
 */
export function usePayment() {
  const dispatch = useAppDispatch();
  const allBookings = useAppSelector(selectBookings);

  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError]         = useState<string | null>(null);

  const completePayment = useCallback(async (params: CompletePaymentParams): Promise<boolean> => {
    const {
      appointmentId, clientId, salonId,
      grandTotal, effectiveTotal, alreadyPaidAmount,
      eWalletAmt, couponDiscount, couponApplied,
      paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet,
    } = params;

    setIsProcessing(true);
    setPayError(null);

    try {
      const remainingDue  = Math.max(0, effectiveTotal - alreadyPaidAmount);
      const amountToCharge = includeClearDue ? remainingDue + priorDueAmt : remainingDue;

      // ── Build methods map ───────────────────────────────────────────────
      const methods: Record<string, number> = {};
      if (useEWallet && eWalletAmt > 0) methods["eWallet"] = eWalletAmt;

      if (paymentMode === "split") {
        splitEntries.forEach((e) => {
          const a = parseFloat(e.amount) || 0;
          if (a > 0) methods[e.method] = (methods[e.method] || 0) + a;
        });
      } else {
        // In single mode, respect partialAmtInput if user entered a smaller amount
        const parsedPartial = parseFloat(partialAmtInput);
        const singleCharge = (!isNaN(parsedPartial) && parsedPartial > 0 && parsedPartial < amountToCharge)
          ? parsedPartial
          : amountToCharge;
        methods[singleMethod!] = singleCharge;
      }

      const totalPaid    = Object.values(methods).reduce((a, b) => a + b, 0);
      const currentCharge = Math.min(totalPaid, remainingDue);
      const newDue        = Math.max(0, parseFloat((remainingDue - currentCharge).toFixed(2)));
      const payStatus     = newDue > 0 ? "Partial" : "Paid";
      const methodLabel   = buildMethodLabel(paymentMode, singleMethod, methods);

      // ── Post payment for current appointment ────────────────────────────
      const result: any = await dispatch(postPaymentThunk({
        salon_id:         salonId || undefined,
        appointment_id:   appointmentId,
        client_id:        (clientId && isRealId(clientId)) ? clientId : undefined,
        gross_amount:     grandTotal,
        discount_amount:  alreadyPaidAmount > 0 ? 0 : couponDiscount,
        ewallet_used:     useEWallet ? eWalletAmt : 0,
        net_amount:       effectiveTotal,
        paid_amount:      currentCharge,
        due_amount:       newDue,
        coupon_code:      alreadyPaidAmount > 0 ? undefined : (couponApplied || undefined),
        payment_method:   methodLabel,
        split_details:    paymentMode === "split" ? methods : { [singleMethod!]: currentCharge },
        status:           newDue > 0 ? "partial" : "completed",
      }));

      // "already completed" is treated as success
      if (postPaymentThunk.rejected.match(result)) {
        const msg = (result.payload as string) || "Payment failed";
        setPayError(msg);
        return false;
      }

      // ── Patch Redux for current booking ─────────────────────────────────
      dispatch(patchPaymentStatus({
        id: String(appointmentId),
        paymentStatus: payStatus as "Paid" | "Partial",
        payingNow: alreadyPaidAmount + currentCharge,
        dueAmount: newDue,
        grandTotal: effectiveTotal,
        paymentMode: paymentMode === "split"
          ? Object.keys(methods).filter((k) => k !== "eWallet").join("+")
          : (singleMethod || "Cash"),
      }));

      // ── Clear prior dues if toggled ──────────────────────────────────────
      if (includeClearDue && priorDueAmt > 0 && clientId && isRealId(clientId)) {
        const partialBookings = allBookings
          .filter((b) =>
            String(b.clientId) === String(clientId) &&
            String(b.id) !== String(appointmentId) &&
            (b.paymentStatus === "Partial" || b.paymentStatus === "Unpaid") &&
            Number(b.dueAmount) > 0
          )
          .map((b) => ({
            id: b.id,
            dueAmount: Number(b.dueAmount),
            grandTotal: Number(b.grandTotal),
          }));

        if (partialBookings.length > 0) {
          await dispatch(clearClientDuesThunk({
            clientId: String(clientId),
            salonId,
            paymentMethod: singleMethod || "Cash",
            partialBookings,
          }));
        }
      }

      return true;
    } catch (err: any) {
      setPayError(err?.message || "Unexpected error");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch, allBookings]);

  return { completePayment, isProcessing, payError, setPayError };
}
