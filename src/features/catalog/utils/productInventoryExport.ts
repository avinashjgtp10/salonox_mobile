import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Export helpers for the Product Inventory page. Kept separate from
// productExport.ts: that one exports the product CATALOGUE (pricing, GST,
// supplier), this one exports STOCK POSITION (on-hand, reorder point, last
// updated). Same visual conventions as the catalogue PDF so the two read as
// one family of documents.

export interface InventoryExportRow {
  name: string;
  sku?: string | null;
  category?: string | null;
  brand?: string | null;
  stock: number;
  qty_alert?: number | null;
  low_stock?: boolean;
  measure_unit?: string | null;
  last_updated?: string | null;
}

export interface InventoryExportOptions {
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

// jsPDF's built-in Helvetica can't render ₹ (U+20B9) — it silently drops to a
// blank glyph, so any rupee sign has to be transliterated before it's drawn.
const sanitize = (v: string) => v.replace(/₹/g, "Rs.");
const cell = (v: unknown) => (v == null || v === "" ? "—" : sanitize(String(v)));

const fmtQty = (n: unknown) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  // Stock is usually whole packs but can be fractional after a partial
  // deduction — show decimals only when there actually are any.
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
};

const fileStamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const HEADERS = [
  "#", "Product", "SKU", "Category", "Brand", "In Stock", "Reorder At", "Status", "Last Updated",
];

const toRow = (r: InventoryExportRow, i: number) => [
  String(i + 1),
  cell(r.name),
  cell(r.sku),
  cell(r.category),
  cell(r.brand),
  `${fmtQty(r.stock)}${r.measure_unit ? ` ${sanitize(r.measure_unit)}` : ""}`,
  r.qty_alert == null || r.qty_alert === 0 ? "—" : fmtQty(r.qty_alert),
  r.low_stock ? "Low stock" : "OK",
  fmtDateTime(r.last_updated),
];

// ── PDF ───────────────────────────────────────────────────────────────────────
export const exportInventoryPDF = (
  rows: InventoryExportRow[],
  options: InventoryExportOptions = {},
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
  doc.text("Product Inventory", margin, y + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  if (options.filterSummary) {
    doc.text(sanitize(options.filterSummary), margin, y + 8);
  }
  // Right-aligned so it can't collide with a long filter summary on the left.
  doc.text(
    `Generated ${fmtDateTime(new Date().toISOString())}  |  By: ${sanitize(userName)}  |  ${rows.length} product(s)`,
    pageWidth - margin,
    y + 8,
    { align: "right" },
  );

  autoTable(doc, {
    startY: y + 13,
    head: [HEADERS],
    body: rows.map(toRow),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, lineColor: [229, 231, 235], textColor: [31, 41, 55] },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 10, halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    // Low-stock rows are tinted so the thing the report exists to surface is
    // findable without reading the Status column on every line.
    didParseCell: (data) => {
      if (data.section === "body" && rows[data.row.index]?.low_stock) {
        data.cell.styles.fillColor = [254, 242, 242];
        if (data.column.index === 7) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  doc.save(`product-inventory-${fileStamp()}.pdf`);
};

// ── Excel ─────────────────────────────────────────────────────────────────────
export const exportInventoryExcel = (rows: InventoryExportRow[]) => {
  // Numeric columns are written as real numbers, not the display strings the
  // PDF uses — otherwise the sheet can't sum or sort them.
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r, i) => ({
      "#": i + 1,
      Product: r.name ?? "",
      SKU: r.sku ?? "",
      Category: r.category ?? "",
      Brand: r.brand ?? "",
      "In Stock": Number(r.stock) || 0,
      Unit: r.measure_unit ?? "",
      "Reorder At": r.qty_alert ?? "",
      Status: r.low_stock ? "Low stock" : "OK",
      "Last Updated": fmtDateTime(r.last_updated),
    })),
  );
  sheet["!cols"] = [
    { wch: 5 }, { wch: 34 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
    { wch: 10 }, { wch: 8 }, { wch: 11 }, { wch: 11 }, { wch: 20 },
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Product Inventory");
  XLSX.writeFile(book, `product-inventory-${fileStamp()}.xlsx`);
};

// ── CSV ───────────────────────────────────────────────────────────────────────
export const exportInventoryCSV = (rows: InventoryExportRow[]) => {
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
  a.download = `product-inventory-${fileStamp()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
