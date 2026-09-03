import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import type { Order } from "../../../types/inventory.types";

// Bill PDF for a received Order that's Paid or Partially paid — see
// OrderDetailPage.tsx's "Download Bill PDF" button, only shown when
// order.bill_payment_status is "paid" or "partial" (never for an
// unreceived / fully-unpaid order — there's nothing to bill yet).
//
// Line items and Subtotal/Discount/Tax/Shipping/Total all come straight
// from the Order's own stored fields (same formula ordersRepository.create()
// uses — see the comment there), so the PDF always matches what's on
// screen. Paid/Pending/Status come from ordersRepository.getById()'s
// billing fields, derived from the Purchase(s) recorded on Receive.

// jsPDF's built-in Helvetica can't render ₹ (U+20B9) — silently drops to a
// blank glyph — so any rupee sign is transliterated before being drawn.
// Mirrors productInventoryExport.ts's own sanitize().
const sanitize = (v: string) => v.replace(/₹/g, "Rs.");

interface Options {
  salon?: {
    business_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
  } | null;
  currencySymbol: string;
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

export const generateOrderBillPdf = (order: Order, options: Options) => {
  const money = (n: number) => sanitize(`${options.currencySymbol}${(Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`);

  const items = order.items ?? [];
  const rawSubtotal = items.reduce((sum, it) => sum + Number(it.selling_price) * Number(it.qty), 0);
  const taxAmount = items.reduce((sum, it) => sum + Number(it.total_tax), 0);
  const shippingCost = Number(order.shipping_cost) || 0;
  const totalAmount = Number(order.total_price) || 0;
  // Backed out from the grand total rather than re-derived from discount
  // percentages, so it always foots exactly with what's printed below —
  // subtotal - discount + tax + shipping === total, by construction.
  const discountAmount = Math.max(0, rawSubtotal + taxAmount + shippingCost - totalAmount);

  const paidAmount = Number(order.paid_amount) || 0;
  const pendingAmount = Number(order.pending_amount) || 0;
  const status = order.bill_payment_status ?? "unpaid";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const salonName = options.salon?.business_name || "Salon";
  const addressStr = [options.salon?.address, options.salon?.city, options.salon?.state]
    .filter(Boolean).join(", ");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(17, 24, 39);
  doc.text(sanitize(salonName), margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  let y = 21;
  if (addressStr) { doc.text(sanitize(addressStr), margin, y); y += 4.5; }
  if (options.salon?.phone) { doc.text(`Phone: ${options.salon.phone}`, margin, y); y += 4.5; }

  // Bill title on the left, status badge-style text on the right.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text("Bill", margin, y + 5);

  const statusColor: [number, number, number] = status === "paid" ? [2, 122, 72] : [181, 71, 8];
  doc.setFontSize(11);
  doc.setTextColor(...statusColor);
  doc.text(STATUS_LABEL[status] ?? status, pageWidth - margin, y + 5, { align: "right" });

  y += 12;

  // Two-column header info block: order/date on the left, supplier/terms on
  // the right — mirrors the app's own stat-card pairing (order number +
  // date, supplier + payment terms) rather than one long stacked list.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const leftX = margin;
  const rightX = pageWidth / 2 + 5;
  const labelColor: [number, number, number] = [107, 114, 128];
  const valueColor: [number, number, number] = [17, 24, 39];

  const infoRow = (label: string, value: string, x: number, rowY: number) => {
    doc.setTextColor(...labelColor);
    doc.text(label, x, rowY);
    doc.setTextColor(...valueColor);
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(value), x, rowY + 4.5);
    doc.setFont("helvetica", "normal");
  };

  infoRow("Order Number", order.order_number, leftX, y);
  infoRow("Supplier", order.supplier_name || "—", rightX, y);
  y += 11;
  infoRow("Bill Date", formatDateDDMMYYYY(order.order_date), leftX, y);
  infoRow("Payment Terms", order.payment_terms_days != null ? `${order.payment_terms_days} days` : "—", rightX, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [["Product", "Product Code", "Qty", "Price", "Discount", "Tax", "Total"]],
    body: items.map((it) => {
      const lineDiscount = Number(it.selling_price) * Number(it.qty) * (Number(it.discount_percent) / 100);
      const lineTotal = Number(it.selling_price) * Number(it.qty) - lineDiscount + Number(it.total_tax);
      return [
        it.product_name || "—",
        it.product_code || "—",
        String(it.qty),
        money(it.selling_price),
        `${it.discount_percent}%`,
        money(it.total_tax),
        money(lineTotal),
      ];
    }),
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [229, 231, 235], textColor: [31, 41, 55] },
    headStyles: { fillColor: [16, 24, 40], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // Totals block — right-aligned, Paid/Pending pulled out visually since
  // that's the whole point of this document.
  let totalsY = (doc as any).lastAutoTable.finalY + 8;
  const labelX = pageWidth - margin - 55;
  const valueX = pageWidth - margin;

  const totalsRow = (label: string, value: string, bold = false, color: [number, number, number] = valueColor) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10.5 : 9.5);
    doc.setTextColor(...labelColor);
    doc.text(label, labelX, totalsY);
    doc.setTextColor(...color);
    doc.text(value, valueX, totalsY, { align: "right" });
    totalsY += bold ? 6.5 : 5.5;
  };

  totalsRow("Subtotal", money(rawSubtotal));
  if (discountAmount > 0.005) totalsRow("Discount", `-${money(discountAmount)}`);
  if (taxAmount > 0.005) totalsRow("Tax", money(taxAmount));
  if (shippingCost > 0.005) totalsRow("Shipping", money(shippingCost));
  doc.setDrawColor(229, 231, 235);
  doc.line(labelX, totalsY - 3.5, valueX, totalsY - 3.5);
  totalsRow("Total Amount", money(totalAmount), true);
  totalsRow("Paid Amount", money(paidAmount), false, [2, 122, 72]);
  totalsRow("Pending Amount", money(pendingAmount), false, pendingAmount > 0.005 ? [181, 71, 8] : valueColor);
  totalsRow("Payment Status", STATUS_LABEL[status] ?? status, true, statusColor);

  doc.save(`bill-${order.order_number}.pdf`);
};
