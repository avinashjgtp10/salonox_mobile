import type { PendingCheckoutPayment } from "@/features/quickSale/types";
import { getExpectedSaleRevenue, type BillTotals } from "@/features/quickSale/utils/calculations";
import { getActionError } from "@/features/quickSale/utils/errors";
import { amountsReconcile, formatCurrency } from "@/features/quickSale/utils/money";
import type { AppointmentMutationResponse, CreateAppointmentRequest } from "@/types/appointment";
import type { CreatePaymentRequest } from "@/types/payment";
import type { CheckoutSaleRequest, CreateSaleRequest, SaleDetail } from "@/types/sales";


export type CheckoutReceiptParams = Record<string, string>;

export type CheckoutOutcome =
  | { kind: "failed"; message: string }
  | { kind: "savedNeedsReview"; message: string; title: string }
  | { kind: "paymentRecordedNeedsFollowUp"; message: string }
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
  createPayment: (payload: CreatePaymentRequest) => Promise<unknown>;
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
    console.error("[Quick Sale] Checkout failed after a successful payment", {
      appointmentId,
      message: checkoutError instanceof Error ? checkoutError.message : "Unknown checkout error",
    });
    return {
      kind: "paymentRecordedNeedsFollowUp",
      message: "The payment was saved, but the sale could not be finalized automatically. Check Sales Summary for this client to finish it.",
    };
  }

  let finalizedSaleTotal: number | null = null;
  if (saleId) {
    finalizedSaleTotal = await deps.fetchSaleTotal(saleId);
    if (finalizedSaleTotal === null) {
      console.warn("[Quick Sale] Unable to verify finalized sale total", { appointmentId, saleId });
    }
  }

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
