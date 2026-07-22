import React from "react";
import { currencySymbol } from "../../utils/currency";
import type { TaxBreakdownEntry } from "../../utils/totalsUtils";
import "../../styles/AppointmentModal.scss";

interface TotalsPanelProps {
  subtotal: number;
  catalogTotal?: number; // pre-item-discount total — compare to subtotal for itemDiscountTotal
  itemDiscountTotal?: number; // ₹ saved by per-row "Disc %" (Services & Items), separate from the bill-level discount below
  serviceTotal: number;
  packageTotal: number;
  productTotal: number;
  membershipTotal: number;
  exCharges: number;
  discount: number;
  discountType: string;
  manualDiscount?: number; // bill-level "Svc Discount" only, excludes coupon
  couponDiscount?: number;
  couponCode?: string;
  /** First-bill referral welcome discount (see referralDiscountPreview in
   * AppointmentModal.tsx) — already folded into grandTotal by the backend,
   * but wasn't broken out as its own line here, so the gap between Subtotal
   * and Grand Total looked unexplained whenever it applied. */
  referralDiscount?: number;
  totalDiscount?: number;
  gstAmount?: number;
  taxBreakdown?: TaxBreakdownEntry[];
  tip?: number;
  // ₹ drawn from the client's balances for this bill — each shown as its own
  // deduction line so the discount is visible in the summary itself, not just
  // implied by a smaller "Due" figure with no line item explaining where it
  // went. rewardPointsValue is the ₹ equivalent of the points being redeemed.
  membershipWalletUsed?: number;
  ewalletUsed?: number;
  rewardPointsValue?: number;
  referralCreditUsed?: number;
  alreadyPaid?: number;
  dueAmount?: number;
  packageServiceCount?: number;
  // Authoritative rounded total + the adjustment that produced it, straight
  // from computeTotals() — passed by callers that already ran it (avoids this
  // panel re-deriving its own grandTotal and risking drift from the figure
  // actually used for payment). Falls back to a local (unrounded) calc for
  // any older caller that doesn't pass these yet.
  grandTotal?: number;
  roundOff?: number;
}

