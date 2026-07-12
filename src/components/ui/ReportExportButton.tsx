import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { BoxArrowUp, FileEarmarkSpreadsheet, FiletypePdf, FileEarmarkText, Printer, ChevronDown } from "react-bootstrap-icons";

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
  /** Show a Print option in the dropdown (opens the browser print dialog) */
  print?: boolean;
}

const ReportExportButton = ({ title, headers, rows, filename, variant = "icon", csv = false, print = false }: ReportExportButtonProps) => {
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
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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
    const tbody = data
      .map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`)
      .join("");
    const html = `<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; }
        h2   { margin: 0 0 16px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-weight: 600;
             border: 1px solid #e5e7eb; font-size: 11px; }
        td { padding: 7px 12px; border: 1px solid #e5e7eb; font-size: 11px; }
        tr:nth-child(even) td { background: #f9fafb; }
      </style></head><body>
      <h2>${title}</h2>
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
    setOpen(false);
  };

  return (
    <div className="rp-detail-export-wrap" ref={wrapRef}>
      {variant === "button" ? (
        <button className="rp-download-btn" onClick={() => setOpen(v => !v)}>
          <BoxArrowUp size={14} /> Download <ChevronDown size={11} />
        </button>
      ) : (
        <button className="rp-detail-icon-btn" title="Export" onClick={() => setOpen(v => !v)}>
          <BoxArrowUp size={16} />
        </button>
      )}
      {open && (
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
          {print && (
            <div className="rp-detail-export-item" onClick={() => { setOpen(false); window.print(); }}>
              <Printer size={14} /> Print
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportExportButton;
