import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

export interface ExportableSupplier {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  mobile_number?: string | null;
  telephone_number?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  total_purchase_amount?: number | null;
  pending_order_count?: number | null;
  due_amount?: number | null;
  due_date?: string | null;
  status?: "paid" | "due" | "overdue";
}

const STATUS_LABEL: Record<string, string> = { paid: "Paid", due: "Due", overdue: "Overdue" };

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
// always match the Suppliers table exactly. `formatAmount` is injected so
// exported currency figures follow the salon's own currency setting, same
// as the on-screen table.
const buildCols = (formatAmount: (n: number) => string): { header: string; fn: (s: ExportableSupplier) => string }[] => [
  { header: "Supplier Name", fn: (s) => d(s.name) },
  { header: "Contact Person", fn: (s) => d([s.first_name, s.last_name].filter(Boolean).join(" ")) },
  { header: "Phone", fn: (s) => d(s.mobile_number || s.telephone_number) },
  { header: "Email", fn: (s) => d(s.email) },
  { header: "City", fn: (s) => d(s.city) },
  { header: "State", fn: (s) => d(s.state) },
  { header: "Total Amount", fn: (s) => formatAmount(s.total_purchase_amount ?? 0) },
  { header: "Pending Orders", fn: (s) => String(s.pending_order_count ?? 0) },
  { header: "Due Amount", fn: (s) => formatAmount(s.due_amount ?? 0) },
  { header: "Due Date", fn: (s) => fmtDate(s.due_date) },
  { header: "Status", fn: (s) => STATUS_LABEL[s.status || "paid"] ?? "Paid" },
];

// ── PDF ──────────────────────────────────────────────────────────────────────
export const exportSuppliersPDF = (suppliers: ExportableSupplier[], formatAmount: (n: number) => string): Blob => {
  const cols = buildCols(formatAmount);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Suppliers", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const now = new Date();
  const generatedAt = `${formatDateDDMMYYYY(now)} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  doc.text(`Generated: ${generatedAt}`, 14, 25);

  autoTable(doc, {
    head: [cols.map((c) => c.header)],
    body: suppliers.map((s) => cols.map((c) => c.fn(s))),
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

export const exportSuppliersCSV = (suppliers: ExportableSupplier[], formatAmount: (n: number) => string): Blob => {
  const cols = buildCols(formatAmount);
  const header = cols.map((c) => escapeCsv(c.header)).join(",");
  const rows = suppliers.map((s) => cols.map((c) => escapeCsv(c.fn(s))).join(","));
  const csv = [header, ...rows].join("\r\n");
  return new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
};

// ── Excel (XLSX via SheetJS) ─────────────────────────────────────────────────
export const exportSuppliersExcel = async (suppliers: ExportableSupplier[], formatAmount: (n: number) => string): Promise<Blob> => {
  // Dynamic import keeps SheetJS out of the main bundle — it's only loaded
  // the first time the user actually clicks "Export Excel".
  const XLSX = await import("xlsx");

  const cols = buildCols(formatAmount);
  const headers = cols.map((c) => c.header);
  const rows = suppliers.map((s) => cols.map((c) => c.fn(s)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 26 }, // Supplier Name
    { wch: 22 }, // Contact Person
    { wch: 16 }, // Phone
    { wch: 28 }, // Email
    { wch: 16 }, // City
    { wch: 14 }, // State
    { wch: 16 }, // Total Amount
    { wch: 14 }, // Pending Orders
    { wch: 14 }, // Due Amount
    { wch: 14 }, // Due Date
    { wch: 12 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Suppliers");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};
