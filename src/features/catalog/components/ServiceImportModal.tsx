import { useRef, useState } from "react";
import {
  CloudUpload,
  FiletypeCsv,
  FileEarmarkExcel,
  CheckCircleFill,
  ExclamationCircleFill,
  X,
  Download,
  ArrowRepeat,
} from "react-bootstrap-icons";
import { Modal } from "../../../components/ui";
import api from "../../../services/api/axios";
import { SERVICES } from "../../../services/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportIssue {
  row: number;
  name?: string;
  status: "failed" | "skipped";
  reason: string;
  suggestion?: string;
}

export interface ImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  failed?: number;
  issues: ImportIssue[];
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Template & Helpers ───────────────────────────────────────────────────────

const SAMPLE_COLUMNS = ["Name", "Category", "Description", "Price / Retail Price", "Duration (min)"];
const SAMPLE_ROWS = [
  ["Hair Cut", "Hair", "Classic hair cut for all hair types", "500", "30"],
  ["Hair Color", "Hair", "Full hair coloring service", "1500", "120"],
  ["Manicure", "Nails", "Basic manicure with nail polish", "400", "45"],
  ["Facial", "Skin", "Deep cleansing facial", "1200", "60"],
];

function downloadTemplate() {
  const csv = [SAMPLE_COLUMNS, ...SAMPLE_ROWS].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "services_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function downloadErrorReport(issues: ImportIssue[]) {
  const header = ["Row", "Service Name", "Status", "Reason", "Suggested Fix"];
  const lines = issues.map((iss) =>
    [
      iss.row || "",
      iss.name || "",
      iss.status === "skipped" ? "Skipped" : "Failed",
      iss.reason,
      iss.suggestion || "",
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = [header.map(csvCell).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "services_import_error_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseStringError(str: string, index: number): ImportIssue {
  const s = str.trim();

  // Pattern: "Row 1 (Hair Cut): Duplicate Service Name" or "Row 1 [Hair Cut]: Missing Category"
  const bracketMatch = s.match(/^Row\s*(\d+)\s*(?:\(([^)]+)\)|\[([^\]]+)\]):\s*(.*)$/i);
  if (bracketMatch) {
    return {
      row: parseInt(bracketMatch[1], 10),
      name: bracketMatch[2] || bracketMatch[3] || "—",
      status: "failed",
      reason: bracketMatch[4].trim(),
    };
  }

  // Pattern: "Row 1: Hair Cut: Duplicate Service Name"
  const doubleColonMatch = s.match(/^Row\s*(\d+):\s*([^:]+):\s*(.*)$/i);
  if (doubleColonMatch) {
    const candidateName = doubleColonMatch[2].trim();
    const fieldKeywords = ["name", "price", "category", "duration", "description", "retail price", "service name"];
    if (!fieldKeywords.includes(candidateName.toLowerCase())) {
      return {
        row: parseInt(doubleColonMatch[1], 10),
        name: candidateName,
        status: "failed",
        reason: doubleColonMatch[3].trim(),
      };
    }
  }

  // Pattern: "Row 1 - Hair Cut: Missing Category" or "Row 1: Hair Cut - Missing Category"
  const dashMatch = s.match(/^Row\s*(\d+)\s*[-:]\s*([^-:]+)\s*[-:]\s*(.*)$/i);
  if (dashMatch) {
    const candidateName = dashMatch[2].trim();
    const fieldKeywords = ["name", "price", "category", "duration", "description", "retail price", "service name"];
    if (!fieldKeywords.includes(candidateName.toLowerCase())) {
      return {
        row: parseInt(dashMatch[1], 10),
        name: candidateName,
        status: "failed",
        reason: dashMatch[3].trim(),
      };
    }
  }

  // Pattern: "Row 1: name is required" or "Row 1: Missing category"
  const rowMatch = s.match(/^Row\s*(\d+)[\s:-]+(.*)$/i);
  if (rowMatch) {
    const rowNum = parseInt(rowMatch[1], 10);
    const rest = rowMatch[2].trim();

    // If rest mentions a service name in quotes or after 'for'/'of', e.g. "Missing Category for Hair Cut"
    const forMatch = rest.match(/(.*)\s+(?:for|of)\s+['"]?([^'"]+)['"]?$/i);
    if (forMatch) {
      return {
        row: rowNum,
        name: forMatch[2].trim(),
        status: "failed",
        reason: forMatch[1].trim(),
      };
    }

    return {
      row: rowNum,
      name: "—",
      status: "failed",
      reason: rest,
    };
  }

  return {
    row: index + 1,
    name: "—",
    status: "failed",
    reason: s,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceImportModal({ show, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ACCEPTED = [".csv", ".xlsx", ".xls"];

  function handleClose() {
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  }

  function handleReImport() {
    setFile(null);
    setResult(null);
    setError(null);
    setTimeout(() => {
      fileRef.current?.click();
    }, 100);
  }

  function pickFile(f: File) {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError("Only CSV and Excel (.xlsx, .xls) files are supported.");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(SERVICES.IMPORT, formData, {
        headers: { "Content-Type": undefined },
        timeout: 120_000,
      });

      const data = res.data?.data ?? res.data;
      const rawIssues = data.issues ?? data.errors ?? data.failures ?? [];

      const parsedIssues: ImportIssue[] = rawIssues.map((e: any, i: number) => {
        if (typeof e === "object" && e !== null) {
          return {
            row: e.row ?? i + 1,
            name: e.name || e.service_name || e.serviceName || e.service || "—",
            status: e.status === "skipped" ? "skipped" : "failed",
            reason: e.reason || e.error || e.message || "Validation error",
            suggestion: e.suggestion || e.suggested_fix || undefined,
          };
        }
        return parseStringError(String(e), i);
      });

      const importedCount = data.imported ?? data.success ?? 0;
      const skippedCount = data.skipped ?? 0;
      const failedCount = data.failed ?? parsedIssues.filter((iss) => iss.status === "failed").length;
      const totalRows =
        data.total_rows ?? data.total ?? (importedCount + skippedCount + failedCount || parsedIssues.length);

      setResult({
        total_rows: totalRows,
        imported: importedCount,
        skipped: skippedCount,
        failed: failedCount,
        issues: parsedIssues,
      });

      if (importedCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Import failed. Please check your file and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isCSV = file?.name.toLowerCase().endsWith(".csv");
  const importedCount = result?.imported ?? 0;
  const failedCount = result?.failed ?? result?.issues?.filter((i) => i.status === "failed").length ?? 0;

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Import Services"
      size="lg"
      footer={
        result ? (
          <div className="sim-footer-btns">
            <button type="button" className="sim-btn sim-btn--ghost" onClick={handleReImport}>
              <ArrowRepeat size={14} className="me-1" /> Re-import
            </button>
            <button type="button" className="sim-btn sim-btn--primary" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="sim-footer-btns">
            <button type="button" className="sim-btn sim-btn--ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="sim-btn sim-btn--primary" onClick={handleImport} disabled={!file || loading}>
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        )
      }
    >
      <div className="service-import-modal">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
        />

        {/* Template download */}
        <div className="sim-template-row">
          <span className="sim-template-label">Need the correct format?</span>
          <button type="button" className="sim-template-btn" onClick={downloadTemplate}>
            <Download size={13} /> Download sample template
          </button>
        </div>

        {/* Expected columns */}
        <div className="sim-columns-wrap">
          <p className="sim-columns-title">Expected columns:</p>
          <div className="sim-columns-list">
            {SAMPLE_COLUMNS.map((col) => (
              <span key={col} className="sim-col-chip">
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        {!result && (
          <div
            className={`sim-dropzone ${dragging ? "sim-dropzone--dragging" : ""} ${file ? "sim-dropzone--has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
          >
            {file ? (
              <div className="sim-selected-file">
                {isCSV ? (
                  <FiletypeCsv size={28} className="sim-file-icon sim-file-icon--csv" />
                ) : (
                  <FileEarmarkExcel size={28} className="sim-file-icon sim-file-icon--xlsx" />
                )}
                <div className="sim-file-info">
                  <span className="sim-file-name">{file.name}</span>
                  <span className="sim-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  className="sim-remove-file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError(null);
                  }}
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <CloudUpload size={36} className="sim-upload-icon" />
                <p className="sim-drop-text">
                  Drag &amp; drop your file here, or <span className="sim-browse-link">browse</span>
                </p>
                <p className="sim-drop-hint">Supports CSV, XLSX, XLS · Max 10 MB</p>
              </>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="sim-alert sim-alert--error">
            <ExclamationCircleFill size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Result & Detailed Error Report */}
        {result && (
          <div className="sim-result">
            <div className="sim-result-header">
              <CheckCircleFill size={20} className="sim-result-icon" />
              <span className="sim-result-title">
                Import complete — {importedCount} service{importedCount !== 1 ? "s" : ""} imported successfully
              </span>
            </div>

            {/* Stats Summary Cards */}
            <div className="sim-result-stats">
              <div className="sim-stat">
                <span className="sim-stat-value">{result.total_rows}</span>
                <span className="sim-stat-label">Total rows</span>
              </div>
              <div className="sim-stat sim-stat--success">
                <span className="sim-stat-value">{result.imported}</span>
                <span className="sim-stat-label">Imported</span>
              </div>
              <div className="sim-stat sim-stat--warn">
                <span className="sim-stat-value">{result.skipped}</span>
                <span className="sim-stat-label">Skipped</span>
              </div>
              {failedCount > 0 && (
                <div className="sim-stat sim-stat--error">
                  <span className="sim-stat-value">{failedCount}</span>
                  <span className="sim-stat-label">Failed</span>
                </div>
              )}
            </div>

            {/* Detailed Issues Report */}
            {result.issues?.length > 0 && (
              <div className="sim-errors-wrap">
                <div className="sim-errors-head">
                  <p className="sim-errors-title">Rows needing attention ({result.issues.length})</p>
                  <button
                    type="button"
                    className="sim-report-btn"
                    onClick={() => downloadErrorReport(result.issues)}
                  >
                    <Download size={12} /> Download error report (CSV)
                  </button>
                </div>

                <div className="sim-issues-table-wrap">
                  <table className="sim-issues-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Service Name</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Suggested fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.issues.map((iss, i) => (
                        <tr key={i}>
                          <td>{iss.row || "—"}</td>
                          <td className="sim-service-name-col">{iss.name || "—"}</td>
                          <td>
                            <span className={`sim-status-chip sim-status-chip--${iss.status}`}>
                              {iss.status === "skipped" ? "Skipped" : "Failed"}
                            </span>
                          </td>
                          <td>{iss.reason}</td>
                          <td>{iss.suggestion || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Re-import Banner Prompt */}
            <div className="sim-reimport-banner">
              <span>Have corrected data? Upload the updated file to try again.</span>
              <button type="button" className="sim-reimport-btn" onClick={handleReImport}>
                <ArrowRepeat size={13} /> Re-import file
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .service-import-modal { display:flex; flex-direction:column; gap:16px; font-family: 'Inter', sans-serif; }
        .sim-template-row { display:flex; align-items:center; justify-content:space-between; }
        .sim-template-label { font-size:13px; color:#6b7280; }
        .sim-template-btn { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:500; color:#4f46e5; background:none; border:none; cursor:pointer; padding:0; }
        .sim-template-btn:hover { text-decoration:underline; }

        .sim-columns-wrap { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
        .sim-columns-title { font-size:12px; font-weight:600; color:#374151; margin:0 0 8px; }
        .sim-columns-list { display:flex; flex-wrap:wrap; gap:6px; }
        .sim-col-chip { background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:500; padding:2px 8px; border-radius:999px; }

        .sim-dropzone { border:2px dashed #d1d5db; border-radius:12px; padding:32px; display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:border-color .2s,background .2s; }
        .sim-dropzone:hover,.sim-dropzone--dragging { border-color:#4f46e5; background:#f5f3ff; }
        .sim-dropzone--has-file { cursor:default; padding:20px 24px; }
        .sim-upload-icon { color:#9ca3af; }
        .sim-drop-text { font-size:14px; color:#374151; margin:0; text-align:center; }
        .sim-browse-link { color:#4f46e5; font-weight:500; }
        .sim-drop-hint { font-size:12px; color:#9ca3af; margin:0; }

        .sim-selected-file { display:flex; align-items:center; gap:12px; width:100%; }
        .sim-file-icon--csv { color:#22c55e; }
        .sim-file-icon--xlsx { color:#16a34a; }
        .sim-file-info { flex:1; display:flex; flex-direction:column; }
        .sim-file-name { font-size:14px; font-weight:500; color:#111827; }
        .sim-file-size { font-size:12px; color:#9ca3af; }
        .sim-remove-file { background:none; border:none; color:#9ca3af; cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; }
        .sim-remove-file:hover { color:#ef4444; background:#fee2e2; }

        .sim-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; font-size:13px; }
        .sim-alert--error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }

        /* Result */
        .sim-result { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:16px; }
        .sim-result-header { display:flex; align-items:center; gap:8px; }
        .sim-result-icon { color:#16a34a; flex-shrink:0; }
        .sim-result-title { font-size:15px; font-weight:600; color:#15803d; }
        .sim-result-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(100px, 1fr)); gap:12px; }
        .sim-stat { background:#fff; border-radius:8px; padding:12px; text-align:center; border:1px solid #e5e7eb; display:flex; flex-direction:column; gap:4px; }
        .sim-stat-value { font-size:22px; font-weight:700; color:#111827; }
        .sim-stat-label { font-size:11px; color:#6b7280; }
        .sim-stat--success .sim-stat-value { color:#16a34a; }
        .sim-stat--warn .sim-stat-value { color:#d97706; }
        .sim-stat--error .sim-stat-value { color:#dc2626; }

        /* Detailed Errors Table */
        .sim-errors-wrap { background:#fef9c3; border:1px solid #fde68a; border-radius:8px; padding:12px; }
        .sim-errors-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
        .sim-errors-title { font-size:13px; font-weight:600; color:#92400e; margin:0; }
        .sim-report-btn { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:#92400e; background:#fff; border:1px solid #fde68a; border-radius:6px; padding:5px 10px; cursor:pointer; white-space:nowrap; transition:background .15s; }
        .sim-report-btn:hover { background:#fef3c7; }

        .sim-issues-table-wrap { max-height:280px; overflow-y:auto; overflow-x:auto; border:1px solid #fde68a; border-radius:6px; background:#fffdf5; }
        .sim-issues-table { width:100%; border-collapse:collapse; font-size:12px; }
        .sim-issues-table thead th { position:sticky; top:0; background:#fef3c7; color:#92400e; text-align:left; font-weight:600; padding:8px 12px; white-space:nowrap; border-bottom:1px solid #fde68a; }
        .sim-issues-table tbody td { padding:8px 12px; color:#78350f; border-bottom:1px solid #fef3c7; vertical-align:top; }
        .sim-issues-table tbody tr:last-child td { border-bottom:none; }
        .sim-service-name-col { font-weight:600; }
        .sim-status-chip { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
        .sim-status-chip--failed { background:#fee2e2; color:#b91c1c; }
        .sim-status-chip--skipped { background:#fef3c7; color:#b45309; }

        /* Re-import Banner */
        .sim-reimport-banner { display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fff; border:1px solid #d1d5db; border-radius:8px; padding:10px 14px; font-size:12.5px; color:#374151; flex-wrap:wrap; }
        .sim-reimport-btn { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; color:#4f46e5; background:#e0e7ff; border:1px solid #c7d2fe; border-radius:6px; padding:5px 12px; cursor:pointer; transition:background .15s; }
        .sim-reimport-btn:hover { background:#c7d2fe; }

        /* Footer */
        .sim-footer-btns { display:flex; gap:10px; justify-content:flex-end; width:100%; }
        .sim-btn { display:flex; align-items:center; padding:9px 20px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; transition:background .15s; }
        .sim-btn--primary { background:#111827; color:#fff; }
        .sim-btn--primary:hover:not(:disabled) { background:#1f2937; }
        .sim-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
        .sim-btn--ghost { background:transparent; color:#374151; border:1px solid #d1d5db; }
        .sim-btn--ghost:hover:not(:disabled) { background:#f3f4f6; }
      `}</style>
    </Modal>
  );
}
