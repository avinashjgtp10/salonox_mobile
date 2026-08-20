import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Service } from "../types/catalog.types";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

export interface PDFExportOptions {
  salon?: {
    business_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    gst_number?: string | null;
    currency?: string | null;
  } | null;
  user?: {
    fullName?: string | null;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
// jsPDF's built-in Helvetica cannot render ₹ (U+20B9). When the glyph appears
// inside a string it corrupts the entire text run, causing spaced-out garbled
// output. Replace it with 'Rs.' so every string is safe for PDF rendering.
const sanitize = (v: string) => v.replace(/₹/g, "Rs.");
const d = (v: unknown) => (v == null || v === "" ? "—" : sanitize(String(v)));
const bool = (v: unknown) => (v ? "Yes" : "No");

const formatDisplayDate = (date: Date) => formatDateDDMMYYYY(date);

const formatGeneratedDateTime = (date: Date) => {
  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${formatDisplayDate(date)}, ${timeStr}`;
};

// Format price for PDF — jsPDF's built-in Helvetica does not support
// the Rupee Unicode glyph (U+20B9); it renders as ¹. Use 'Rs.' instead.
const formatPricePDF = (price: unknown, sym = "Rs.") => {
  if (price == null || price === "") return "—";
  const num = typeof price === "number" ? price : parseFloat(String(price));
  if (isNaN(num)) return String(price);
  // Format with 2 decimal places max, plain en-US commas (safe in all PDF fonts)
  const formatted = num.toFixed(num % 1 === 0 ? 0 : 2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sym}${formatted}`;
};

const formatGST = (s: Service) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sx = s as any;
  const gst = sx.gst ?? sx.gst_number ?? sx.tax_rate ?? sx.tax;
  if (gst != null && gst !== "") {
    const num = parseFloat(String(gst));
    return isNaN(num) ? String(gst) : `${num}%`;
  }
  return "—";
};

// ── Legacy export columns (used by Excel/CSV too) ──────────────────────────────
const COLS: { header: string; fn: (s: Service) => string }[] = [
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { header: "Type",             fn: (s) => d((s as any).type || "Service") },
  { header: "Name",             fn: (s) => d(s.name) },
  { header: "Category",         fn: (s) => d(s.category_name) },
  { header: "Description",      fn: (s) => d(s.description) },
  { header: "Price Type",       fn: (s) => d(s.price_type || "fixed") },
  { header: "Price / Retail",   fn: (s) => d(s.price) },
  { header: "Duration (min)",   fn: (s) => d(s.duration) },
  { header: "Online Booking",   fn: (s) => bool(s.online_booking) },
  { header: "Status",           fn: (s) => (s.is_active ? "Active" : "Inactive") },
  // Dropped: Discounted Price, Available For (gender), Commission and
  // Resource Required. The first two have no column at all, and the last two
  // can no longer be set from the form — every row exported blank or a
  // constant "No".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { header: "Created At",       fn: (s) => d((s as any).created_at) },
];

const legacyRows = (services: Service[]) => services.map((s) => COLS.map((c) => c.fn(s)));

// ── Combined PDF (Summary table + Detailed cards in one document) ──────────────
export const exportServicesPDF = (services: Service[], options: PDFExportOptions = {}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth  = doc.internal.pageSize.getWidth();   // 210
  const pageHeight = doc.internal.pageSize.getHeight();  // 297
  const margin     = 14;
  const contentW   = pageWidth - margin * 2;             // 182

  const salonName   = options.salon?.business_name || "Salon";
  const userName    = options.user?.fullName || "Admin";
  const generatedAt = new Date();
  const dateStr     = formatGeneratedDateTime(generatedAt);
  // Use 'Rs.' for all currencies in PDF — Rupee glyph not in Helvetica
  const currencySym = options.salon?.currency === "USD" ? "$" : "Rs.";

  const addrParts  = [options.salon?.address, options.salon?.city, options.salon?.state].filter(Boolean);
  const addressStr = addrParts.join(", ");
  const phoneStr   = options.salon?.phone   ? `Phone: ${options.salon.phone}` : "";
  const gstStr     = options.salon?.gst_number ? `GSTIN: ${options.salon.gst_number}` : "";
  const contactLine = [phoneStr, gstStr].filter(Boolean).join("   |   ");

  // Colour palette
  const PRIMARY  : [number,number,number] = [30, 27, 75];
  const ACCENT   : [number,number,number] = [79, 70, 229];
  const TEXT     : [number,number,number] = [17, 24, 39];
  const GRAY     : [number,number,number] = [100, 116, 139];
  const CARD_BG  : [number,number,number] = [248, 250, 252];
  const BORDER   : [number,number,number] = [226, 232, 240];
  const WHITE    : [number,number,number] = [255, 255, 255];

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPER — draw footer on a given page
  // ─────────────────────────────────────────────────────────────────────────────
  const drawFooter = (pageNum: number, pageTotal: number) => {
    doc.setPage(pageNum);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Generated by ${salonName}`, margin, pageHeight - 9);
    doc.text(`Page ${pageNum} of ${pageTotal}`, pageWidth - margin, pageHeight - 9, { align: "right" });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1.  PAGE HEADER
  // ─────────────────────────────────────────────────────────────────────────────
  let curY = 14;

  // Left – salon name + contact
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...PRIMARY);
  doc.text(salonName, margin, curY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  let subY = curY + 10.5;
  if (addressStr) { doc.text(addressStr, margin, subY); subY += 4.5; }
  if (contactLine) { doc.text(contactLine, margin, subY); subY += 4.5; }

  // Right – catalog title + meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...ACCENT);
  doc.text("Service Catalog", pageWidth - margin, curY + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text(`Generated On: ${dateStr}`, pageWidth - margin, curY + 10.5, { align: "right" });
  doc.text(`Generated By: ${userName}`,  pageWidth - margin, curY + 15,   { align: "right" });

  curY = Math.max(subY, curY + 19) + 3;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(margin, curY, pageWidth - margin, curY);
  curY += 6;

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.  KPI SUMMARY CARDS
  // ─────────────────────────────────────────────────────────────────────────────
  const totalSvcs    = services.length;
  const activeSvcs   = services.filter((s) => s.is_active).length;
  const inactiveSvcs = totalSvcs - activeSvcs;
  const uniqueCats   = new Set(services.map((s) => s.category_name || "Uncategorised")).size;

  const kpis = [
    { label: "TOTAL SERVICES",    value: String(totalSvcs) },
    { label: "ACTIVE SERVICES",   value: String(activeSvcs) },
    { label: "INACTIVE SERVICES", value: String(inactiveSvcs) },
    { label: "CATEGORIES",        value: String(uniqueCats) },
  ];

  const gap       = 3.5;
  const cardW     = (contentW - gap * 3) / 4;
  const cardH     = 16;

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardW + gap);
    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, curY, cardW, cardH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(kpi.label, x + 3.5, curY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TEXT);
    doc.text(kpi.value, x + 3.5, curY + 12.5);
  });

  curY += cardH + 8;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.  SUMMARY TABLE
  // ─────────────────────────────────────────────────────────────────────────────
  // Section label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.text("Service Summary", margin, curY);
  curY += 5;

  autoTable(doc, {
    head: [["#", "Service Name", "Category", "Duration", "Price", "GST", "Status"]],
    body: services.map((s, i) => [
      String(i + 1),
      d(s.name),
      d(s.category_name),
      s.duration ? `${s.duration} min` : "—",
      formatPricePDF(s.price, currencySym),
      formatGST(s),
      s.is_active ? "Active" : "Inactive",
    ]),
    startY: curY,
    margin: { left: margin, right: margin, bottom: 18 },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      overflow: "linebreak",
      textColor: TEXT,
      lineColor: BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: CARD_BG },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: 44, fontStyle: "bold" },
      2: { cellWidth: 34 },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 24, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        data.cell.styles.textColor = data.cell.raw === "Active" ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Capture the Y position where autoTable finished
  curY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;



  // ─────────────────────────────────────────────────────────────────────────────
  // 5.  FOOTERS — applied last so pageCount is accurate
  // ─────────────────────────────────────────────────────────────────────────────
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) drawFooter(p, pageCount);

  doc.save(`Services_Catalog_${formatDisplayDate(generatedAt)}.pdf`);
};

// ── Excel export ───────────────────────────────────────────────────────────────
export const exportServicesExcel = (services: Service[]) => {
  const headerRow = COLS.map((c) => c.header);
  const bodyRows  = legacyRows(services);
  const generatedAt = new Date();
  const data = [
    ["Services & Bundles Catalogue"],
    ["Generated", generatedAt],
    [],
    headerRow,
    ...bodyRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }];
  ws.B2 = { t: "d", v: generatedAt, z: "dd/mm/yyyy h:mm:ss AM/PM" };
  ws["!cols"] = headerRow.map((header, i) => ({
    wch: Math.min(Math.max(header.length, ...bodyRows.map((row) => String(row[i] ?? "").length)) + 2, 40),
  }));
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 3, c: 0 },
      e: { r: 3 + bodyRows.length, c: headerRow.length - 1 },
    }),
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Services");
  XLSX.writeFile(wb, `Services_Catalog_${formatDisplayDate(generatedAt)}.xlsx`);
};

// ── CSV export ─────────────────────────────────────────────────────────────────
export const exportServicesCSV = (services: Service[]) => {
  const data = [COLS.map((c) => c.header), ...legacyRows(services)];
  const csv  = data
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Services_Catalog_${formatDisplayDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
