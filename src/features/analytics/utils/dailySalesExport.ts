import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Sale } from "../../../types/sale.types";

// ── helpers ───────────────────────────────────────────────────────────────────
// NOTE: jsPDF's built-in Helvetica does not contain the ₹ glyph.
// Use "Rs." prefix + plain ASCII formatting to avoid garbled text.
const money = (v: string | number): string => {
  const n = Math.abs(parseFloat(String(v || "0")));
  const parts = n.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.${parts.join(".")}`;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", card: "Card", upi: "UPI", gift_card: "Gift Card",
  split: "Split", bank_transfer: "Bank Transfer", wallet: "Wallet",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed", cancelled: "Cancelled",
  refunded: "Refunded", draft: "Draft",
};

// ── main export ───────────────────────────────────────────────────────────────
export function exportDailySalesPDF(
  sales: Sale[],
  selectedDate: Date,
  clientMap: Record<string, string> = {},
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const completed  = sales.filter(s => s.status === "completed");
  const refunded   = sales.filter(s => s.status === "refunded");
  const revenue    = completed.reduce((s, r) => s + parseFloat(r.total_amount || "0"), 0);
  const dateLabel  = format(selectedDate, "EEEE, d MMM yyyy");
  const generated  = format(new Date(), "d MMM yyyy, HH:mm");

  // ── logo / title block ────────────────────────────────────────────────────
  // purple header strip
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, 297, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Daily Sales Report", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 200, 255);
  doc.text(`Date: ${dateLabel}`, 14, 16.5);

  // ── summary strip ─────────────────────────────────────────────────────────
  doc.setFillColor(245, 243, 255);
  doc.rect(0, 18, 297, 14, "F");

  const summaryItems = [
    { label: "Total Revenue",  value: money(revenue) },
    { label: "Transactions",   value: String(sales.filter(s => s.status !== "draft").length) },
    { label: "Completed",      value: String(completed.length) },
    { label: "Refunded",       value: String(refunded.length) },
  ];

  summaryItems.forEach((item, i) => {
    const x = 14 + i * 70;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(109, 40, 217);
    doc.text(item.label.toUpperCase(), x, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, x, 29.5);
  });

  // ── table ──────────────────────────────────────────────────────────────────
  const rows = sales
    .filter(s => s.status !== "draft")
    .map(s => {
      const clientName = !s.client_id
        ? "Walk-in"
        : (s.client_name || clientMap[String(s.client_id)] || "Walk-in");

      const discount = parseFloat(s.discount_amount || "0");
      const tip      = parseFloat(s.tip_amount      || "0");
      const tax      = parseFloat(s.tax_amount      || "0");

      return [
        `#${String(s.id).substring(0, 8)}`,
        clientName,
        STATUS_LABELS[s.status] ?? s.status,
        PAYMENT_LABELS[s.payment_method ?? ""] ?? (s.payment_method ?? "—"),
        money(s.subtotal),
        discount > 0 ? `-${money(discount)}` : "—",
        tip > 0      ? money(tip)  : "—",
        tax > 0      ? money(tax)  : "—",
        money(s.total_amount),
        format(new Date(s.created_at), "d MMM yyyy, HH:mm"),
      ];
    });

  autoTable(doc, {
    startY: 36,
    head: [[
      "Sale #", "Client", "Status", "Payment",
      "Subtotal", "Discount", "Tip", "Tax", "Total", "Date & Time",
    ]],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: [30, 30, 30],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [237, 233, 254],
      textColor: [55, 48, 163],
      fontStyle: "bold",
      fontSize: 8,
      lineColor: [196, 181, 253],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 26 },                   // Sale #  (needs 9 chars + #)
      1: { cellWidth: 36 },                   // Client
      2: { cellWidth: 24 },                   // Status
      3: { cellWidth: 24 },                   // Payment
      4: { cellWidth: 26, halign: "right" },  // Subtotal
      5: { cellWidth: 24, halign: "right" },  // Discount
      6: { cellWidth: 18, halign: "right" },  // Tip
      7: { cellWidth: 18, halign: "right" },  // Tax
      8: { cellWidth: 26, halign: "right" },  // Total
      9: { cellWidth: 35 },                   // Date & Time
    },
    // Colour status cells
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const val = String(data.cell.raw);
        if (val === "Completed")  data.cell.styles.textColor = [5, 150, 105];
        if (val === "Refunded")   data.cell.styles.textColor = [220, 38, 38];
        if (val === "Cancelled")  data.cell.styles.textColor = [217, 119, 6];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.section === "body" && data.column.index === 8) {
        data.cell.styles.fontStyle = "bold";
      }
    },
    // Totals footer row
    foot: [[
      "", `${rows.length} sale${rows.length !== 1 ? "s" : ""}`,
      "", "", "", "", "", "",
      `Total: ${money(revenue)}`, "",
    ]],
    footStyles: {
      fillColor: [237, 233, 254],
      textColor: [55, 48, 163],
      fontStyle: "bold",
      fontSize: 8,
    },
  });

  // ── footer ─────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${generated}`, 14, pageH - 6);
  doc.text(
    `Page 1 of 1`,
    297 - 14,
    pageH - 6,
    { align: "right" },
  );

  doc.save(`daily_sales_${format(selectedDate, "yyyy-MM-dd")}.pdf`);
}
