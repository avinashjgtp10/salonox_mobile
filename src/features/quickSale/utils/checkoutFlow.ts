import type { PendingCheckoutPayment } from "@/features/quickSale/types";
import { getExpectedSaleRevenue, type BillTotals } from "@/features/quickSale/utils/calculations";
import { getActionError } from "@/features/quickSale/utils/errors";
import { amountsReconcile, formatCurrency } from "@/features/quickSale/utils/money";
import type { AppointmentMutationResponse, CreateAppointmentRequest } from "@/types/appointment";
import type { CreatePaymentRequest } from "@/types/payment";
import type { CheckoutSaleRequest, CreateSaleRequest, SaleDetail } from "@/types/sales";

/**
 * The Quick Sale checkout workflows, kept free of React so the money path can
 * be unit tested. Each workflow performs the API calls in order and reports
 * what happened; the screen decides how to present it.
 */

export type CheckoutReceiptParams = Record<string, string>;

export type CheckoutOutcome =
  /** Nothing was charged or saved; show the message and let the operator retry. */
  | { kind: "failed"; message: string }
  /**
   * The draft sale was checked out, but its saved state needs a human look
   * (e.g. a total mismatch). The cart is kept on screen for reference.
   */
  | { kind: "savedNeedsReview"; message: string; title: string }
  /**
   * Payment was recorded, but the sale could not be fully finalized. The
   * operator must follow up in Sales Summary and must not charge again.
   */
  | { kind: "paymentRecordedNeedsFollowUp"; message: string }
  /** Checkout finished. `receipt` is null when the backend returned no sale ID. */
  | { kind: "completed"; receipt: CheckoutReceiptParams | null; source: "appointment" | "draft" };

export type ActionResult<T> = { ok: true; value: T } | { error: unknown; ok: false };

export type DraftCheckoutDeps = {
  checkoutDraft: (saleId: string, payload: CheckoutSaleRequest) => Promise<ActionResult<SaleDetail>>;
  markPackageSessions: () => Promise<string | null>;
  updateDraft: (saleId: string, updates: CreateSaleRequest) => Promise<ActionResult<unknown>>;
};

export async function runDraftCheckout(
  {
    draftId,
    draftPayload,
    grandTotal,
    payment,
  }: {
    draftId: string;
    draftPayload: CreateSaleRequest;
    grandTotal: number;
    payment: PendingCheckoutPayment;
  },
  deps: DraftCheckoutDeps,
): Promise<CheckoutOutcome> {
  const updateResult = await deps.updateDraft(draftId, draftPayload);
  if (!updateResult.ok) {
    return { kind: "failed", message: getActionError(updateResult.error, "Unable to update this draft.") };
  }

  const checkoutResult = await deps.checkoutDraft(draftId, {
    amountPaid: grandTotal,
    paymentMethod: payment.method,
    splitEntries: payment.splitEntries,
  });
  if (!checkoutResult.ok) {
    return { kind: "failed", message: getActionError(checkoutResult.error, "Unable to complete checkout.") };
  }

  const completedSale = checkoutResult.value;

  // The backend independently recomputes and persists the sale total —
  // /pricing/calculate-totals stays the single source of truth for what
  // this bill SHOULD be, but if what actually got saved diverges from
  // that (a sign the two disagree on line totals/discounts), the sale
  // must not be presented as a normal success. Cent-based comparison
  // absorbs ordinary independent-rounding drift without masking a real
  // mismatch, which is always far larger than a single cent.
  if (!amountsReconcile(completedSale.total, grandTotal)) {
    console.error("[Quick Sale] Backend/local total mismatch after draft checkout", {
      backendTotal: completedSale.total,
      localTotal: grandTotal,
      saleId: completedSale.id,
    });
    return {
      kind: "savedNeedsReview",
      message: `Checkout was saved, but the total differs from the amount shown. Check Sales Summary for sale ${completedSale.id}. Do not collect payment again.`,
      title: "Sale total needs review",
    };
  }

  const packageWarning = await deps.markPackageSessions();
  if (packageWarning) {
    return {
      kind: "savedNeedsReview",
      message: `${packageWarning}\nSale: ${completedSale.id}`,
      title: "Package sessions need review",
    };
  }

  return {
    kind: "completed",
    receipt: completedSale.id
      ? {
          amountPaid: String(completedSale.amountPaid || grandTotal),
          paymentMethod: payment.method,
          saleId: completedSale.id,
          total: String(completedSale.total || grandTotal),
        }
      : null,
    source: "draft",
  };
}

