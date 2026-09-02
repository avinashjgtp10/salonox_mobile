import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

// Export helpers for the Product Inventory page. Kept separate from
// productExport.ts: that one exports the product CATALOGUE (pricing, GST,
// supplier), this one exports the Product Inventory table's own 12 columns —
// Product, Barcode, Category, Supplier, Purchased, Sold, Consumed, Available,
// Purchase Price, Selling Price, Expiry, Status — so the export always
// matches what's on screen.

export type InventoryExportStatus = "in_stock" | "low_stock" | "out_of_stock" | "expired" | "expiring_soon";

export interface InventoryExportRow {
  name: string;
  barcode?: string | null;
  category?: string | null;
  supplier?: string | null;
  purchased?: number;
  sold?: number;
  consumed?: number;
  stock: number;
  supply_price?: number | null;
  retail_price?: number | null;
  expiry_date?: string | null;
  status: InventoryExportStatus;
  measure_unit?: string | null;
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

const STATUS_LABELS: Record<InventoryExportStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  expired: "Expired",
  expiring_soon: "Expiring Soon",
};

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

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : formatDateDDMMYYYY(d);
};

const fileStamp = () => formatDateDDMMYYYY(new Date());

const HEADERS = [
  "#", "Product", "Barcode", "Category", "Supplier", "Purchased", "Sold", "Consumed",
  "Available", "Purchase Price", "Selling Price", "Expiry", "Status",
];

const toRow = (r: InventoryExportRow, i: number) => [
  String(i + 1),
  cell(r.name),
  cell(r.barcode),
  cell(r.category),
  cell(r.supplier),
  fmtQty(r.purchased),
  fmtQty(r.sold),
  fmtQty(r.consumed),
  `${fmtQty(r.stock)}${r.measure_unit ? ` ${sanitize(r.measure_unit)}` : ""}`,
  r.supply_price == null ? "—" : fmtQty(r.supply_price),
  r.retail_price == null ? "—" : fmtQty(r.retail_price),
  fmtDate(r.expiry_date),
  STATUS_LABELS[r.status] ?? r.status,
];

const STATUS_COL_INDEX = 12;

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
    `Generated ${fmtDate(new Date().toISOString())}  |  By: ${sanitize(userName)}  |  ${rows.length} product(s)`,
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
      10: { halign: "right" },
    },
    // Anything other than a clean "in stock" is tinted so the thing the report
    // exists to surface (low stock, expired, expiring soon) is findable
    // without reading the Status column on every line.
    didParseCell: (data) => {
      if (data.section === "body" && rows[data.row.index]?.status !== "in_stock") {
        data.cell.styles.fillColor = [254, 242, 242];
        if (data.column.index === STATUS_COL_INDEX) {
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
      Barcode: r.barcode ?? "",
      Category: r.category ?? "",
      Supplier: r.supplier ?? "",
      Purchased: Number(r.purchased) || 0,
      Sold: Number(r.sold) || 0,
      Consumed: Number(r.consumed) || 0,
      Available: Number(r.stock) || 0,
      Unit: r.measure_unit ?? "",
      "Purchase Price": r.supply_price ?? "",
      "Selling Price": r.retail_price ?? "",
      Expiry: fmtDate(r.expiry_date),
      Status: STATUS_LABELS[r.status] ?? r.status,
    })),
  );
  sheet["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
    { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 13 },
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
