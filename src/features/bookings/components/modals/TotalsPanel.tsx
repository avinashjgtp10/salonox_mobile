import React from "react";
import "../../styles/NewAppointmentModal.scss";

interface TotalsPanelProps {
  subtotal: number;
  serviceTotal: number;
  packageTotal: number;
  productTotal: number;
  membershipTotal: number;
  exCharges: number;
  discount: number;
  discountType: string;
  totalDiscount?: number;
  tip?: number;
  membershipCoverage?: number;
  membershipCoverageName?: string;
  newMembershipCoverage?: number;
}

const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal, serviceTotal, packageTotal, productTotal, membershipTotal,
  exCharges, discount, discountType, totalDiscount: totalDiscountProp, tip = 0,
  membershipCoverage = 0, membershipCoverageName, newMembershipCoverage = 0,
}) => {
  const discountVal = discountType === "Percentage (%)" ? (serviceTotal * discount) / 100 : discount;
  const totalDiscount = totalDiscountProp !== undefined ? totalDiscountProp : Math.min(discountVal, serviceTotal);
  const taxable = Math.max(0, subtotal - totalDiscount);
  const rawGrandTotal = taxable + exCharges + tip;
  const existingCoverage = Math.min(membershipCoverage, rawGrandTotal);
  const newCoverage      = Math.min(newMembershipCoverage, Math.max(0, rawGrandTotal - existingCoverage));
  const grandTotal = Math.max(0, rawGrandTotal - existingCoverage - newCoverage);

  // When buying a new membership: service is absorbed (free) and membership shows at net price
  // newCoverage = 2 × service_absorbed, so half gives the absorbed service amount
  const absorbed = newCoverage > 0 ? newCoverage / 2 : 0;
  const membershipNet = membershipTotal - absorbed;

  const rows = [
    // Service: show as "included" (covered by new membership) or normal
    ...(serviceTotal > 0 ? [{
      label: absorbed > 0 ? "Service (incl. in membership)" : "Service",
      value: `₹${serviceTotal.toFixed(2)}`,
      color: absorbed > 0 ? "text-muted" : "",
      bold: false,
    }] : []),
    ...(packageTotal    > 0 ? [{ label: "Package",    value: `₹${packageTotal.toFixed(2)}`,    color: "", bold: false }] : []),
    ...(productTotal    > 0 ? [{ label: "Product",    value: `₹${productTotal.toFixed(2)}`,    color: "", bold: false }] : []),
    // Membership: show net price (face value minus absorbed service)
    ...(membershipTotal > 0 ? [{
      label: absorbed > 0 ? "Membership (net)" : "Membership",
      value: `₹${(absorbed > 0 ? membershipNet : membershipTotal).toFixed(2)}`,
      color: "",
      bold: false,
    }] : []),
    // Subtotal only when no new membership coverage (otherwise the net breakdown is self-explanatory)
    ...(absorbed === 0 ? [{ label: "Subtotal", value: `₹${subtotal.toFixed(2)}`, color: "", bold: false }] : []),
    ...(totalDiscount  > 0 ? [{ label: "Discount",   value: `-₹${totalDiscount.toFixed(2)}`,  color: "text-danger", bold: false }] : []),
    ...(exCharges      > 0 ? [{ label: "Ex Charges", value: `₹${exCharges.toFixed(2)}`,       color: "", bold: false }] : []),
    ...(tip            > 0 ? [{ label: "Tip",         value: `₹${tip.toFixed(2)}`,             color: "", bold: false }] : []),
    ...(existingCoverage > 0 ? [{ label: membershipCoverageName ? `Credit (${membershipCoverageName})` : "Membership Credit", value: `-₹${existingCoverage.toFixed(2)}`, color: "text-success", bold: false }] : []),
    { label: "Grand Total", value: `₹${grandTotal.toFixed(2)}`, color: "", bold: true },
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
