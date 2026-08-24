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

const formatFileDate = (value: Date) => formatDateDDMMYYYY(value);

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

export interface DailySummaryData {
  openedAt?: string | null;
  closedAt?: string | null;
  openingBalance?: number;
  cashRevenue?: number;
  cashExpense?: number;
  closingBalance?: number;
  inStoreCash?: number;
  reconciliationAmount?: number;
  remarks?: string | null;
  // Split-payment-aware totals from the cash counter's own window (backend
  // credits each leg of a Cash+UPI+Card split to its own method) — prefer
  // these over paymentCounts.amounts below, which comes from the Daily
  // Sheet report and collapses a split payment's whole amount onto
  // whichever single method was recorded last.
  upiAmount?: number;
  cardAmount?: number;
  totalRevenue?: number;
  totalSales?: number;
  totalPaymentsCollected?: number;
  paymentBreakdown?: {
    cash?: number;
    card?: number;
    upi?: number;
    other?: number;
  };
  paymentCounts?: {
    cash?: number;
    card?: number;
    upi?: number;
    amounts?: {
      cash?: number;
      card?: number;
      upi?: number;
    };
  };
  appointments?: {
    total?: number;
    completed?: number;
    cancelledNoShow?: number;
  };
  salesBreakdown?: {
    servicesSold?: number;
    productsSold?: number;
    packagesMembershipsSold?: number;
  };
  financialAdjustments?: {
    discounts?: number;
    gstTaxes?: number;
    tips?: number;
    refunds?: number;
    pendingPartial?: number;
  };
}

export const exportCounterSummaryPDF = (
  dashboard: DailySummaryData,
  salonName = "Salon",
  options: { download?: boolean } = { download: false }
): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;

  const openedAtStr = dashboard.openedAt
    ? formatDateDDMMYYYY(new Date(dashboard.openedAt)) +
      " " +
      new Date(dashboard.openedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Previous Business Day";

  const businessDate = dashboard.openedAt
    ? formatDateDDMMYYYY(new Date(dashboard.openedAt))
    : formatDateDDMMYYYY(new Date());

  const generatedAt = formatGeneratedAt(new Date());

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75);
  doc.text(salonName, margin, 18);

  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text("Daily Salon Summary Report", margin, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Business Date: ${businessDate}`, margin, 31);
  doc.text(`Counter Session Opened: ${openedAtStr}`, margin, 36);
  doc.text(`Report Generated On: ${generatedAt}`, margin, 41);

  // ── 1. Revenue & Sales Summary ──
  const cashRev = dashboard.cashRevenue ?? 0;
  const totalRev = dashboard.totalRevenue ?? cashRev;
  const totalSales = dashboard.totalSales ?? totalRev;
  const cardAmt = dashboard.paymentBreakdown?.card ?? 0;
  const upiAmt = dashboard.paymentBreakdown?.upi ?? 0;
  const otherAmt = dashboard.paymentBreakdown?.other ?? 0;
  const totalPayments = dashboard.totalPaymentsCollected ?? (cashRev + cardAmt + upiAmt + otherAmt);

  const revenueRows = [
    ["Total Revenue", `Rs. ${totalRev.toLocaleString("en-IN")}`],
    ["Total Sales Volume", `Rs. ${totalSales.toLocaleString("en-IN")}`],
    ["Total Payments Collected", `Rs. ${totalPayments.toLocaleString("en-IN")}`],
  ];

  autoTable(doc, {
    head: [["Revenue & Sales Overview", "Amount"]],
    body: revenueRows,
    startY: 46,
    styles: { fontSize: 9.5, cellPadding: 3.5, textColor: [30, 30, 30] },
    headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" }, 1: { cellWidth: 70, halign: "right", fontStyle: "bold" } },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 6;

  // ── 2. Payment Method Breakdown ──
  const paymentRows = [
    ["Cash Payments", `Rs. ${cashRev.toLocaleString("en-IN")}`],
    ["Card Payments", `Rs. ${cardAmt.toLocaleString("en-IN")}`],
    ["UPI / QR Payments", `Rs. ${upiAmt.toLocaleString("en-IN")}`],
    ["Other Payment Methods", `Rs. ${otherAmt.toLocaleString("en-IN")}`],
    ["Reconciled Total Collected", `Rs. ${totalPayments.toLocaleString("en-IN")}`],
  ];

  autoTable(doc, {
    head: [["Payment Method Breakdown", "Amount Collected"]],
    body: paymentRows,
    startY: currentY,
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 30, 30] },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 70, halign: "right", fontStyle: "bold" } },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // ── 3. Appointments & Sales Breakdown ──
  const totalAppts = dashboard.appointments?.total ?? 0;
  const completedAppts = dashboard.appointments?.completed ?? 0;
  const cancelledAppts = dashboard.appointments?.cancelledNoShow ?? 0;

  const apptRows = [
    ["Total Appointments Scheduled", `${totalAppts}`],
    ["Completed Appointments", `${completedAppts}`],
    ["Cancelled / No-Show Appointments", `${cancelledAppts}`],
    ["Services Sold", `${dashboard.salesBreakdown?.servicesSold ?? 0}`],
    ["Products Sold", `${dashboard.salesBreakdown?.productsSold ?? 0}`],
    ["Packages & Memberships Sold", `${dashboard.salesBreakdown?.packagesMembershipsSold ?? 0}`],
  ];

  autoTable(doc, {
    head: [["Appointments & Sales Activity", "Count / Status"]],
    body: apptRows,
    startY: currentY,
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 30, 30] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 70, halign: "right" } },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // ── 4. Cash Counter Reconciliation Summary ──
  const openBal = dashboard.openingBalance ?? 0;
  const cashExp = dashboard.cashExpense ?? 0;
  const expClosing = dashboard.closingBalance ?? (openBal + cashRev - cashExp);
  const inStore = dashboard.inStoreCash ?? expClosing;
  const variance = dashboard.reconciliationAmount ?? (inStore - expClosing);

  const counterRows = [
    ["Opening Cash Balance", `Rs. ${openBal.toLocaleString("en-IN")}`],
    ["Cash Revenue (+)", `Rs. ${cashRev.toLocaleString("en-IN")}`],
    ["Cash Expenses (-)", `Rs. ${cashExp.toLocaleString("en-IN")}`],
    ["Expected Closing Balance", `Rs. ${expClosing.toLocaleString("en-IN")}`],
    ["Actual In-Store Cash Count", `Rs. ${inStore.toLocaleString("en-IN")}`],
    ["Cash Difference / Variance", `Rs. ${variance.toLocaleString("en-IN")}`],
  ];

  autoTable(doc, {
    head: [["Cash Counter Session Summary", "Amount"]],
    body: counterRows,
    startY: currentY,
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 30, 30] },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" }, 1: { cellWidth: 70, halign: "right", fontStyle: "bold" } },
  });

  if (options.download) {
    doc.save(`Daily_Salon_Summary_${formatFileDate(new Date())}.pdf`);
  }

  return doc.output("blob");
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

