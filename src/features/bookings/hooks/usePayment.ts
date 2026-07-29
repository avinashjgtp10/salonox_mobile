import { useState, useCallback } from "react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useCurrency } from "../../../hooks/useCurrency";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { patchPaymentStatus } from "../../../store/schedulerSlice";
import { postPaymentThunk, clearClientDuesThunk } from "../../../middleware/booking/payment.thunk";
import { checkoutBookingThunk } from "../../../middleware/booking/booking.thunk";
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
  // Item-level manual discount ONLY (totals.manualDiscount) — must exclude
  // coupon, since couponDiscount below is added separately; combining
  // totals.totalDisc (which already has coupon baked in) here would double it.
  manualDiscountAmt?: number;
  gstAmount?: number;         // add-on tax amount included in grandTotal, for receipt display
  taxBreakdown?: Booking["taxBreakdown"];
  // Whether staff had "Include GST in this bill" checked for THIS payment —
  // must reach the backend, or it independently recomputes tax from the
  // salon's active config regardless of what was actually shown/charged.
  includeGst?: boolean;
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
  // Specific prior booking ids staff checked to clear alongside this payment —
  // only these get cleared, not every outstanding partial/unpaid booking.
  selectedDueIds?: string[];
  useEWallet: boolean;
  applyMembershipWallet?: boolean;
  // Staff-chosen cap ("only use ₹150 of the wallet") — the backend still
  // clamps further by real balance/eligible items.
  membershipWalletRequested?: number;
  // Own dedicated, spendable balances now — not folded into eWallet.
  rewardPointsToRedeem?: number; // points count
  referralCreditAmt?: number;    // ₹
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
  const { showSuccess, overlay } = useStatusOverlay();
  const { formatAmount } = useCurrency();

  const completePayment = useCallback(async (params: CompletePaymentParams): Promise<boolean> => {
    const {
      appointmentId, clientId, salonId,
      grandTotal, effectiveTotal, subtotal, manualDiscountAmt,
      alreadyPaidAmount, eWalletAmt, couponDiscount, couponApplied,
      paymentMode, singleMethod, splitEntries, partialAmtInput,
      includeClearDue, priorDueAmt, selectedDueIds, useEWallet, applyMembershipWallet,
      membershipWalletRequested,
      gstAmount, taxBreakdown, rewardPointsToRedeem, referralCreditAmt,
      includeGst,
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
        // Cash/Card/UPI, so there's nothing to record here (don't invent a
        // "Cash" leg for an amount that was never actually charged to Cash).
        if (singleMethod && singleCharge > 0) {
          methods[singleMethod] = (methods[singleMethod] || 0) + singleCharge;
        }
      }

      // remainingDue is already net of eWallet (effectiveTotal = grandTotal -
      // eWalletUsed - membershipWalletUsed), but `methods` re-adds the eWallet
      // leg on top of the Cash/Card/UPI legs — so capping totalPaid against
      // remainingDue alone would silently drop the eWallet contribution from
      // paid_amount (e.g. a bill fully covered by eWallet would post paid_amount
      // ₹0 instead of the ₹ actually moved). Add it back for the real total owed.
      const eWalletContribution = useEWallet ? eWalletAmt : 0;
      const totalOwedThisTxn = remainingDue + eWalletContribution;

      const totalPaid    = Object.values(methods).reduce((a, b) => a + b, 0);
      const currentCharge = Math.min(totalPaid, totalOwedThisTxn);
      const newDue        = Math.max(0, parseFloat((totalOwedThisTxn - currentCharge).toFixed(2)));
      const methodLabel   = buildMethodLabel(paymentMode, singleMethod, methods);

      // ── Post payment for current appointment ────────────────────────────
      // The backend (payments.service.ts `create()`) recomputes gross_amount/
      // net_amount/due_amount server-side from raw item prices plus the
      // salon's own active/applicable tax config — it doesn't trust whatever
      // ₹ tax figure we send here, it derives its own amount. What we send
      // (net_amount, tax_breakdown) is for the receipt/audit trail, not the
      // authoritative due-amount source. `include_gst` is the one tax-related
      // flag it DOES respect — without it, the backend has no way to know
      // GST was deliberately excluded from this specific bill and applies its
      // active tax config unconditionally, leaving a phantom GST-sized due
      // amount and a wrongly-"Partial" status after a full payment.
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
        split_details:    methods,
        status:           newDue > 0 ? "partial" : "completed",
        apply_membership_wallet: !!applyMembershipWallet,
        membership_wallet_requested: applyMembershipWallet ? membershipWalletRequested : undefined,
        tax_breakdown: taxBreakdown && taxBreakdown.length > 0 ? taxBreakdown : undefined,
        reward_points_used: rewardPointsToRedeem || undefined,
        referral_credit_used: referralCreditAmt || undefined,
        include_gst: includeGst,
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
      const finalStatus: "paid" | "partial" = finalDue > 0 ? "partial" : "paid";
      // Server-computed, not a local guess — this is the whole point of the
      // referral discount (payments.service.ts decides eligibility from the
      // client's real referred_by_client_id/referral_reward_status, which the
      // frontend's own preview can only approximate ahead of submission).
      const referralDiscountApplied = savedPayment?.referral_discount_applied != null
        ? Number(savedPayment.referral_discount_applied) : 0;
      // Set only when the referee's welcome reward couldn't apply as an
      // instant discount (bill below min_bill_amount) and was credited to
      // their eWallet instead — see payments.service.ts.
      const referralWalletCredited = savedPayment?.referral_wallet_credited != null
        ? Number(savedPayment.referral_wallet_credited) : 0;
      if (referralWalletCredited > 0) {
        showSuccess(`Referral reward of ${formatAmount(referralWalletCredited)} added to client's eWallet`);
      }

      dispatch(patchPaymentStatus({
        id: String(appointmentId),
        status: finalStatus,
        payingNow: alreadyPaidAmount + finalPaid,
        dueAmount: finalDue,
        grandTotal: effectiveTotal,
        paymentMode: methodLabel,
        gstAmount,
        taxBreakdown,
        couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
        couponCode: couponDiscount > 0 ? couponApplied : undefined,
        referralDiscount: referralDiscountApplied > 0 ? referralDiscountApplied : undefined,
        // So an immediate auto-print (before any refetch) can already show the
        // eWallet/membership-wallet/split breakdown — prefer the server's own
        // saved figures over our local guess, same reasoning as finalPaid/finalDue above.
        ewalletUsed: savedPayment?.ewallet_used != null ? Number(savedPayment.ewallet_used) : (useEWallet ? eWalletAmt : 0),
        membershipWalletUsed: savedPayment?.membership_wallet_used != null ? Number(savedPayment.membership_wallet_used) : undefined,
        rewardPointsValue: savedPayment?.reward_points_value != null ? Number(savedPayment.reward_points_value) : undefined,
        referralCreditUsed: savedPayment?.referral_credit_used != null ? Number(savedPayment.referral_credit_used) : (referralCreditAmt || undefined),
        splitDetails: savedPayment?.split_details ?? methods,
      }));

      // ── Checkout the appointment so commission fires ─────────────────────
      // payments.service.ts (server-side) auto-creates a `sales` row when this
      // payment fully completes it, but deliberately stops short of marking the
      // appointment "completed" or calculating commission — that's left to the
      // separate checkout step below, which picks up that pre-existing sale,
      // fires commissionCalculationService on it, and completes the appointment.
      // Best-effort: never block/fail the payment itself on this — errors (e.g.
      // "already completed" from a duplicate call) are swallowed, matching the
      // rejected-action result RTK thunks resolve to rather than throw.
      if (finalDue === 0) {
        dispatch(checkoutBookingThunk({ id: appointmentId, data: {} }));
      }

      // ── Clear prior dues if toggled ──────────────────────────────────────
      // Only the specific bookings staff checked — not every outstanding
      // partial/unpaid booking for this client — so falls through to "clear
      // nothing" if the caller never sent a selection (old behavior would
      // have cleared everything, which is no longer what's wanted).
      const dueIdSet = new Set((selectedDueIds ?? []).map(String));
      if (includeClearDue && priorDueAmt > 0 && dueIdSet.size > 0 && clientId && isRealId(clientId)) {
        const partialBookings = allBookings
          .filter((b) =>
            String(b.clientId) === String(clientId) &&
            String(b.id) !== String(appointmentId) &&
            b.status !== "paid" &&
            Number(b.dueAmount) > 0 &&
            dueIdSet.has(String(b.id))
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
            paymentMethod: methodLabel,
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

  return { completePayment, isProcessing, payError, setPayError, paymentOverlay: overlay };
}
