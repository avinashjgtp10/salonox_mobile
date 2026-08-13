import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportableStaff {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  phone?: string;
  job_title?: string;
  permission_level?: string;
  is_active?: boolean;
}

const PERMISSION_LABELS: Record<string, string> = {
  no_access: "No Access",
  basic:     "Basic",
  low:       "Low",
  medium:    "Medium",
  high:      "High",
  manager:   "Manager",
};

/** Return "—" for null/undefined/empty, otherwise coerce to string. */
const d = (v: unknown) => (v == null || v === "" ? "—" : String(v));

// Single source-of-truth column definitions — all three export formats
// (PDF, CSV, Excel) derive their headers and values from this list so
// they always match the Staff table exactly.
const COLS: { header: string; fn: (s: ExportableStaff) => string }[] = [
  { header: "Name",   fn: (s) => d(`${s.first_name || ""} ${s.last_name || ""}`.trim()) },
  { header: "Email",  fn: (s) => d(s.email) },
  { header: "Phone",  fn: (s) => d(s.phone_number || s.phone) },
  { header: "Role",   fn: (s) => d(s.job_title || PERMISSION_LABELS[s.permission_level || ""] || "Staff") },
  { header: "Status", fn: (s) => (s.is_active === false ? "Inactive" : "Active") },
];

// ── PDF ──────────────────────────────────────────────────────────────────────
export const exportStaffPDF = (staff: ExportableStaff[]): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Staff Members", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const now = new Date();
  const generatedAt = `${now.toLocaleDateString("en-GB")} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  doc.text(`Generated: ${generatedAt}`, 14, 25);

  autoTable(doc, {
    head: [COLS.map((c) => c.header)],
    body: staff.map((s) => COLS.map((c) => c.fn(s))),
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
    columnStyles: {
      0: { cellWidth: 55 }, // Name
      1: { cellWidth: 70 }, // Email
      2: { cellWidth: 35 }, // Phone
      3: { cellWidth: 40 }, // Role
      4: { cellWidth: 30 }, // Status
    },
    tableWidth: "wrap",
  });

  return doc.output("blob");
};

// ── CSV ──────────────────────────────────────────────────────────────────────
// Generates a plain-text CSV Blob from the current table data (no API call).
// Values that contain commas, quotes, or newlines are wrapped in double-quotes
// per RFC 4180, so spreadsheet apps parse them correctly.
const escapeCsv = (val: string) => {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

export const exportStaffCSV = (staff: ExportableStaff[]): Blob => {
  const header = COLS.map((c) => escapeCsv(c.header)).join(",");
  const rows = staff.map((s) =>
    COLS.map((c) => escapeCsv(c.fn(s))).join(",")
  );
  const csv = [header, ...rows].join("\r\n");
  return new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
};

// ── Excel (XLSX via SheetJS) ─────────────────────────────────────────────────
// Uses SheetJS (xlsx) to generate a real .xlsx file entirely client-side so
// the exported file always reflects the data currently visible in the table.
// SheetJS is a common dependency — if it's not yet installed the user will
// see a module-not-found error and should run: npm install xlsx
export const exportStaffExcel = async (staff: ExportableStaff[]): Promise<Blob> => {
  // Dynamic import keeps SheetJS out of the main bundle — it's only loaded
  // the first time the user actually clicks "Export Excel".
  const XLSX = await import("xlsx");

  const headers = COLS.map((c) => c.header);
  const rows = staff.map((s) => COLS.map((c) => c.fn(s)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths (chars) — mirrors the PDF proportions so the sheet looks
  // clean without manual resizing.
  ws["!cols"] = [
    { wch: 28 }, // Name
    { wch: 36 }, // Email
    { wch: 18 }, // Phone
    { wch: 20 }, // Role
    { wch: 12 }, // Status
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Staff Members");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};
