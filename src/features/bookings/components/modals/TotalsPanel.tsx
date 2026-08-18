import React from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { TaxBreakdownEntry } from "../../utils/totalsUtils";
import "../../styles/AppointmentModal.scss";

interface TotalsPanelProps {
  subtotal: number;
  /** Display-only Subtotal with membership-wallet-covered amounts netted out
   *  (see pricing.engine.ts's BillTotalsResult doc comment) — falls back to
   *  `subtotal` when omitted. Never affects Grand Total/Amount to Pay. */
  displaySubtotal?: number;
  catalogTotal?: number; // pre-item-discount total — compare to subtotal for itemDiscountTotal
  itemDiscountTotal?: number; // ₹ saved by per-row "Disc %" (Services & Items), separate from the bill-level discount below
  serviceTotal: number;
  packageTotal: number;
  productTotal: number;
  membershipTotal: number;
  exCharges: number;
  discount: number;
  discountType: string;
  manualDiscount?: number; // bill-level "Bill Discount" only, excludes coupon
  couponDiscount?: number;
  couponCode?: string;
  /** First-bill referral welcome discount (see referralDiscountPreview in
   * AppointmentModal.tsx) — already folded into grandTotal by the backend,
   * but wasn't broken out as its own line here, so the gap between Subtotal
   * and Grand Total looked unexplained whenever it applied. */
  referralDiscount?: number;
  /** Discount given by a percentage/loyalty membership — also already folded
   * into grandTotal by the backend (a genuine pre-tax price reduction, unlike
   * membershipWalletUsed below which is a post-tax redemption), broken out
   * the same way referralDiscount is just above. */
  membershipDiscountUsed?: number;
  totalDiscount?: number;
  gstAmount?: number;
  taxBreakdown?: TaxBreakdownEntry[];
  /** Staff Tip — added into Grand Total/Amount to Pay only when
   *  addTipToSalon is checked (see withCharges below); otherwise display/
   *  record-only, shown as its own row so the tip given to staff is
   *  recorded and visible on the receipt/summary. */
  tip?: number;
  /** "Add Tip to Salon" state — checked: tip counts toward Grand Total,
   *  staff paid out separately outside this transaction. Unchecked
   *  (default): tip passes straight to staff, never part of the bill.
   *  Read-only here — toggled via PaymentPanel's own checkbox, not this
   *  panel; this just reflects the current state in the Staff Tip row. */
  addTipToSalon?: boolean;
  // ₹ drawn from the client's balances for this bill — each shown as its own
  // deduction line so the discount is visible in the summary itself, not just
  // implied by a smaller "Due" figure with no line item explaining where it
  // went. rewardPointsValue is the ₹ equivalent of the points being redeemed.
  membershipWalletUsed?: number;
  ewalletUsed?: number;
  rewardPointsValue?: number;
  referralCreditUsed?: number;
  alreadyPaid?: number;
  // Some callers pass a LIVE preview here (already-paid + whatever amount is
  // currently typed into the Pay field, before it's actually confirmed) —
  // labeling that row plain "Paid" reads as a statement of settled fact and
  // directly contradicts a "Paid ₹X" figure shown elsewhere on the same
  // screen from the real historical amount. Callers doing a live preview
  // must override this to something that says so.
  paidLabel?: string;
  dueAmount?: number;
  packageServiceCount?: number;
  // Authoritative fully-reduced total (Bill Discount, Extra Charges,
  // Referral Discount, Membership Wallet, eWallet, Reward Points, Referral
  // Credit ALL already applied — Staff Tip is NEVER included) + the rounding
  // adjustment that produced it,
  // straight from computeTotals() — passed by callers that already ran it
  // (avoids this panel re-deriving its own total and risking drift from the
  // figure actually used for payment). Falls back to a local (unrounded) calc
  // for any older caller that doesn't pass these yet. There is no longer a
  // separate "Amount to Pay" concept distinct from this — they're the same number.
  grandTotal?: number;
  roundOff?: number;
}

