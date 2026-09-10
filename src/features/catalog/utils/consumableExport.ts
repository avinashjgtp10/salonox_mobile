import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import type { ConsumableListRow, ConsumableStatus } from "../../../types/inventory.types";

// Export helpers for the Consumable Inventory page — same shape/columns as
// what's on screen (Product, Category, Supplier, Stock, Unit, Available
// Stock, Used This Month, Assigned Services, Status), so the export always
// matches the visible table. Mirrors productInventoryExport.ts's structure
// (single source-of-truth columns feeding all three formats).

export interface ConsumableExportOptions {
  salon?: {
    business_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
  } | null;
  user?: { fullName?: string | null } | null;
  /** Human-readable summary of the active filters, printed under the title so
   *  a shared export says what it was filtered to. */
  filterSummary?: string;
}

const STATUS_LABELS: Record<ConsumableStatus, string> = {
  healthy: "Healthy",
  low: "Low Stock",
  out_of_stock: "Out of Stock",
  deactivated: "Deactivated",
};

// jsPDF's built-in Helvetica can't render ₹ (U+20B9) — it silently drops to a
// blank glyph, so any rupee sign has to be transliterated before it's drawn.
const sanitize = (v: string) => v.replace(/₹/g, "Rs.");
const cell = (v: unknown) => (v == null || v === "" ? "—" : sanitize(String(v)));

const fmtQty = (n: unknown) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const fileStamp = () => formatDateDDMMYYYY(new Date());

const HEADERS = [
  "#", "Product", "Brand", "Category", "Supplier", "Stock", "Unit Size",
  "Available Stock", "Used (This Month)", "Assigned Services", "Status",
];

const toRow = (r: ConsumableListRow, i: number) => [
  String(i + 1),
  cell(r.name),
  cell(r.brand_name),
  cell(r.category_name),
  cell(r.supplier_name),
  fmtQty(r.product_qty),
  r.unit_size ? `${fmtQty(r.unit_size)} ${sanitize(r.unit)}` : "—",
  `${fmtQty(r.remaining_stock)} ${sanitize(r.unit)}`,
  `${fmtQty(r.used_this_month)} ${sanitize(r.unit)}`,
  String(r.assigned_services_count ?? 0),
  STATUS_LABELS[r.status] ?? r.status,
];

const STATUS_COL_INDEX = 10;

// ── PDF ───────────────────────────────────────────────────────────────────────
export const exportConsumablesPDF = (
  rows: ConsumableListRow[],
  options: ConsumableExportOptions = {},
) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const salonName = options.salon?.business_name || "Salon";
  const userName = options.user?.fullName || "Admin";
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text("Consumable Inventory", margin, y + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  if (options.filterSummary) {
    doc.text(sanitize(options.filterSummary), margin, y + 8);
  }
  doc.text(
    `Generated ${fileStamp()}  |  By: ${sanitize(userName)}  |  ${rows.length} product(s)`,
    pageWidth - margin,
    y + 8,
    { align: "right" },
  );

  autoTable(doc, {
    startY: y + 13,
    head: [HEADERS],
    body: rows.map(toRow),
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2, lineColor: [229, 231, 235], textColor: [31, 41, 55] },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 8, halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    // Anything other than "healthy" is tinted so the thing the report exists
    // to surface (low stock, out of stock, deactivated) is findable without
    // reading the Status column on every line.
    didParseCell: (data) => {
      if (data.section === "body" && rows[data.row.index]?.status !== "healthy") {
        data.cell.styles.fillColor = [254, 242, 242];
        if (data.column.index === STATUS_COL_INDEX) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  doc.save(`consumable-inventory-${fileStamp()}.pdf`);
};

// ── Excel ─────────────────────────────────────────────────────────────────────
export const exportConsumablesExcel = (rows: ConsumableListRow[]) => {
  // Numeric columns are written as real numbers, not the display strings the
  // PDF uses — otherwise the sheet can't sum or sort them.
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r, i) => ({
      "#": i + 1,
      Product: r.name ?? "",
      Brand: r.brand_name ?? "",
      Category: r.category_name ?? "",
      Supplier: r.supplier_name ?? "",
      Stock: Number(r.product_qty) || 0,
      "Unit Size": r.unit_size ?? "",
      Unit: r.unit ?? "",
      "Available Stock": Number(r.remaining_stock) || 0,
      "Used (This Month)": Number(r.used_this_month) || 0,
      "Assigned Services": Number(r.assigned_services_count) || 0,
      Status: STATUS_LABELS[r.status] ?? r.status,
    })),
  );
  sheet["!cols"] = [
    { wch: 5 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 12 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Consumable Inventory");
  XLSX.writeFile(book, `consumable-inventory-${fileStamp()}.xlsx`);
};

// ── CSV ───────────────────────────────────────────────────────────────────────
export const exportConsumablesCSV = (rows: ConsumableListRow[]) => {
  // Quote every field and double any embedded quote — product names routinely
  // contain commas ("Shampoo, 500ml") which would otherwise split a column.
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    HEADERS.map(esc).join(","),
    ...rows.map((r, i) => toRow(r, i).map(esc).join(",")),
  ];
  // BOM so Excel opens UTF-8 correctly instead of mangling accented names.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consumable-inventory-${fileStamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
