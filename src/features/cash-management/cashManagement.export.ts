import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatDateDDMMYYYY } from "../../utils/dateFormat";

export type CashManagementExportFormat = "pdf" | "excel" | "csv";

export interface CashManagementExportDataset {
  title: string;
  columns: string[];
  rows: string[][];
  appliedFilters: string[];
  totalRecords: number;
}

interface ExportOptions {
  dataset: CashManagementExportDataset;
  exportedAt?: Date;
  salonName?: string | null;
}

const formatFileDate = (value: Date) => value.toISOString().slice(0, 10);

const formatGeneratedAt = (value: Date) =>
  `${formatDateDDMMYYYY(value)} ${value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;

export const getCashManagementExportFilename = (
  format: CashManagementExportFormat,
  exportedAt = new Date(),
) => {
  const ext = format === "excel" ? "xlsx" : format;
  return `Cash_Management_Report_${formatFileDate(exportedAt)}.${ext}`;
};

export const exportCashManagementPDF = ({
  dataset,
  exportedAt = new Date(),
  salonName,
}: ExportOptions) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const filename = getCashManagementExportFilename("pdf", exportedAt);
  const filtersLine = dataset.appliedFilters.length
    ? dataset.appliedFilters.join(" | ")
    : "No filters applied";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Cash Management Report", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);

  let metaY = 25;
  if (salonName) {
    doc.text(`Salon: ${salonName}`, 14, metaY);
    metaY += 6;
  }
  doc.text(`Section: ${dataset.title}`, 14, metaY);
  metaY += 6;
  doc.text(`Exported: ${formatGeneratedAt(exportedAt)}`, 14, metaY);
  metaY += 6;
  doc.text(`Applied Filters: ${filtersLine}`, 14, metaY);
  metaY += 6;
  doc.text(`Total Records: ${dataset.totalRecords}`, 14, metaY);

  autoTable(doc, {
    head: [dataset.columns],
    body: dataset.rows,
    startY: metaY + 5,
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      overflow: "linebreak",
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [23, 32, 51],
      fontStyle: "bold",
      fontSize: 8,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
  });

  doc.save(filename);
};

export const exportCashManagementExcel = ({
  dataset,
  exportedAt = new Date(),
}: ExportOptions) => {
  const filename = getCashManagementExportFilename("excel", exportedAt);
  const ws = XLSX.utils.aoa_to_sheet([dataset.columns, ...dataset.rows]);
  ws["!cols"] = dataset.columns.map((header, index) => {
    const maxRowWidth = Math.max(
      header.length,
      ...dataset.rows.map((row) => String(row[index] ?? "").length),
    );
    return { wch: Math.min(Math.max(maxRowWidth + 2, 14), 30) };
  });
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: dataset.rows.length, c: dataset.columns.length - 1 },
    }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, dataset.title.slice(0, 31) || "Report");
  XLSX.writeFile(wb, filename);
};

export const exportCounterSummaryPDF = (
  dashboard: {
    openedAt?: string | null;
    openingBalance?: number;
    cashRevenue?: number;
    cashExpense?: number;
    closingBalance?: number;
    remarks?: string | null;
  },
  salonName = "Salon",
) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  const openedAtStr = dashboard.openedAt
    ? formatDateDDMMYYYY(new Date(dashboard.openedAt)) +
      " " +
      new Date(dashboard.openedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Previous Session";

  const generatedAt = formatGeneratedAt(new Date());

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 27, 75);
  doc.text("Cash Counter Daily Summary", margin, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Salon: ${salonName}`, margin, 27);
  doc.text(`Opened On: ${openedAtStr}`, margin, 32);
  doc.text(`Exported On: ${generatedAt}`, margin, 37);

  // Table summary
  const rows = [
    ["Opening Balance", `Rs. ${(dashboard.openingBalance ?? 0).toLocaleString("en-IN")}`],
    ["Cash Revenue", `Rs. ${(dashboard.cashRevenue ?? 0).toLocaleString("en-IN")}`],
    ["Cash Expense", `Rs. ${(dashboard.cashExpense ?? 0).toLocaleString("en-IN")}`],
    ["Expected Closing Balance", `Rs. ${(dashboard.closingBalance ?? 0).toLocaleString("en-IN")}`],
  ];

  autoTable(doc, {
    head: [["Metric", "Amount"]],
    body: rows,
    startY: 44,
    styles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [30, 27, 75],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 10.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold" },
      1: { cellWidth: 80, halign: "right", fontStyle: "bold" },
    },
  });

  doc.save(`Cash_Counter_Summary_${formatFileDate(new Date())}.pdf`);
};

export const exportCashManagementCSV = ({
  dataset,
  exportedAt = new Date(),
}: ExportOptions) => {
  const filename = getCashManagementExportFilename("csv", exportedAt);
  const data = [dataset.columns, ...dataset.rows];
  const csv = data
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

