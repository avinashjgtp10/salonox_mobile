import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BoxArrowUp, FileEarmarkSpreadsheet, FiletypePdf, FileEarmarkText, ChevronDown } from "react-bootstrap-icons";
import { usePermissions } from "../../hooks/usePermissions";
import { useAppDispatch } from "../../hooks/useAppRedux";
import { showPermissionDenied } from "../../store/permissionDialogSlice";
import "./ReportExportButton.scss";

// Same friendly copy PermissionGuard and the interceptor-driven global popup
// already use for a backend 403 — this component never hits the backend
// (the file is built entirely client-side from already-fetched rows), so
// this is the only enforcement point export_csv/export_excel/export_pdf
// actually have for Reports; without it, toggling them off in Settings had
// no effect here at all.
const friendlyDenied = (permKey: string) =>
  `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`;

interface ReportExportButtonProps {
  /** PDF title / Excel sheet header */
  title: string;
  /** Column header labels */
  headers: string[];
  /** Returns the rows to export — called at click time so data is always fresh */
  rows: () => (string | number)[][];
  /** Base filename (no extension) */
  filename: string;
  /** "icon" (default, existing icon-only trigger) or "button" (labelled "Download ▾" trigger) */
  variant?: "icon" | "button";
  /** Show a CSV export option in the dropdown */
  csv?: boolean;
  /** Disables the trigger button and dropdown (e.g. while filters are in an invalid state) */
  disabled?: boolean;
  /** Optional "From - To" date range label rendered in the PDF header */
  dateRangeLabel?: string;
  /** Optional list of applied-filter description lines rendered in the PDF header */
  filterLines?: string[];
  /** Optional summary/stat lines rendered in the PDF header, above the table */
  summaryLines?: string[];
}

