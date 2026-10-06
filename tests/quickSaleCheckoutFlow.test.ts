import type { BillTotals } from "@/features/quickSale/utils/calculations";
import {
  runAppointmentCheckout,
  runDraftCheckout,
  type AppointmentCheckoutDeps,
  type DraftCheckoutDeps,
} from "@/features/quickSale/utils/checkoutFlow";
import type { CreateAppointmentRequest } from "@/types/appointment";
import type { CreatePaymentRequest } from "@/types/payment";
import type { CreateSaleRequest, SaleDetail } from "@/types/sales";

const totals: BillTotals = {
  appliedEWallet: 0, appliedMembershipDiscount: 0, appliedMembershipWallet: 0, appliedReferralCredit: 0,
  appliedRewardPointsValue: 0, couponDiscount: 0, exCharges: 0, grandTotal: 500, itemDiscountTotal: 0,
  lineSubtotal: 500, overallDiscount: 0, subtotal: 500, taxAmount: 0, taxableAmount: 500, roundOff: 0,
  tipAmount: 0, taxBreakdown: [],
};

const cashPayment = { method: "cash" as const };

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("runDraftCheckout", () => {
  const draftPayload = {} as CreateSaleRequest;
  const sale = (overrides: Partial<SaleDetail> = {}) =>
    ({ amountPaid: 500, id: "sale-1", total: 500, ...overrides }) as SaleDetail;

  const deps = (overrides: Partial<DraftCheckoutDeps> = {}): DraftCheckoutDeps => ({
    checkoutDraft: jest.fn(async () => ({ ok: true as const, value: sale() })),
    markPackageSessions: jest.fn(async () => null),
    updateDraft: jest.fn(async () => ({ ok: true as const, value: {} })),
    ...overrides,
  });

  const run = (d: DraftCheckoutDeps) =>
    runDraftCheckout({ draftId: "sale-1", draftPayload, grandTotal: 500, payment: cashPayment }, d);

  test("stops before checkout when the draft update fails", async () => {
    const d = deps({ updateDraft: jest.fn(async () => ({ error: { message: "Draft locked" }, ok: false as const })) });

    await expect(run(d)).resolves.toEqual({ kind: "failed", message: "Draft locked" });
    expect(d.checkoutDraft).not.toHaveBeenCalled();
  });

  test("falls back to a generic message when checkout fails without one", async () => {
    const d = deps({ checkoutDraft: jest.fn(async () => ({ error: undefined, ok: false as const })) });

    await expect(run(d)).resolves.toEqual({ kind: "failed", message: "Unable to complete checkout." });
  });

  test("charges the priced grand total with the chosen payment method", async () => {
    const d = deps();
    await run(d);

    expect(d.checkoutDraft).toHaveBeenCalledWith("sale-1", {
      amountPaid: 500,
      paymentMethod: "cash",
      splitEntries: undefined,
    });
  });

  test("flags a backend total mismatch for review and does not deduct package sessions", async () => {
    const d = deps({ checkoutDraft: jest.fn(async () => ({ ok: true as const, value: sale({ total: 450 }) })) });

    await expect(run(d)).resolves.toMatchObject({ kind: "savedNeedsReview", title: "Sale total needs review" });
    expect(d.markPackageSessions).not.toHaveBeenCalled();
  });

  test("tolerates one-cent rounding drift between backend and local totals", async () => {
    const d = deps({ checkoutDraft: jest.fn(async () => ({ ok: true as const, value: sale({ total: 500.01 }) })) });

    await expect(run(d)).resolves.toMatchObject({ kind: "completed" });
  });

  test("flags package-session failures for review", async () => {
    const d = deps({ markPackageSessions: jest.fn(async () => "Only 1 of 2 sessions confirmed.") });

    await expect(run(d)).resolves.toEqual({
      kind: "savedNeedsReview",
      message: "Only 1 of 2 sessions confirmed.\nSale: sale-1",
      title: "Package sessions need review",
    });
  });

  test("returns receipt params on success", async () => {
    await expect(run(deps())).resolves.toEqual({
      kind: "completed",
      receipt: { amountPaid: "500", paymentMethod: "cash", saleId: "sale-1", total: "500" },
      source: "draft",
    });
  });

  test("withholds the receipt when the backend returns no sale id", async () => {
    const d = deps({ checkoutDraft: jest.fn(async () => ({ ok: true as const, value: sale({ id: "" }) })) });

    await expect(run(d)).resolves.toEqual({ kind: "completed", receipt: null, source: "draft" });
  });
});

