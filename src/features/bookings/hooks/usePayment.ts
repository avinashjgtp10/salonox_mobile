import { useState, useCallback } from "react";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useCurrency } from "../../../hooks/useCurrency";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { patchPaymentStatus } from "../../../store/schedulerSlice";
import { postPaymentThunk, clearClientDuesThunk } from "../../../middleware/booking/payment.thunk";
import { checkoutBookingThunk } from "../../../middleware/booking/booking.thunk";
import { selectBookings } from "../../../store/selectors/scheduler.selectors";
import { buildMethodLabel, isRealId } from "../utils/paymentUtils";
import type { SplitEntry, Booking, PaymentPayload, PaymentMethodSelection } from "../types";

interface CompletePaymentParams {
  appointmentId: string | number;
  clientId?: string | null;
  salonId?: string;
  // Totals
  // Fully-reduced bill total (Svc Discount, Extra Charges/Tip, Referral
  // Discount, Membership Wallet, eWallet, Reward Points ALL already applied)
  // — used for UI display, net_amount, and remainingDue. There is no longer a
  // separate "gross bill before redemptions" concept passed here.
  grandTotal: number;
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
  // Widened to PaymentMethodSelection (Cash/Card/UPI + "Payment Machine")
  // rather than SingleMethod: buildPaymentPayload (below) is shared by
  // completePayment AND the async Payment Machine flow, which needs to pass
  // "Payment Machine" through as a genuine method value. completePayment
  // itself is never actually invoked with it — AppointmentModal's handlePay/
  // handleQuickSaleCheckout branch to the POS flow before calling it.
  singleMethod: PaymentMethodSelection | null;
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
  // Percentage/loyalty membership discount. The amount is decided server-side
  // (plan %, eligible line total, discount balance left), but staff can lower
  // the RATE for one bill from the Available Benefits panel —
  // membershipDiscountPercentRequested carries that percentage. Undefined =
  // charge the plan's own rate.
  applyMembershipDiscount?: boolean;
  membershipDiscountPercentRequested?: number;
  // Independent sibling flag for the salon-wide Loyalty discount — stacks
  // additively with applyMembershipDiscount above when both are checked.
  applyLoyaltyDiscount?: boolean;
  // Own dedicated, spendable balances now — not folded into eWallet.
  rewardPointsToRedeem?: number; // points count
  referralCreditAmt?: number;    // ₹
}

/**
 * Pure extraction of completePayment's payload-building math (everything
 * before the actual POST) — used both by completePayment itself below AND
 * by the async Payment Machine flow (usePosPayment.ts), which needs the
 * exact same PaymentPayload but must NOT post it immediately: it has to
 * wait for the provider to confirm before anything is recorded. Keeping
 * this in one place means the two flows can never silently drift apart on
 * how gross/discount/paid/due or the methods map get computed.
 */
export function buildPaymentPayload(params: CompletePaymentParams): {
  payload: PaymentPayload;
  totalOwedThisTxn: number;
  methodLabel: string;
} {
  const {
    appointmentId, clientId, salonId,
    grandTotal, subtotal, manualDiscountAmt,
    alreadyPaidAmount, eWalletAmt, couponDiscount, couponApplied,
    paymentMode, singleMethod, splitEntries, partialAmtInput,
    useEWallet, applyMembershipWallet,
    membershipWalletRequested, applyMembershipDiscount, membershipDiscountPercentRequested, applyLoyaltyDiscount,
    taxBreakdown, rewardPointsToRedeem, referralCreditAmt,
    includeGst,
  } = params;

  // gross_amount = pre-discount subtotal so the backend can compute:
  //   net = gross - discount_amount, due = net - paid = 0
  const payloadGross    = (subtotal && subtotal > grandTotal) ? subtotal : grandTotal;
  const payloadDiscount = (manualDiscountAmt || 0) + couponDiscount;

  const remainingDue  = Math.max(0, grandTotal - alreadyPaidAmount);
  // includeClearDue/priorDueAmt intentionally NOT folded in here — callers
  // that need prior-due clearing (completePayment) add it via amountToCharge
  // themselves before methods are built; the Payment Machine flow never
  // offers "clear prior due" in the same step, so this only ever needs
  // remainingDue for it. Mirrors params.includeClearDue/priorDueAmt being
  // absent from any single-method POS flow's inputs.
  const amountToCharge = params.includeClearDue ? remainingDue + params.priorDueAmt : remainingDue;

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

  const eWalletContribution = useEWallet ? eWalletAmt : 0;
  const totalOwedThisTxn = remainingDue + eWalletContribution;

  const totalPaid    = Object.values(methods).reduce((a, b) => a + b, 0);
  const currentCharge = Math.min(totalPaid, totalOwedThisTxn);
  const newDue        = Math.max(0, parseFloat((totalOwedThisTxn - currentCharge).toFixed(2)));
  const methodLabel   = buildMethodLabel(paymentMode, singleMethod, methods);

  const payload = {
    salon_id:         salonId || undefined,
    appointment_id:   appointmentId,
    client_id:        (clientId && isRealId(clientId)) ? clientId : undefined,
    gross_amount:     payloadGross,
    discount_amount:  alreadyPaidAmount > 0 ? 0 : payloadDiscount,
    manual_discount_amount: alreadyPaidAmount > 0 ? 0 : (manualDiscountAmt || 0),
    ewallet_used:     useEWallet ? eWalletAmt : 0,
    net_amount:       grandTotal,
    paid_amount:      currentCharge,
    due_amount:       newDue,
    coupon_code:      alreadyPaidAmount > 0 ? undefined : (couponApplied || undefined),
    payment_method:   methodLabel,
    split_details:    methods,
    status:           (newDue > 0 ? "partial" : "completed") as "partial" | "completed",
    apply_membership_wallet: !!applyMembershipWallet,
    membership_wallet_requested: applyMembershipWallet ? membershipWalletRequested : undefined,
    apply_membership_discount: !!applyMembershipDiscount,
    membership_discount_percent_requested: applyMembershipDiscount ? membershipDiscountPercentRequested : undefined,
    apply_loyalty_discount: !!applyLoyaltyDiscount,
    tax_breakdown: taxBreakdown && taxBreakdown.length > 0 ? taxBreakdown : undefined,
    reward_points_used: rewardPointsToRedeem || undefined,
    referral_credit_used: referralCreditAmt || undefined,
    include_gst: includeGst,
  };

  return { payload, totalOwedThisTxn, methodLabel };
}