const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal, displaySubtotal, catalogTotal, itemDiscountTotal = 0,
  serviceTotal, packageTotal, productTotal, membershipTotal,
  exCharges, discount, discountType, manualDiscount, couponDiscount = 0, couponCode,
  referralDiscount = 0, membershipDiscountUsed = 0,
  totalDiscount: totalDiscountProp,
  gstAmount = 0, taxBreakdown = [], tip = 0, addTipToSalon = false,
  membershipWalletUsed = 0,
  ewalletUsed = 0, rewardPointsValue = 0, referralCreditUsed = 0,
  alreadyPaid = 0, paidLabel = "Paid", dueAmount = 0, packageServiceCount = 0,
  grandTotal: grandTotalProp, roundOff: roundOffProp,
}) => {
  const { currencySymbol } = useCurrency();
  const discountVal = discountType === "Percentage (%)" ? (serviceTotal * discount) / 100 : discount;
  const totalDiscount = totalDiscountProp !== undefined ? totalDiscountProp : Math.min(discountVal, serviceTotal);
  // Prefer the granular manual/coupon split when the caller provides it — falls
  // back to the single blended totalDiscount line for older callers.
  const hasGranularDiscount = manualDiscount !== undefined;
  // Svc Discount (manualDiscount) is a POST-tax deduction now (see
  // pricing.engine.ts computeBillTotals) — it no longer reduces the pre-tax
  // taxable base, only coupon discount does. The older blended totalDiscount
  // fallback (no live caller passes just this — AppointmentModal always
  // supplies the granular split) can't distinguish Svc Discount from coupon,
  // so it's left subtracting pre-tax as an approximation for a path nothing
  // currently exercises.
  const preTaxDiscount = hasGranularDiscount ? couponDiscount : totalDiscount;
  const taxable = Math.max(0, subtotal - preTaxDiscount);
  const billTotalBeforeSvcDiscount = taxable + gstAmount;
  const svcDiscountAmount = hasGranularDiscount ? (manualDiscount ?? 0) : 0;
  const afterSvcDiscount = Math.max(0, billTotalBeforeSvcDiscount - svcDiscountAmount);
  // Extra Charges are excluded from the Bill Discount base above — added
  // here, after the discount, matching pricing.engine.ts. Staff Tip (`tip`)
  // is only added when addTipToSalon is checked — see the same engine.
  const withCharges = afterSvcDiscount + exCharges + (addTipToSalon ? tip : 0);
  // Referral Discount is a POST-tax, POST-Svc-Discount deduction — subtracted
  // here (not folded into the pre-tax coupon discount), matching the engine.
  // Never itself rounded — only the fully-reduced total below is.
  const preRedemptionTotal = Math.max(0, withCharges - referralDiscount);
  // Every remaining deduction (membership wallet/eWallet/reward points/
  // referral credit) happens here, still unrounded — rounding happens exactly
  // once, at the very end of the whole waterfall, not partway through.
  const rawFinalTotal = Math.max(0, preRedemptionTotal
    - membershipWalletUsed - ewalletUsed - rewardPointsValue - referralCreditUsed);
  const grandTotal = grandTotalProp !== undefined ? grandTotalProp : Math.round(rawFinalTotal);
  const roundOff = roundOffProp !== undefined ? roundOffProp : grandTotal - rawFinalTotal;

  // Only exclusive taxes add to the amount due — inclusive ones are already
  // inside the item price, shown here just as a breakdown of what it contains.
  const exclusiveTaxRows = taxBreakdown.filter((t) => !t.inclusive && t.amount > 0);
  const inclusiveTaxRows = taxBreakdown.filter((t) => t.inclusive && t.amount > 0);

  // Combine same-exclusivity tax rows into one line, rate/amount summed so a
  // genuine 2.5%+2.5% split still reads as a single correct 5% line. The
  // label uses the salon's own configured tax name(s) — e.g. a single "GST"
  // row stays "GST", while genuinely separate CGST + SGST rows join as
  // "CGST + SGST" — rather than always forcing the CGST+SGST label onto
  // whatever single tax the salon actually configured.
  const combineTaxRows = (rows: TaxBreakdownEntry[]) => {
    if (rows.length === 0) return null;
    const amount = rows.reduce((s, t) => s + t.amount, 0);
    const rate = rows.reduce((s, t) => s + t.rate, 0);
    const isIgst = rows.some((t) => t.name.toUpperCase().includes("IGST"));
    const distinctNames = Array.from(new Set(rows.map((t) => t.name)));
    const label = isIgst ? "IGST" : distinctNames.join(" + ");
    return { label, amount, rate };
  };
  const combinedExclusiveTax = combineTaxRows(exclusiveTaxRows);
  const combinedInclusiveTax = combineTaxRows(inclusiveTaxRows);
  // "Total after GST" = the taxable amount plus tax actually added to the
  // bill (exclusive tax only — inclusive tax is already inside `subtotal`
  // and doesn't add anything extra) — the standard invoice checkpoint
  // between the tax breakdown and Extra Charges/Round Off/Grand Total.
  const totalAfterGst = taxable + (combinedExclusiveTax?.amount ?? 0);

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
    { label: "Subtotal", value: `${currencySymbol}${(displaySubtotal ?? subtotal).toFixed(2)}`, color: "" },
    ...(hasGranularDiscount
      ? (couponDiscount > 0 ? [{ label: `Coupon${couponCode ? ` (${couponCode})` : ""}`, value: `-${currencySymbol}${couponDiscount.toFixed(2)}`, color: "text-danger" }] : [])
      : (totalDiscount > 0 ? [{ label: "Discount", value: `-${currencySymbol}${totalDiscount.toFixed(2)}`, color: "text-danger" }] : [])),
    ...(membershipDiscountUsed > 0 ? [{ label: "Membership Discount", value: `-${currencySymbol}${membershipDiscountUsed.toFixed(2)}`, color: "text-danger" }] : []),
    ...(combinedExclusiveTax ? [{ label: `${combinedExclusiveTax.label} (${combinedExclusiveTax.rate}%)`, value: `+${currencySymbol}${combinedExclusiveTax.amount.toFixed(2)}`, color: "" }] : []),
    ...(combinedInclusiveTax ? [{ label: `${combinedInclusiveTax.label} (${combinedInclusiveTax.rate}%, incl.)`, value: `${currencySymbol}${combinedInclusiveTax.amount.toFixed(2)}`, color: "text-secondary" }] : []),
    ...(combinedExclusiveTax ? [{ label: "Total after GST", value: `${currencySymbol}${totalAfterGst.toFixed(2)}`, color: "", bold: true }] : []),
    ...(exCharges     > 0 ? [{ label: "Ex Charges", value: `${currencySymbol}${exCharges.toFixed(2)}`,      color: "" }] : []),
    // Bill Discount is a POST-tax deduction now — applied to the bill total
    // after GST/Extra Charges (see pricing.engine.ts computeBillTotals), so
    // it's shown here, below those rows, instead of up by Subtotal/Coupon.
    ...(hasGranularDiscount && (manualDiscount ?? 0) > 0
      ? [{ label: "Bill Discount", value: `-${currencySymbol}${(manualDiscount ?? 0).toFixed(2)}`, color: "text-danger" }]
      : []),
    // Referral Discount is a POST-tax, POST-Svc-Discount deduction now —
    // applied here, not folded into the pre-tax coupon discount above.
    ...(referralDiscount > 0 ? [{ label: "Referral Discount", value: `-${currencySymbol}${referralDiscount.toFixed(2)}`, color: "text-danger" }] : []),
    ...(membershipWalletUsed > 0 ? [{ label: "Membership Wallet Used", value: `-${currencySymbol}${membershipWalletUsed.toFixed(2)}`, color: "text-success" }] : []),
    ...(ewalletUsed        > 0 ? [{ label: "eWallet Used",         value: `-${currencySymbol}${ewalletUsed.toFixed(2)}`,        color: "text-success" }] : []),
    ...(rewardPointsValue  > 0 ? [{ label: "Reward Points Used",   value: `-${currencySymbol}${rewardPointsValue.toFixed(2)}`,  color: "text-success" }] : []),
    ...(referralCreditUsed > 0 ? [{ label: "Referral Credit Used", value: `-${currencySymbol}${referralCreditUsed.toFixed(2)}`, color: "text-success" }] : []),
    ...(Math.abs(roundOff) >= 0.005
      ? [{ label: "Round Off", value: `${roundOff >= 0 ? "+" : "-"}${currencySymbol}${Math.abs(roundOff).toFixed(2)}`, color: "text-secondary" }]
      : []),
    { label: "Grand Total", value: `${currencySymbol}${grandTotal.toFixed(2)}`, color: "", bold: true },
    // Always identical to Grand Total now — the merge eliminated the separate
    // "gross bill before redemptions" concept (see plan doc). Kept as its own
    // row since callers/staff still expect an explicit "Amount to Pay" line.
    { label: "Amount to Pay", value: `${currencySymbol}${grandTotal.toFixed(2)}`, color: "", bold: true },
    ...(alreadyPaid > 0 ? [{ label: paidLabel,     value: `${currencySymbol}${alreadyPaid.toFixed(2)}`, color: "text-success",   bold: false }] : []),
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
        {/* Staff Tip stays its own footnote-style row, separate from the bill
            total above — whether that total already includes it (see
            withCharges) is controlled by the "Add Tip to Salon" checkbox in
            PaymentPanel, not here; this just reflects its current state. */}
        {tip > 0 && (
          <div className="d-flex justify-content-between align-items-center py-1 border-top mt-1 pt-2">
            <span className="text-secondary" style={{ fontSize: 12 }}>
              Staff Tip{addTipToSalon ? " (included above)" : ""}
            </span>
            <span className="fw-semibold text-secondary" style={{ fontSize: 12 }}>
              {currencySymbol}{tip.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TotalsPanel;
