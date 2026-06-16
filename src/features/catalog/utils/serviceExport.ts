import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Service } from "../types/catalog.types";

const d = (v: unknown) => (v == null || v === "" ? "—" : String(v));
const bool = (v: unknown) => (v ? "Yes" : "No");
const formatExportDate = (value: Date | string | number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid export date");
  }
  return date.toLocaleDateString("en-GB");
};
const formatGeneratedAt = (value: Date | string | number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid generated-at date");
  }
  const day = date.toLocaleDateString("en-GB");
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${day} ${time}`;
};
const fmt = (v: unknown) => {
  if (!v) return "—";
  try { return formatExportDate(String(v)); } catch { return String(v); }
};

const COLS: { header: string; fn: (s: Service) => string }[] = [
  { header: "Type",             fn: (s) => d((s as any).type || "Service") },
  { header: "Name",             fn: (s) => d(s.name) },
  { header: "Category",         fn: (s) => d(s.category_name) },
  { header: "Description",      fn: (s) => d(s.description) },
  { header: "Price Type",       fn: (s) => d(s.price_type || "fixed") },
  { header: "Price / Retail",   fn: (s) => d(s.price) },
  { header: "Discounted Price", fn: (s) => d(s.discounted_price) },
  { header: "Duration (min)",   fn: (s) => d(s.duration) },
  { header: "Available For",    fn: (s) => d(s.gender_preference) },
  { header: "Online Booking",   fn: (s) => bool(s.online_booking) },
  { header: "Commission",       fn: (s) => bool(s.commission_enabled) },
  { header: "Resource Required",fn: (s) => bool(s.resource_required) },
  { header: "Status",           fn: (s) => (s.is_active ? "Active" : "Inactive") },
  { header: "Created At",       fn: (s) => fmt((s as any).created_at) },
];

const rows = (services: Service[]) => services.map((s) => COLS.map((c) => c.fn(s)));

export const exportServicesPDF = (services: Service[]) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Services & Bundles Catalogue", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated: ${formatGeneratedAt(new Date())}`, 14, 25);

  autoTable(doc, {
    head: [COLS.map((c) => c.header)],
    body: rows(services),
    startY: 30,
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak", textColor: [30, 30, 30] },
    headStyles: {
      fillColor: [237, 233, 254],
      textColor: [55, 48, 163],
      fontStyle: "bold",
      fontSize: 8,
      lineColor: [196, 181, 253],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
    columnStyles: {
      1: { cellWidth: 30 },
      3: { cellWidth: 28 },
    },
  });

  doc.save("services.pdf");
};

export const exportServicesExcel = (services: Service[]) => {
  const headerRow = COLS.map((c) => c.header);
  const bodyRows = rows(services);
  const generatedAt = new Date();
  const data = [
    ["Services & Bundles Catalogue"],
    ["Generated", generatedAt],
    [],
    headerRow,
    ...bodyRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
  ];
  ws.B2 = {
    t: "d",
    v: generatedAt,
    z: "dd/mm/yyyy h:mm:ss AM/PM",
  };
  ws["!cols"] = headerRow.map((header, i) => {
    const maxDataWidth = Math.max(
      header.length,
      ...bodyRows.map((row) => String(row[i] ?? "").length),
    );
    return {
      wch: Math.min(Math.max(maxDataWidth + 2, 14), 40),
    };
  });
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 3, c: 0 },
      e: { r: 3 + bodyRows.length, c: headerRow.length - 1 },
    }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Services");
  XLSX.writeFile(wb, "services.xlsx");
};

export const exportServicesCSV = (services: Service[]) => {
  const data = [COLS.map((c) => c.header), ...rows(services)];
  const csv = data
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "services.csv";
  a.click();
  URL.revokeObjectURL(url);
};
