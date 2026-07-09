import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { patchPaymentStatus } from "../../../store/schedulerSlice";
import { postPaymentThunk, clearClientDuesThunk } from "../../../middleware/booking/payment.thunk";
import { selectBookings } from "../../../store/selectors/scheduler.selectors";
import { buildMethodLabel, isRealId } from "../utils/paymentUtils";
import type { SingleMethod, SplitEntry, Booking } from "../types";

interface CompletePaymentParams {
  appointmentId: string | number;
  clientId?: string | null;
  salonId?: string;
  // Totals
  grandTotal: number;       // post-discount net total (used for UI + net_amount)
  effectiveTotal: number;   // grandTotal - eWalletUsed
  subtotal?: number;        // pre-discount subtotal → sent as gross_amount to backend
  manualDiscountAmt?: number; // monetary discount applied on services (from totals.totalDisc)
  gstAmount?: number;         // add-on tax amount included in grandTotal, for receipt display
  taxBreakdown?: Booking["taxBreakdown"];
  alreadyPaidAmount: number;
  eWalletAmt: number;
  couponDiscount: number;
  couponApplied: string;
  rewardPointsRedeemed?: number;
  // Method
  paymentMode: "single" | "split";
  singleMethod: SingleMethod | null;
  splitEntries: SplitEntry[];
  partialAmtInput: string; // empty = full amount, or a custom partial value
  // Clear due
  includeClearDue: boolean;
  priorDueAmt: number;
  useEWallet: boolean;
  applyMembershipWallet?: boolean;
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
      grandTotal, effectiveTotal, subtotal, manualDiscountAmt,
      alreadyPaidAmount, eWalletAmt, couponDiscount, couponApplied,
      paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, useEWallet, applyMembershipWallet,
      gstAmount, taxBreakdown, rewardPointsRedeemed,
    } = params;

    // gross_amount = pre-discount subtotal so the backend can compute:
    //   net = gross - discount_amount, due = net - paid = 0
    const payloadGross    = (subtotal && subtotal > grandTotal) ? subtotal : grandTotal;
    const payloadDiscount = (manualDiscountAmt || 0) + couponDiscount;

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
        // In single mode, respect partialAmtInput if user entered a smaller amount.
        // 0 is a valid entry — it means "collect nothing now, leave it all due" —
        // so this must allow exactly 0, not just amounts strictly greater than 0.
        const parsedPartial = parseFloat(partialAmtInput);
        const singleCharge = (!isNaN(parsedPartial) && parsedPartial >= 0 && parsedPartial < amountToCharge)
          ? parsedPartial
          : amountToCharge;
        // singleMethod can be null when the bill was already fully covered by a
        // wallet/membership/points deduction — nothing was ever collected via
        // Cash/Card/UPI, so there was nothing to force the user to pick.
        methods[singleMethod || "Cash"] = singleCharge;
      }

      const totalPaid    = Object.values(methods).reduce((a, b) => a + b, 0);
      const currentCharge = Math.min(totalPaid, remainingDue);
      const newDue        = Math.max(0, parseFloat((remainingDue - currentCharge).toFixed(2)));
      const methodLabel   = buildMethodLabel(paymentMode, singleMethod, methods);

      // ── Post payment for current appointment ────────────────────────────
      // KNOWN GAP: the backend (payments.service.ts `create()`) recomputes
      // gross_amount/net_amount server-side from raw appointment item prices
      // and ignores whatever we send here — it does not add tax. So the
      // receipt below correctly displays tax (gstAmount/taxBreakdown), but
      // the amount actually required to mark the appointment "Paid" excludes
      // it. Fixing that requires updating payments.service.ts to add the
      // same active/applicable tax from salon_settings into its recompute.
      const result: any = await dispatch(postPaymentThunk({
        salon_id:         salonId || undefined,
        appointment_id:   appointmentId,
        client_id:        (clientId && isRealId(clientId)) ? clientId : undefined,
        gross_amount:     payloadGross,
        discount_amount:  alreadyPaidAmount > 0 ? 0 : payloadDiscount,
        ewallet_used:     useEWallet ? eWalletAmt : 0,
        net_amount:       effectiveTotal,
        paid_amount:      currentCharge,
        due_amount:       newDue,
        coupon_code:      alreadyPaidAmount > 0 ? undefined : (couponApplied || undefined),
        payment_method:   methodLabel,
        split_details:    paymentMode === "split" ? methods : { [singleMethod!]: currentCharge },
        status:           newDue > 0 ? "partial" : "completed",
        apply_membership_wallet: !!applyMembershipWallet,
        reward_points_redeemed: rewardPointsRedeemed || undefined,
        tax_breakdown: taxBreakdown && taxBreakdown.length > 0 ? taxBreakdown : undefined,
      }));

      // "already completed" is treated as success
      if (postPaymentThunk.rejected.match(result)) {
        const msg = (result.payload as string) || "Payment failed";
        setPayError(msg);
        return false;
      }

      // ── Patch Redux for current booking ─────────────────────────────────
      // Prefer the backend's own saved payment record over our local guess —
      // payments.service.ts independently recomputes due/paid amounts server-side
      // (e.g. after its own reward-points/membership-wallet deductions), and that
      // recompute can legitimately differ from what we assumed here. Trusting our
      // own numbers instead of the server's would show a due amount that doesn't
      // match what was actually recorded (e.g. a redeemed-points shortfall showing
      // up as unpaid "Due" even though the customer paid what they owed).
      const savedPayment = result.payload?.data;
      const finalDue     = savedPayment?.due_amount    != null ? Number(savedPayment.due_amount)    : newDue;
      const finalPaid    = savedPayment?.paid_amount    != null ? Number(savedPayment.paid_amount)    : currentCharge;
      const finalStatus: "Paid" | "Partial" = finalDue > 0 ? "Partial" : "Paid";
      const rewardPointsValuePaid = savedPayment?.reward_points_value != null ? Number(savedPayment.reward_points_value) : 0;

      dispatch(patchPaymentStatus({
        id: String(appointmentId),
        paymentStatus: finalStatus,
        payingNow: alreadyPaidAmount + finalPaid,
        dueAmount: finalDue,
        grandTotal: effectiveTotal,
        rewardPointsValue: rewardPointsValuePaid,
        paymentMode: paymentMode === "split"
          ? Object.keys(methods).filter((k) => k !== "eWallet").join("+")
          : (singleMethod || "Cash"),
        gstAmount,
        taxBreakdown,
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