const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal, catalogTotal, itemDiscountTotal = 0,
  serviceTotal, packageTotal, productTotal, membershipTotal,
  exCharges, discount, discountType, manualDiscount, couponDiscount = 0, couponCode,
  referralDiscount = 0,
  totalDiscount: totalDiscountProp,
  gstAmount = 0, taxBreakdown = [], tip = 0, membershipWalletUsed = 0,
  ewalletUsed = 0, rewardPointsValue = 0, referralCreditUsed = 0,
  alreadyPaid = 0, dueAmount = 0, packageServiceCount = 0,
  grandTotal: grandTotalProp, roundOff: roundOffProp,
}) => {
  const discountVal = discountType === "Percentage (%)" ? (serviceTotal * discount) / 100 : discount;
  const totalDiscount = totalDiscountProp !== undefined ? totalDiscountProp : Math.min(discountVal, serviceTotal);
  const taxable = Math.max(0, subtotal - totalDiscount);
  const rawGrandTotal = taxable + gstAmount + exCharges;
  const grandTotal = grandTotalProp !== undefined ? grandTotalProp : Math.round(rawGrandTotal);
  const roundOff = roundOffProp !== undefined ? roundOffProp : grandTotal - rawGrandTotal;
  // Prefer the granular manual/coupon split when the caller provides it — falls
  // back to the single blended totalDiscount line for older callers.
  const hasGranularDiscount = manualDiscount !== undefined;

  // Only exclusive taxes add to the amount due — inclusive ones are already
  // inside the item price, shown here just as a breakdown of what it contains.
  const exclusiveTaxRows = taxBreakdown.filter((t) => !t.inclusive && t.amount > 0);
  const inclusiveTaxRows = taxBreakdown.filter((t) => t.inclusive && t.amount > 0);

  const rows = [
    ...(packageServiceCount > 0 ? [{ label: `📦 Package Service${packageServiceCount > 1 ? "s" : ""} (${packageServiceCount})`, value: `${currencySymbol}0`, color: "text-success" }] : []),
    ...(serviceTotal    > 0 ? [{ label: "Service",    value: `${currencySymbol}${serviceTotal.toFixed(2)}`,    color: "" }] : []),
    ...(packageTotal    > 0 ? [{ label: "Package",    value: `${currencySymbol}${packageTotal.toFixed(2)}`,    color: "" }] : []),
    ...(productTotal    > 0 ? [{ label: "Product",    value: `${currencySymbol}${productTotal.toFixed(2)}`,    color: "" }] : []),
    ...(membershipTotal > 0 ? [{ label: "Membership", value: `${currencySymbol}${membershipTotal.toFixed(2)}`, color: "" }] : []),
    // Item-level "Disc %" and the bill-level "Svc Discount"/coupon can both be
    // active at once and stack — broken out so it's clear how much came from each.
    ...(itemDiscountTotal > 0 && catalogTotal !== undefined
      ? [
          { label: "Items Total",   value: `${currencySymbol}${catalogTotal.toFixed(2)}`, color: "" },
          { label: "Item Discount", value: `-${currencySymbol}${itemDiscountTotal.toFixed(2)}`, color: "text-danger" },
        ]
      : []),
    { label: "Subtotal", value: `${currencySymbol}${subtotal.toFixed(2)}`, color: "" },
    ...(hasGranularDiscount
      ? [
          ...((manualDiscount ?? 0) > 0 ? [{ label: "Svc Discount", value: `-${currencySymbol}${(manualDiscount ?? 0).toFixed(2)}`, color: "text-danger" }] : []),
          ...(couponDiscount > 0 ? [{ label: `Coupon${couponCode ? ` (${couponCode})` : ""}`, value: `-${currencySymbol}${couponDiscount.toFixed(2)}`, color: "text-danger" }] : []),
        ]
      : (totalDiscount > 0 ? [{ label: "Discount", value: `-${currencySymbol}${totalDiscount.toFixed(2)}`, color: "text-danger" }] : [])),
    ...(referralDiscount > 0 ? [{ label: "Referral Discount", value: `-${currencySymbol}${referralDiscount.toFixed(2)}`, color: "text-danger" }] : []),
    ...exclusiveTaxRows.map((t) => ({ label: `${t.name} (${t.rate}%)`, value: `${currencySymbol}${t.amount.toFixed(2)}`, color: "" })),
    ...inclusiveTaxRows.map((t) => ({ label: `${t.name} (${t.rate}%, incl.)`, value: `${currencySymbol}${t.amount.toFixed(2)}`, color: "text-secondary" })),
    ...(exCharges     > 0 ? [{ label: "Ex Charges", value: `${currencySymbol}${exCharges.toFixed(2)}`,      color: "" }] : []),
    ...(Math.abs(roundOff) >= 0.005
      ? [{ label: "Round Off", value: `${roundOff >= 0 ? "+" : "-"}${currencySymbol}${Math.abs(roundOff).toFixed(2)}`, color: "text-secondary" }]
      : []),
    { label: "Grand Total", value: `${currencySymbol}${grandTotal.toFixed(2)}`, color: "", bold: true },
    ...(membershipWalletUsed > 0 ? [{ label: "Membership Wallet Applied", value: `-${currencySymbol}${membershipWalletUsed.toFixed(2)}`, color: "text-success" }] : []),
    ...(ewalletUsed        > 0 ? [{ label: "eWallet Applied",         value: `-${currencySymbol}${ewalletUsed.toFixed(2)}`,        color: "text-success" }] : []),
    ...(rewardPointsValue  > 0 ? [{ label: "Reward Points Applied",   value: `-${currencySymbol}${rewardPointsValue.toFixed(2)}`,  color: "text-success" }] : []),
    ...(referralCreditUsed > 0 ? [{ label: "Referral Credit Applied", value: `-${currencySymbol}${referralCreditUsed.toFixed(2)}`, color: "text-success" }] : []),
    ...(tip         > 0 ? [{ label: "Tip (Staff)", value: `${currencySymbol}${tip.toFixed(2)}`,        color: "text-secondary" }] : []),
    ...(alreadyPaid > 0 ? [{ label: "Paid",        value: `${currencySymbol}${alreadyPaid.toFixed(2)}`, color: "text-success",   bold: false }] : []),
    ...(dueAmount   > 0 ? [{ label: "Due",          value: `${currencySymbol}${dueAmount.toFixed(2)}`,  color: "text-danger",    bold: false }] : []),
  ];

  return (
    <div className="card border rounded-3 shadow-sm" style={{ minWidth: 220 }}>
      <div className="card-body p-3">
        <div className="text-uppercase fw-bold text-muted mb-2" style={{ fontSize: 10, letterSpacing: "0.5px" }}>Summary</div>
        {rows.map(({ label, value, color, bold }) => (
          <div key={label} className={`d-flex justify-content-between align-items-center py-1${bold ? " border-top mt-1 pt-2" : ""}`}>
            <span className={`${bold ? "fw-bold" : "text-secondary"}`} style={{ fontSize: bold ? 13 : 12 }}>{label}</span>
            <span className={`fw-semibold ${color}`} style={{ fontSize: bold ? 14 : 12 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TotalsPanel;