/**
 * Pure extraction of completePayment's post-payment Redux patch — reused by
 * the Payment Machine success path (AppointmentModal, once the backend
 * confirms and the payment record is fetched), which needs the exact same
 * "prefer the server's saved figures over our local guess" reconciliation
 * completePayment already does, just triggered from a poll/webhook instead
 * of a direct POST response.
 */
export function buildPaymentStatusPatch(
  savedPayment: any,
  params: CompletePaymentParams,
  methodLabel: string,
  fallbackPayload: PaymentPayload,
) {
  const finalDue  = savedPayment?.due_amount  != null ? Number(savedPayment.due_amount)  : (fallbackPayload.due_amount ?? 0);
  const finalPaid = savedPayment?.paid_amount != null ? Number(savedPayment.paid_amount) : (fallbackPayload.paid_amount ?? 0);
  const finalStatus: "paid" | "partial" = finalDue > 0 ? "partial" : "paid";
  const referralDiscountApplied = savedPayment?.referral_discount_applied != null
    ? Number(savedPayment.referral_discount_applied) : 0;

  return {
    id: String(params.appointmentId),
    status: finalStatus,
    payingNow: params.alreadyPaidAmount + finalPaid,
    dueAmount: finalDue,
    grandTotal: params.grandTotal,
    paymentMode: methodLabel,
    gstAmount: params.gstAmount,
    taxBreakdown: params.taxBreakdown,
    couponDiscount: params.couponDiscount > 0 ? params.couponDiscount : undefined,
    couponCode: params.couponDiscount > 0 ? params.couponApplied : undefined,
    referralDiscount: referralDiscountApplied > 0 ? referralDiscountApplied : undefined,
    ewalletUsed: savedPayment?.ewallet_used != null ? Number(savedPayment.ewallet_used) : (params.useEWallet ? params.eWalletAmt : 0),
    membershipWalletUsed: savedPayment?.membership_wallet_used != null ? Number(savedPayment.membership_wallet_used) : undefined,
    membershipDiscountUsed: savedPayment?.membership_discount_used != null ? Number(savedPayment.membership_discount_used) : undefined,
    rewardPointsValue: savedPayment?.reward_points_value != null ? Number(savedPayment.reward_points_value) : undefined,
    referralCreditUsed: savedPayment?.referral_credit_used != null ? Number(savedPayment.referral_credit_used) : (params.referralCreditAmt || undefined),
    splitDetails: savedPayment?.split_details ?? fallbackPayload.split_details,
  };
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
    const { appointmentId, clientId, salonId, includeClearDue, priorDueAmt, selectedDueIds } = params;

    setIsProcessing(true);
    setPayError(null);

    try {
      const { payload: builtPayload, methodLabel } = buildPaymentPayload(params);

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
      const result: any = await dispatch(postPaymentThunk(builtPayload));

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
      const finalDue     = savedPayment?.due_amount != null ? Number(savedPayment.due_amount) : builtPayload.due_amount;
      // Set only when the referee's welcome reward couldn't apply as an
      // instant discount (bill below min_bill_amount) and was credited to
      // their eWallet instead — see payments.service.ts.
      const referralWalletCredited = savedPayment?.referral_wallet_credited != null
        ? Number(savedPayment.referral_wallet_credited) : 0;
      if (referralWalletCredited > 0) {
        showSuccess(`Referral reward of ${formatAmount(referralWalletCredited)} added to client's eWallet`);
      }

      dispatch(patchPaymentStatus(buildPaymentStatusPatch(savedPayment, params, methodLabel, builtPayload)));

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
