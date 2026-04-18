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
  tip?: number;
}

const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal, serviceTotal, packageTotal, productTotal, membershipTotal,
  exCharges, discount, discountType, tip = 0,
}) => {
  const discountVal = discountType === "Percentage (%)" ? (subtotal * discount) / 100 : discount;
  const totalDiscount = Math.min(discountVal, subtotal);
  const taxable = Math.max(0, subtotal - totalDiscount);
  const grandTotal = taxable + exCharges + tip;

  const rows = [
    ...(serviceTotal    > 0 ? [{ label: "Service",    value: `₹${serviceTotal.toFixed(2)}`,    color: "" }] : []),
    ...(packageTotal    > 0 ? [{ label: "Package",    value: `₹${packageTotal.toFixed(2)}`,    color: "" }] : []),
    ...(productTotal    > 0 ? [{ label: "Product",    value: `₹${productTotal.toFixed(2)}`,    color: "" }] : []),
    ...(membershipTotal > 0 ? [{ label: "Membership", value: `₹${membershipTotal.toFixed(2)}`, color: "" }] : []),
    { label: "Subtotal", value: `₹${subtotal.toFixed(2)}`, color: "" },
    ...(totalDiscount > 0 ? [{ label: "Discount", value: `-₹${totalDiscount.toFixed(2)}`, color: "text-danger" }] : []),
    ...(exCharges     > 0 ? [{ label: "Ex Charges", value: `₹${exCharges.toFixed(2)}`, color: "" }] : []),
    ...(tip           > 0 ? [{ label: "Tip",        value: `₹${tip.toFixed(2)}`,        color: "" }] : []),
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