describe("runAppointmentCheckout", () => {
  const appointmentPayload = {} as CreateAppointmentRequest;
  const paymentBody = (overrides: Partial<CreatePaymentRequest> = {}): CreatePaymentRequest => ({
    appointment_id: "appt-1", due_amount: 0, gross_amount: 500, net_amount: 500, paid_amount: 500,
    payment_method: "Cash", status: "completed", ...overrides,
  });

  const deps = (overrides: Partial<AppointmentCheckoutDeps> = {}): AppointmentCheckoutDeps => ({
    checkoutAppointment: jest.fn(async () => ({ saleId: "sale-9" })),
    createAppointment: jest.fn(async () => ({ appointment: { id: "appt-1" } as never })),
    createPayment: jest.fn(async () => ({})),
    fetchSaleTotal: jest.fn(async () => 500),
    markPackageSessions: jest.fn(async () => null),
    onPaymentRecorded: jest.fn(),
    ...overrides,
  });

  const run = (d: AppointmentCheckoutDeps, body = paymentBody(), billTotals = totals) =>
    runAppointmentCheckout(
      { appointmentPayload, buildPaymentPayload: () => body, payment: cashPayment, totals: billTotals },
      d,
    );

  test("fails without charging when the appointment cannot be created", async () => {
    const d = deps({ createAppointment: jest.fn(async () => { throw new Error("Slot taken"); }) });

    await expect(run(d)).resolves.toEqual({ kind: "failed", message: "Slot taken" });
    expect(d.createPayment).not.toHaveBeenCalled();
  });

  test("propagates payment errors so nothing is reported as paid", async () => {
    const d = deps({ createPayment: jest.fn(async () => { throw new Error("Card declined"); }) });

    await expect(run(d)).rejects.toThrow("Card declined");
    expect(d.onPaymentRecorded).not.toHaveBeenCalled();
    expect(d.checkoutAppointment).not.toHaveBeenCalled();
  });

  test("records a partial payment without checking out", async () => {
    const d = deps();
    const outcome = await run(d, paymentBody({ due_amount: 200, paid_amount: 300, status: "partial" }));

    expect(outcome.kind).toBe("paymentRecordedNeedsFollowUp");
    expect(d.onPaymentRecorded).toHaveBeenCalledTimes(1);
    expect(d.checkoutAppointment).not.toHaveBeenCalled();
  });

  test("reports a follow-up, not a failure, when checkout fails after payment", async () => {
    const d = deps({ checkoutAppointment: jest.fn(async () => { throw new Error("timeout"); }) });

    await expect(run(d)).resolves.toMatchObject({ kind: "paymentRecordedNeedsFollowUp" });
  });

  test("compares the saved sale against recognized revenue, not net paid", async () => {
    const walletTotals = { ...totals, appliedEWallet: 100, grandTotal: 400 };

    await expect(run(deps(), paymentBody(), walletTotals)).resolves.toMatchObject({ kind: "completed" });
  });

  test("flags a saved sale total that does not match the bill", async () => {
    const d = deps({ fetchSaleTotal: jest.fn(async () => 420) });

    await expect(run(d)).resolves.toMatchObject({ kind: "paymentRecordedNeedsFollowUp" });
    expect(d.markPackageSessions).not.toHaveBeenCalled();
  });

  test("still completes when the finalized sale total cannot be fetched", async () => {
    const d = deps({ fetchSaleTotal: jest.fn(async () => null) });

    await expect(run(d)).resolves.toMatchObject({ kind: "completed" });
  });

  test("includes the appointment id in package-session warnings", async () => {
    const d = deps({ markPackageSessions: jest.fn(async () => "Deduction failed.") });

    await expect(run(d)).resolves.toEqual({
      kind: "paymentRecordedNeedsFollowUp",
      message: "Deduction failed.\nAppointment: appt-1",
    });
    expect(d.markPackageSessions).toHaveBeenCalledWith("appt-1");
  });

  test("returns receipt params on success", async () => {
    await expect(run(deps())).resolves.toEqual({
      kind: "completed",
      receipt: { amountPaid: "500", appointmentId: "appt-1", paymentMethod: "cash", saleId: "sale-9", total: "500" },
      source: "appointment",
    });
  });

  test("withholds the receipt and skips verification when checkout returns no sale id", async () => {
    const d = deps({ checkoutAppointment: jest.fn(async () => ({})) });

    await expect(run(d)).resolves.toEqual({ kind: "completed", receipt: null, source: "appointment" });
    expect(d.fetchSaleTotal).not.toHaveBeenCalled();
  });
});
