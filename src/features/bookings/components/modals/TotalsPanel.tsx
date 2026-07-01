import React from "react";
import { currencySymbol } from "../../utils/currency";
import "../../styles/AppointmentModal.scss";

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
  alreadyPaid?: number;
  dueAmount?: number;
  packageServiceCount?: number;
}

const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal, serviceTotal, packageTotal, productTotal, membershipTotal,
  exCharges, discount, discountType, totalDiscount: totalDiscountProp, tip = 0,
  alreadyPaid = 0, dueAmount = 0, packageServiceCount = 0,
}) => {
  const discountVal = discountType === "Percentage (%)" ? (serviceTotal * discount) / 100 : discount;
  const totalDiscount = totalDiscountProp !== undefined ? totalDiscountProp : Math.min(discountVal, serviceTotal);
  const taxable = Math.max(0, subtotal - totalDiscount);
  const grandTotal = taxable + exCharges;

  const rows = [
    ...(packageServiceCount > 0 ? [{ label: `📦 Package Service${packageServiceCount > 1 ? "s" : ""} (${packageServiceCount})`, value: `${currencySymbol}0`, color: "text-success" }] : []),
    ...(serviceTotal    > 0 ? [{ label: "Service",    value: `${currencySymbol}${serviceTotal.toFixed(2)}`,    color: "" }] : []),
    ...(packageTotal    > 0 ? [{ label: "Package",    value: `${currencySymbol}${packageTotal.toFixed(2)}`,    color: "" }] : []),
    ...(productTotal    > 0 ? [{ label: "Product",    value: `${currencySymbol}${productTotal.toFixed(2)}`,    color: "" }] : []),
    ...(membershipTotal > 0 ? [{ label: "Membership", value: `${currencySymbol}${membershipTotal.toFixed(2)}`, color: "" }] : []),
    { label: "Subtotal", value: `${currencySymbol}${subtotal.toFixed(2)}`, color: "" },
    ...(totalDiscount > 0 ? [{ label: "Discount",   value: `-${currencySymbol}${totalDiscount.toFixed(2)}`, color: "text-danger" }] : []),
    ...(exCharges     > 0 ? [{ label: "Ex Charges", value: `${currencySymbol}${exCharges.toFixed(2)}`,      color: "" }] : []),
    { label: "Grand Total", value: `${currencySymbol}${grandTotal.toFixed(2)}`, color: "", bold: true },
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