const ReportExportButton = ({
  title, headers, rows, filename, variant = "icon", csv = false,
  disabled = false, dateRangeLabel, filterLines = [], summaryLines = [],
}: ReportExportButtonProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { can } = usePermissions();
  const dispatch = useAppDispatch();

  // Returns true (and lets the caller proceed) only if permKey is granted;
  // otherwise shows the same popup a blocked backend call would and stops
  // the export before any file is built.
  const requireExportPermission = (permKey: "export_csv" | "export_excel" | "export_pdf") => {
    if (can(permKey)) return true;
    dispatch(showPermissionDenied(friendlyDenied(permKey)));
    setOpen(false);
    return false;
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const exportCsv = () => {
    if (!requireExportPermission("export_csv")) return;
    const data = rows();
    // Excel's CSV importer auto-detects date-like strings (our own
    // "DD-MM-YYYY" values) and long digit-only strings (phone numbers,
    // invoice/reference numbers) and silently converts them into real
    // date/number cells on open — dates then render as "####" whenever the
    // column is a hair too narrow, and long numbers get truncated into
    // scientific notation ("9.88E+09"), permanently losing digits. Wrapping
    // those specific values as a text-result formula (`="value"`) forces
    // Excel to keep them exactly as written instead of reinterpreting them.
    const looksLikeDateOrLongNumber = (s: string) =>
      /^\d{2}-\d{2}-\d{4}(?:\s.+)?$/.test(s) || /^\d{9,}$/.test(s);
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      if (looksLikeDateOrLongNumber(s)) {
        // CSV-field-quoted `="value"` — Excel evaluates this as a formula
        // whose result is the literal text, bypassing its own auto-typing.
        return `"=""${s.replace(/"/g, '""')}"""`;
      }
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvContent = [headers, ...data].map(r => r.map(escape).join(",")).join("\n");
    // UTF-8 BOM ("﻿") — without it Excel guesses Windows-1252 for the
    // file and mangles non-ASCII characters (— becomes â€”, ₹ becomes â‚¹).
    const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const exportExcel = () => {
    if (!requireExportPermission("export_excel")) return;
    const data = rows();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws["!cols"] = headers.map((h, i) => ({
      wch: Math.max(h.length + 2, ...data.map(r => String(r[i] ?? "").length + 2)),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    setOpen(false);
  };

  // jsPDF's built-in Helvetica is WinAnsi-encoded, so ₹ (U+20B9) is truncated
  // to its low byte 0xB9 and prints as "¹" — in column headers like
  // "Unit Cost (₹)" and in any formatted amount inside a cell. The symbol is
  // dropped rather than spelled out: the salon only ever bills in one
  // currency, so the amounts are unambiguous without it.
  //
  // Removing it leaves "Unit Cost ()" behind, so a parenthesis left empty by
  // the removal is dropped with it — but only when empty, so a real note like
  // "Unit Cost (avg)" keeps its brackets.
  //
  // PDF only: the CSV path writes a UTF-8 BOM and XLSX stores UTF-8 natively,
  // so ₹ renders correctly in those two and must be left alone.
  const pdfSafe = (v: string | number) =>
    String(v ?? "")
      .replace(/₹/g, "")
      .replace(/\s*\(\s*\)/g, "")
      .trim();

  const exportPdf = () => {
    if (!requireExportPermission("export_pdf")) return;
    const data = rows();
    // Real one-click file download (no print dialog, no popup to be
    // blocked) — same jsPDF + autoTable pattern already used by
    // serviceExport.ts/staffExport.ts/commissionExport.ts elsewhere in the app.
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Wide reports (e.g. a 22-column Sales Summary) crush every column
    // illegibly small if left at a fixed font size — scale both down as the
    // column count grows so headers/values stay readable instead of
    // overlapping or truncating.
    const colCount = headers.length;
    const bodyFontSize = colCount > 16 ? 5.5 : colCount > 10 ? 6.5 : 7.5;
    const headFontSize = bodyFontSize + 0.5;
    const cellPadding = colCount > 16 ? 1.5 : 2.5;

    // Draws the title (+ date range / filters / summary, on page 1 only) at
    // a fixed top position — called once before the table for page 1's
    // exact layout, and again from didDrawPage for every later page so a
    // reader who jumps straight to page 3 still knows what report and range
    // they're looking at, instead of a bare continuation of table rows.
    const drawHeader = (full: boolean) => {
      let y = 14;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(pdfSafe(title), margin, y);

      if (!full) return y;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      if (dateRangeLabel) { y += 6; doc.text(pdfSafe(`Date Range: ${dateRangeLabel}`), margin, y); }
      filterLines.forEach((line) => { y += 5; doc.text(pdfSafe(line), margin, y); });
      if (summaryLines.length) {
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text("Summary", margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        summaryLines.forEach((line) => { y += 5; doc.text(pdfSafe(line), margin, y); });
      }
      doc.setTextColor(30, 30, 30);
      return y;
    };

    const tableStartY = drawHeader(true) + 6;

    autoTable(doc, {
      head: [headers.map(pdfSafe)],
      body: data.map(r => r.map(pdfSafe)),
      startY: tableStartY,
      margin: { left: margin, right: margin, top: 20, bottom: 16 },
      styles: { fontSize: bodyFontSize, cellPadding, overflow: "linebreak", valign: "middle", textColor: [30, 30, 30] },
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [17, 24, 39],
        fontStyle: "bold",
        fontSize: headFontSize,
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
      // A table too wide for one page's width continues onto extra pages
      // (repeating the header row) instead of squeezing every column down
      // to an illegible or overlapping width, or silently cutting the
      // right-most columns off the page.
      horizontalPageBreak: true,
      showHead: "everyPage",
      didDrawPage: (hookData) => {
        if (hookData.pageNumber > 1) drawHeader(false);
      },
    });

    // Footer drawn last, once the real page count is known — "Page X of Y"
    // plus a generated-on timestamp, on every page, so a printed/shared copy
    // is traceable and multi-page exports read as one coherent document.
    const totalPages = doc.getNumberOfPages();
    const generatedOn = new Date().toLocaleString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated on ${generatedOn}`, margin, pageHeight - 7);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
    }

    doc.save(`${filename}.pdf`);
    setOpen(false);
  };

  return (
    <div className="rp-detail-export-wrap" ref={wrapRef}>
      {variant === "button" ? (
        <button className="rp-download-btn" onClick={() => setOpen(v => !v)} disabled={disabled}>
          <BoxArrowUp size={14} /> Download <ChevronDown size={11} />
        </button>
      ) : (
        <button className="rp-detail-icon-btn" title="Export" onClick={() => setOpen(v => !v)} disabled={disabled}>
          <BoxArrowUp size={16} />
        </button>
      )}
      {!disabled && open && (
        <div className="rp-detail-export-dropdown">
          {csv && (
            <div className="rp-detail-export-item" onClick={exportCsv}>
              <FileEarmarkText size={14} /> CSV (.csv)
            </div>
          )}
          <div className="rp-detail-export-item" onClick={exportExcel}>
            <FileEarmarkSpreadsheet size={14} /> Excel (.xlsx)
          </div>
          <div className="rp-detail-export-item" onClick={exportPdf}>
            <FiletypePdf size={14} /> PDF (.pdf)
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportExportButton;
