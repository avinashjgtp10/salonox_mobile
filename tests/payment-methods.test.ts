import { api } from "@/services/api";
import { isNetworkOnline } from "@/services/networkStatus";
import { activePaymentMethods, paymentMethodNameProblem, paymentMethodsService } from "@/services/paymentMethods.service";
import { buildPaymentPayload } from "@/features/quickSale/utils/quickSalePayloads";
import type { BillTotals } from "@/features/quickSale/utils/calculations";
import { isStaffAllowedRoute } from "@/utils/routeResolver";
import type { AuthUser } from "@/types/auth";
import { paymentMethodLabel } from "@/utils/paymentMethodLabel";

jest.mock("@/services/api", () => ({ api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock("@/services/networkStatus", () => ({ isNetworkOnline: jest.fn(() => true) }));
const custom = { id: "custom", salon_id: "salon", name: "Bank transfer", is_active: true, created_at: "2026-11-10", updated_at: "2026-11-10" };
const builtIns = [{ key: "cash" as const, name: "Cash", is_active: false }, { key: "card" as const, name: "Card", is_active: true }, { key: "upi" as const, name: "UPI", is_active: true }];
beforeEach(() => { jest.clearAllMocks(); jest.mocked(isNetworkOnline).mockReturnValue(true); });

it("shares the web endpoints and lists inactive methods only for management", async () => {
  jest.mocked(api.get).mockImplementation(async url => ({ data: { data: String(url).endsWith("built-in") ? builtIns : [custom] } }));
  expect(await paymentMethodsService.configuration()).toEqual({ custom: [custom], builtIns });
  expect(api.get).toHaveBeenCalledWith("/payment-methods/active", { signal: undefined });
  await paymentMethodsService.configuration(true);
  expect(api.get).toHaveBeenCalledWith("/payment-methods", { signal: undefined });
});

it("keeps custom names intact and excludes inactive/default methods unavailable to the salon", () => {
  expect(activePaymentMethods({ custom: [custom, { ...custom, id: "off", name: "Cheque", is_active: false }], builtIns }, false).map(method => method.value)).toEqual(["card", "Bank transfer"]);
});

it.each(["  bank   TRANSFER ", "Cash", "wallet", "Other", "Bad+name", "bad\"name", "a".repeat(41)])("rejects duplicate, reserved or invalid name %s", name => {
  expect(paymentMethodNameProblem(name, [custom])).not.toBeNull();
});
it("allows renaming the same method with a case change", () => expect(paymentMethodNameProblem("BANK transfer", [custom], custom.id)).toBeNull());
it.each(["constructor", "__proto__", "toString"])("preserves custom name %s without object-property collisions", name => expect(paymentMethodLabel(name)).toBe(name));

it("creates, renames, deactivates and deletes configuration without writing any transactions", async () => {
  jest.mocked(api.post).mockResolvedValue({ data: { data: custom } });
  jest.mocked(api.put).mockResolvedValue({ data: { data: custom } });
  await paymentMethodsService.create("  Bank   transfer ");
  await paymentMethodsService.update(custom.id, { name: "Cheque", is_active: false });
  await paymentMethodsService.remove(custom.id);
  expect(api.post).toHaveBeenCalledWith("/payment-methods", { name: "Bank transfer" });
  expect(api.put).toHaveBeenCalledWith("/payment-methods/custom", { name: "Cheque", is_active: false });
  expect(api.delete).toHaveBeenCalledWith("/payment-methods/custom");
});

it("refuses offline writes rather than queuing duplicate operations", async () => {
  jest.mocked(isNetworkOnline).mockReturnValue(false);
  await expect(paymentMethodsService.create("Cheque")).rejects.toThrow("offline");
  await expect(paymentMethodsService.remove("custom")).rejects.toThrow("offline");
  expect(api.post).not.toHaveBeenCalled(); expect(api.delete).not.toHaveBeenCalled();
});

const paymentArgs = {
  appointmentId: "appointment", appliedCoupon: null, includeGst: false, isFullyPackageCoveredSale: false,
  notes: "", packageCatalogTotal: 0, pricingFlags: {}, selectedClientId: "client", salonId: "salon",
  totals: { grandTotal: 100, lineSubtotal: 100, overallDiscount: 0, couponDiscount: 0, taxBreakdown: [] } as unknown as BillTotals,
};
it("records the selected custom method instead of Cash", () => {
  const result = buildPaymentPayload({ ...paymentArgs, payment: { method: "Bank transfer", paidAmount: 100 } });
  expect(result.payment_method).toBe("Bank transfer");
  expect(result.split_details).toEqual({ "Bank transfer": 100 });
});
it("preserves custom split legs and their exact collected amounts", () => {
  const result = buildPaymentPayload({ ...paymentArgs, payment: { method: "split", paidAmount: 100, splitEntries: [{ method: "Bank transfer", amount: 70 }, { method: "card", amount: 30 }] } });
  expect(result.split_details).toEqual({ "Bank transfer": 70, Card: 30 });
});
it("gates the settings route using payment-method permissions", () => {
  const staff: AuthUser = { id: "staff", email: "staff@example.com", role: "staff", effective_permissions: {} };
  expect(isStaffAllowedRoute("payment-methods", staff)).toBe(false);
  expect(isStaffAllowedRoute("payment-methods", { ...staff, effective_permissions: { view_settings_payment_methods: true } })).toBe(true);
});