export type AppointmentCheckoutDeps = {
  checkoutAppointment: (appointmentId: string) => Promise<Pick<AppointmentMutationResponse, "saleId">>;
  createAppointment: (payload: CreateAppointmentRequest) => Promise<Pick<AppointmentMutationResponse, "appointment">>;
  /** Errors thrown here propagate to the caller: nothing has been charged yet. */
  createPayment: (payload: CreatePaymentRequest) => Promise<unknown>;
  /** Resolves null when the finalized sale could not be fetched. */
  fetchSaleTotal: (saleId: string) => Promise<number | null>;
  markPackageSessions: (appointmentId: string) => Promise<string | null>;
  onPaymentRecorded: () => void;
};

export async function runAppointmentCheckout(
  {
    appointmentPayload,
    buildPaymentPayload,
    payment,
    totals,
  }: {
    appointmentPayload: CreateAppointmentRequest;
    buildPaymentPayload: (appointmentId: string) => CreatePaymentRequest;
    payment: PendingCheckoutPayment;
    totals: BillTotals;
  },
  deps: AppointmentCheckoutDeps,
): Promise<CheckoutOutcome> {
  let appointmentId: string;
  try {
    const created = await deps.createAppointment(appointmentPayload);
    appointmentId = created.appointment.id;
  } catch (error) {
    return {
      kind: "failed",
      message: error instanceof Error ? error.message : "Unable to create appointment.",
    };
  }

  const paymentBody = buildPaymentPayload(appointmentId);
  await deps.createPayment(paymentBody);
  deps.onPaymentRecorded();

  // Web parity: a partial payment (due_amount > 0) only creates the
  // payment record. Checkout is a separate step that only happens once
  // the full amount has been collected.
  if (paymentBody.status !== "completed") {
    return {
      kind: "paymentRecordedNeedsFollowUp",
      message: `${formatCurrency(paymentBody.paid_amount)} collected. ${formatCurrency(paymentBody.due_amount)} remains due for this appointment.`,
    };
  }

  let saleId: string | undefined;
  try {
    ({ saleId } = await deps.checkoutAppointment(appointmentId));
  } catch (checkoutError) {
    // Payment already succeeded — do not report this as a payment
    // failure. There is no retry-checkout surface yet, so we log for
    // diagnosis and tell the operator where to follow up.
    console.error("[Quick Sale] Checkout failed after a successful payment", {
      appointmentId,
      message: checkoutError instanceof Error ? checkoutError.message : "Unknown checkout error",
    });
    return {
      kind: "paymentRecordedNeedsFollowUp",
      message: "The payment was saved, but the sale could not be finalized automatically. Check Sales Summary for this client to finish it.",
    };
  }

  // Appointment totals may represent the amount before payment-layer
  // benefits such as membership discounts, wallets, package coverage,
  // rewards, or referral credit. Verify the finalized sale/invoice total
  // instead so valid benefits do not produce a false mismatch.
  let finalizedSaleTotal: number | null = null;
  if (saleId) {
    finalizedSaleTotal = await deps.fetchSaleTotal(saleId);
    if (finalizedSaleTotal === null) {
      console.warn("[Quick Sale] Unable to verify finalized sale total", { appointmentId, saleId });
    }
  }

  // sales.total_amount is RECOGNIZED REVENUE, not what the client handed
  // over. payments.service.ts deliberately subtracts membership wallet and
  // membership discount from it (that money was already booked as revenue
  // when the membership was sold) but deliberately does NOT subtract
  // eWallet, reward points or referral credit — those were never counted as
  // revenue on top-up, only when spent. net_amount, by contrast, is net of
  // all of them. Comparing the two directly reported a false mismatch on
  // every sale that redeemed a wallet, points or referral credit, and
  // refused to finalize a perfectly valid sale. Add those three back so
  // both sides of the comparison mean the same thing.
  const expectedSaleTotal = getExpectedSaleRevenue(totals);

  if (finalizedSaleTotal !== null && !amountsReconcile(finalizedSaleTotal, expectedSaleTotal)) {
    console.error("[Quick Sale] Backend/local total mismatch after checkout", {
      appointmentId,
      backendTotal: finalizedSaleTotal,
      expectedSaleTotal,
      localNetAmount: paymentBody.net_amount,
      saleId,
    });
    return {
      kind: "paymentRecordedNeedsFollowUp",
      message: `Payment and checkout were saved, but the sale total needs review. Expected ${formatCurrency(expectedSaleTotal)}, saved ${formatCurrency(finalizedSaleTotal)}. Check Sales Summary for sale ${saleId}. Do not collect payment again.`,
    };
  }

  const packageWarning = await deps.markPackageSessions(appointmentId);
  if (packageWarning) {
    return {
      kind: "paymentRecordedNeedsFollowUp",
      message: `${packageWarning}\nAppointment: ${appointmentId}`,
    };
  }

  return {
    kind: "completed",
    receipt: saleId
      ? {
          amountPaid: String(totals.grandTotal),
          appointmentId,
          paymentMethod: payment.method,
          saleId,
          total: String(totals.grandTotal),
        }
      : null,
    source: "appointment",
  };
}
