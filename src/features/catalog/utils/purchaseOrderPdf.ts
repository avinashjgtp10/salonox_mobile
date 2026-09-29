import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import type { Order } from "../../../types/inventory.types";

// Purchase Order PDF — the document you'd actually print/email to a
// supplier when placing an order, available for any order regardless of
// status or payment (unlike generateOrderBillPdf in orderBillPdf.ts, which
// only makes sense once an order's been received and billed). Laid out as
// a bordered document (title bar, two-column info panel, gridded items
// table, boxed totals) rather than loose floating text, so it reads like an
// actual business document instead of a debug dump.

// jsPDF's built-in Helvetica can't render ₹ (U+20B9) — silently drops to a
// blank glyph — so any rupee sign is transliterated before being drawn.
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

const STATUS_LABEL: Record<Order["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

const BLACK: [number, number, number] = [17, 24, 39];
const GRAY: [number, number, number] = [107, 114, 128];
const BORDER: [number, number, number] = [30, 33, 40];

export const generatePurchaseOrderPdf = (order: Order, options: Options) => {
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

  const status = order.status;
  const statusColor: [number, number, number] =
    status === "received" ? [2, 122, 72]
    : status === "cancelled" ? [185, 28, 28]
    : status === "partially_received" ? [124, 58, 237]
    : [181, 71, 8];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageWidth - margin * 2;
  const right = pageWidth - margin;

  doc.setDrawColor(...BORDER);

  // ── Title bar ────────────────────────────────────────────────────────────
  const titleBarH = 13;
  let y = margin;
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, titleBarH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text("PURCHASE ORDER", margin + 4, y + 8.5);
  doc.setFontSize(10.5);
  doc.text(sanitize(order.order_number), right - 4, y + 6.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...statusColor);
  doc.text(STATUS_LABEL[status] ?? status, right - 4, y + 11, { align: "right" });
  y += titleBarH;

  // ── Two-column info panel: From (salon) | Order details ─────────────────
  const panelH = 32;
  const midX = margin + contentW / 2;
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, panelH);
  doc.line(midX, y, midX, y + panelH);

  const padX = 4;
  const label = (text: string, x: number, rowY: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(text, x, rowY);
  };
  const value = (text: string, x: number, rowY: number, size = 9.5, bold = true) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...BLACK);
    doc.text(sanitize(text), x, rowY);
  };

  // Left column — From (salon).
  let ly = y + 6;
  label("FROM", margin + padX, ly);
  ly += 5;
  value(options.salon?.business_name || "Salon", margin + padX, ly, 11);
  ly += 5.5;
  const addressStr = [options.salon?.address, options.salon?.city, options.salon?.state].filter(Boolean).join(", ");
  if (addressStr) { value(addressStr, margin + padX, ly, 8.5, false); ly += 4.5; }
  if (options.salon?.phone) { value(`Phone: ${options.salon.phone}`, margin + padX, ly, 8.5, false); }

  // Right column — order meta, as label:value pairs.
  const metaX = midX + padX;
  let ry = y + 6;
  const metaRow = (l: string, v: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(l, metaX, ry);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLACK);
    doc.text(sanitize(v), midX + contentW / 2 - padX, ry, { align: "right" });
    ry += 6;
  };
  metaRow("Supplier", order.supplier_name || "—");
  metaRow("Order Date", formatDateDDMMYYYY(order.order_date));
  metaRow("Payment Terms", order.payment_terms_days != null ? `${order.payment_terms_days} days` : "—");
  metaRow("Total Quantity", String(order.total_quantity ?? items.reduce((s, it) => s + Number(it.qty), 0)));
  y += panelH;

  // ── Line items ────────────────────────────────────────────────────────────
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
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.3, textColor: [31, 41, 55] },
    headStyles: { fillColor: BLACK, textColor: 255, fontStyle: "bold", fontSize: 8.5, lineColor: BORDER, lineWidth: 0.3 },
    alternateRowStyles: { fillColor: [246, 247, 249] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // ── Totals — boxed, bottom-right ─────────────────────────────────────────
  const tableEndY = (doc as any).lastAutoTable.finalY;
  const totalsW = 75;
  const totalsX = right - totalsW;
  const rowH = 6;
  const rows: [string, string, boolean][] = [["Subtotal", money(rawSubtotal), false]];
  if (discountAmount > 0.005) rows.push(["Discount", `-${money(discountAmount)}`, false]);
  if (taxAmount > 0.005) rows.push(["Tax", money(taxAmount), false]);
  if (shippingCost > 0.005) rows.push(["Shipping", money(shippingCost), false]);
  rows.push(["Total Amount", money(totalAmount), true]);
  const totalsH = rowH * rows.length + 3;
  doc.setLineWidth(0.3);
  doc.rect(totalsX, tableEndY, totalsW, totalsH);

  let trY = tableEndY + rowH - 1.5;
  rows.forEach(([l, v, bold]) => {
    if (bold) {
      doc.setLineWidth(0.3);
      doc.line(totalsX, tableEndY + (rows.length - 1) * rowH, right, tableEndY + (rows.length - 1) * rowH);
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10.5 : 9);
    doc.setTextColor(...(bold ? BLACK : GRAY));
    doc.text(l, totalsX + 3, trY);
    doc.setTextColor(...BLACK);
    doc.text(v, right - 3, trY, { align: "right" });
    trY += rowH;
  });

  // ── Footer note ───────────────────────────────────────────────────────────
  const footerY = tableEndY + totalsH + 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("This is a system-generated purchase order and does not require a signature.", margin, footerY);

  // ── Outer document border, wrapping everything laid out above ───────────
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, contentW, footerY + 4 - margin);

  doc.save(`purchase-order-${order.order_number}.pdf`);
};
