import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

export interface ExportableOrder {
  order_number: string;
  supplier_name?: string | null;
  order_date: string;
  delivery_date?: string | null;
  ref_number?: string | null;
  status: "draft" | "sent" | "partially_received" | "received" | "cancelled";
  total_quantity?: number | null;
  total_price?: number | null;
  payment_terms_days?: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

/** Return "—" for null/undefined/empty, otherwise coerce to string. */
const d = (v: unknown) => (v == null || v === "" ? "—" : String(v));

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (isNaN(dt.getTime())) return "—";
  return formatDateDDMMYYYY(dt);
};

// Single source-of-truth column definitions — all three export formats
// (PDF, CSV, Excel) derive their headers and values from this list so they
// always match the Orders table exactly. `formatAmount` is injected so
// exported currency figures follow the salon's own currency setting, same
// as the on-screen table.
const buildCols = (formatAmount: (n: number) => string): { header: string; fn: (o: ExportableOrder) => string }[] => [
  { header: "Order Number", fn: (o) => d(o.order_number) },
  { header: "Supplier", fn: (o) => d(o.supplier_name) },
  { header: "Order Date", fn: (o) => fmtDate(o.order_date) },
  { header: "Delivery Date", fn: (o) => fmtDate(o.delivery_date) },
  { header: "Ref Number", fn: (o) => d(o.ref_number) },
  { header: "Status", fn: (o) => STATUS_LABEL[o.status] ?? d(o.status) },
  { header: "Total Quantity", fn: (o) => String(o.total_quantity ?? 0) },
  { header: "Total Price", fn: (o) => formatAmount(o.total_price ?? 0) },
  { header: "Payment Terms", fn: (o) => (o.payment_terms_days != null ? `${o.payment_terms_days} days` : "—") },
];

// ── PDF ──────────────────────────────────────────────────────────────────────
export const exportOrdersPDF = (orders: ExportableOrder[], formatAmount: (n: number) => string): Blob => {
  const cols = buildCols(formatAmount);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Orders", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const now = new Date();
  const generatedAt = `${formatDateDDMMYYYY(now)} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  doc.text(`Generated: ${generatedAt}`, 14, 25);

  autoTable(doc, {
    head: [cols.map((c) => c.header)],
    body: orders.map((o) => cols.map((c) => c.fn(o))),
    startY: 30,
    styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak", textColor: [30, 30, 30], valign: "middle" },
    headStyles: {
      fillColor: [237, 233, 254],
      textColor: [55, 48, 163],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [196, 181, 253],
      lineWidth: 0.3,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
    horizontalPageBreak: true,
    showHead: "everyPage",
  });

  return doc.output("blob");
};

// ── CSV ──────────────────────────────────────────────────────────────────────
// Generates a plain-text CSV Blob (no API call). Values that contain commas,
// quotes, or newlines are wrapped in double-quotes per RFC 4180, so
// spreadsheet apps parse them correctly.
const escapeCsv = (val: string) => {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

export const exportOrdersCSV = (orders: ExportableOrder[], formatAmount: (n: number) => string): Blob => {
  const cols = buildCols(formatAmount);
  const header = cols.map((c) => escapeCsv(c.header)).join(",");
  const rows = orders.map((o) => cols.map((c) => escapeCsv(c.fn(o))).join(","));
  const csv = [header, ...rows].join("\r\n");
  return new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
};

// ── Excel (XLSX via SheetJS) ─────────────────────────────────────────────────
export const exportOrdersExcel = async (orders: ExportableOrder[], formatAmount: (n: number) => string): Promise<Blob> => {
  // Dynamic import keeps SheetJS out of the main bundle — it's only loaded
  // the first time the user actually clicks "Export Excel".
  const XLSX = await import("xlsx");

  const cols = buildCols(formatAmount);
  const headers = cols.map((c) => c.header);
  const rows = orders.map((o) => cols.map((c) => c.fn(o)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 20 }, // Order Number
    { wch: 26 }, // Supplier
    { wch: 14 }, // Order Date
    { wch: 14 }, // Delivery Date
    { wch: 16 }, // Ref Number
    { wch: 18 }, // Status
    { wch: 14 }, // Total Quantity
    { wch: 16 }, // Total Price
    { wch: 16 }, // Payment Terms
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};
