import { formatReportValue } from "@/features/reports/report-data";
import { computeBillRoundOff } from "@/utils/billRoundOff";

jest.mock("@/utils/receipt", () => ({ formatInvoiceNumber: (value: unknown) => value }));
jest.mock("@/utils/dateTime", () => ({ formatAppDateTime: (value: unknown) => String(value) }));

describe("bill round off (web billBreakdown parity)", () => {
  // Real invoices from the Yesterday revenue check (INV-00349..351).
  it.each([
    [10065, 1006.5, 11072, 0.5],
    [500, 50, 550, 0],
    [7999, 799.9, 8799, 0.1],
  ])("subtotal %d + tax %d billed as %d rounds off by %d", (subtotal, tax, total, expected) => {
    expect(computeBillRoundOff({ subtotal, legacyTaxAmount: tax, grandTotal: total })).toBe(expected);
  });

  it("uses exclusive per-tax rows over the legacy amount and ignores inclusive tax", () => {
    expect(computeBillRoundOff({
      subtotal: 1000,
      legacyTaxAmount: 999,
      taxBreakdown: [{ amount: 90, inclusive: false }, { amount: 50, inclusive: true }],
      grandTotal: 1090,
    })).toBe(0);
  });

  it("shows a negative round off and nets wallet redemptions", () => {
    expect(computeBillRoundOff({ subtotal: 100, legacyTaxAmount: 18.4, grandTotal: 118 })).toBe(-0.4);
    expect(computeBillRoundOff({ subtotal: 500, membershipWalletUsed: 500, grandTotal: 0 })).toBe(0);
  });
});

describe("report money formatting", () => {
  const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  it("formats money fields the web shows with formatAmount", () => {
    expect(formatReportValue("totalGst", 1856.4)).toBe(money(1856.4));
    expect(formatReportValue("billAverage", 6807)).toBe(money(6807));
    expect(formatReportValue("totalTip", 0)).toBe(money(0));
    expect(formatReportValue("totalSale", "20421.00")).toBe(money(20421));
  });

  it("keeps counts and points as plain numbers", () => {
    expect(formatReportValue("invoicesWithTax", 3)).toBe("3");
    expect(formatReportValue("pointsEarned", 120)).toBe("120");
    expect(formatReportValue("totalBill", 3)).toBe("3");
    expect(formatReportValue("daysSinceLastSale", 12)).toBe("12");
  });
});
