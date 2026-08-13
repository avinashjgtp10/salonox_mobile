import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BoxArrowUp, FileEarmarkSpreadsheet, FiletypePdf, FileEarmarkText, ChevronDown } from "react-bootstrap-icons";
import "./ReportExportButton.scss";

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
    const data = rows();
    const escape = (v: string | number) => {
      const s = String(v ?? "");
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

  const exportPdf = () => {
    const data = rows();
    // Real one-click file download (no print dialog, no popup to be
    // blocked) — same jsPDF + autoTable pattern already used by
    // serviceExport.ts/staffExport.ts/commissionExport.ts elsewhere in the app.
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 16);

    // Optional metadata block (date range / filters / summary) — only present
    // when the caller passes these props, so startY collapses back to the
    // original static 22 for every report that doesn't opt in.
    let y = 16;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    if (dateRangeLabel) { y += 6; doc.text(`Date Range: ${dateRangeLabel}`, 14, y); }
    filterLines.forEach(line => { y += 5; doc.text(line, 14, y); });
    if (summaryLines.length) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, y);
      doc.setFont("helvetica", "normal");
      summaryLines.forEach(line => { y += 5; doc.text(line, 14, y); });
    }
    doc.setTextColor(30, 30, 30);

    autoTable(doc, {
      head: [headers],
      body: data.map(r => r.map(c => String(c ?? ""))),
      startY: y + 6,
      styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak", textColor: [30, 30, 30] },
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [17, 24, 39],
        fontStyle: "bold",
        fontSize: 8,
        lineColor: [229, 231, 235],
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      bodyStyles: { lineColor: [229, 231, 235], lineWidth: 0.2 },
    });

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
