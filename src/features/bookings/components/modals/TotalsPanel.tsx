import React from "react";

interface TotalsPanelProps {
  subtotal: number;
  exCharges: number;
  discount: number;
  discountType: string;
  gst: number;
  adjustPayment: number;
  couponDiscount?: number;
  tip?: number;
}

const TotalsPanel: React.FC<TotalsPanelProps> = ({
  subtotal,
  exCharges,
  discount,
  discountType,
  gst,
  adjustPayment,
  couponDiscount = 0,
  tip = 0,
}) => {
  const discountVal =
    discountType === "Percentage (%)" ? (subtotal * discount) / 100 : discount;
  const totalDiscount = Math.min(discountVal + couponDiscount, subtotal);
  const taxable = Math.max(0, subtotal - totalDiscount);
  const gstVal = (taxable * gst) / 100;
  const grandTotal = taxable + gstVal + exCharges + tip;
  const due = Math.max(0, grandTotal - adjustPayment);

  type Row = {
    label: string;
    value: string;
    bold?: boolean;
    muted?: boolean;
    colored?: string;
  };

  const rows: Row[] = [
    { label: "Subtotal (₹):", value: subtotal.toFixed(2) },
    ...(totalDiscount > 0
      ? [
          {
            label: "Discount (₹):",
            value: `-${totalDiscount.toFixed(2)}`,
            colored: "#22c55e",
          },
        ]
      : []),
    ...(gst > 0
      ? [
          {
            label: `GST ${gst}% (₹):`,
            value: gstVal.toFixed(2),
            colored: "#f59e0b",
          },
        ]
      : []),
    ...(exCharges > 0
      ? [{ label: "Ex Charges (₹):", value: exCharges.toFixed(2) }]
      : []),
    ...(tip > 0 ? [{ label: "Tip (₹):", value: tip.toFixed(2) }] : []),
    { label: "Grand Total (₹):", value: grandTotal.toFixed(2), bold: true },
    { label: "Taxable Amount (₹):", value: taxable.toFixed(2) },
    { label: "Paying Now (₹):", value: adjustPayment.toFixed(2), muted: true },
    { label: "Due Amount (₹):", value: due.toFixed(2), muted: true },
  ];

  return (
    <div className="totals-panel">
      {rows.map(({ label, value, bold, colored }) => (
        <div
          key={label}
          className={`totals-panel__row ${bold ? "grand-total" : ""}`}
        >
          <span className="label">{label}</span>
          <span className="value" style={{ color: colored || undefined }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TotalsPanel;
