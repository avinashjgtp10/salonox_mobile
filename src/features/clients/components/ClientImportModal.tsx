import { useRef, useState } from "react";
import { CloudUpload, FiletypeCsv, FileEarmarkExcel, CheckCircleFill, ExclamationCircleFill, X, Download } from "react-bootstrap-icons";
import { Modal } from "../../../components/ui";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";

interface ImportResult {
  total_rows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<string | { row?: number; message?: string }>;
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Columns the backend expects in the CSV/Excel file
const SAMPLE_COLUMNS = ["firstName", "lastName", "email", "mobile", "gender", "birthday", "clientNotes"];
const SAMPLE_ROWS = [
  ["John", "Doe", "john@example.com", "9876543210", "Male", "15-06-1990", "Regular customer"],
  ["Jane", "Smith", "jane@example.com", "8765432109", "Female", "22-03-1995", ""],
];

function downloadTemplate() {
  const csv = [SAMPLE_COLUMNS, ...SAMPLE_ROWS].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "clients_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function formatError(e: string | { row?: number; message?: string }): string {
  if (typeof e === "string") return e;
  return e.row ? `Row ${e.row}: ${e.message}` : (e.message ?? "Unknown error");
}

export default function ClientImportModal({ show, onClose, onSuccess }: Props) {
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
      const res = await api.post(CLIENT.IMPORT, formData, {
        headers: { "Content-Type": undefined },
        timeout: 60_000,
      });
      const data: ImportResult = res.data?.data ?? res.data;
      setResult(data);
      if ((data.imported ?? 0) > 0 || (data.updated ?? 0) > 0) onSuccess();
    } catch (err: any) {
      setError(err?.message || "Import failed. Please check your file and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isCSV = file?.name.toLowerCase().endsWith(".csv");

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Import Clients"
      size="lg"
      footer={
        result ? (
          <button className="cim-btn cim-btn--primary" onClick={handleClose}>Done</button>
        ) : (
          <div className="cim-footer-btns">
            <button className="cim-btn cim-btn--ghost" onClick={handleClose} disabled={loading}>Cancel</button>
            <button className="cim-btn cim-btn--primary" onClick={handleImport} disabled={!file || loading}>
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        )
      }
    >
      <div className="client-import-modal">
        {/* Template download */}
        <div className="cim-template-row">
          <span className="cim-template-label">Need the correct format?</span>
          <button className="cim-template-btn" onClick={downloadTemplate}>
            <Download size={13} /> Download sample template
          </button>
        </div>

        {/* Expected columns */}
        <div className="cim-columns-wrap">
          <p className="cim-columns-title">Expected columns:</p>
          <div className="cim-columns-list">
            {SAMPLE_COLUMNS.map((col) => (
              <span key={col} className="cim-col-chip">{col}</span>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        {!result && (
          <div
            className={`cim-dropzone ${dragging ? "cim-dropzone--dragging" : ""} ${file ? "cim-dropzone--has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
            />
            {file ? (
              <div className="cim-selected-file">
                {isCSV
                  ? <FiletypeCsv size={28} className="cim-file-icon cim-file-icon--csv" />
                  : <FileEarmarkExcel size={28} className="cim-file-icon cim-file-icon--xlsx" />
                }
                <div className="cim-file-info">
                  <span className="cim-file-name">{file.name}</span>
                  <span className="cim-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  className="cim-remove-file"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <CloudUpload size={36} className="cim-upload-icon" />
                <p className="cim-drop-text">Drag & drop your file here, or <span className="cim-browse-link">browse</span></p>
                <p className="cim-drop-hint">Supports CSV, XLSX, XLS · Max 10 MB</p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="cim-alert cim-alert--error">
            <ExclamationCircleFill size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="cim-result">
            <div className="cim-result-header">
              <CheckCircleFill size={20} className="cim-result-icon" />
              <span className="cim-result-title">Import complete</span>
            </div>
            <div className="cim-result-stats">
              <div className="cim-stat">
                <span className="cim-stat-value">{result.total_rows}</span>
                <span className="cim-stat-label">Total rows</span>
              </div>
              <div className="cim-stat cim-stat--success">
                <span className="cim-stat-value">{result.imported}</span>
                <span className="cim-stat-label">Imported</span>
              </div>
              <div className="cim-stat cim-stat--info">
                <span className="cim-stat-value">{result.updated}</span>
                <span className="cim-stat-label">Updated</span>
              </div>
              <div className="cim-stat cim-stat--warn">
                <span className="cim-stat-value">{result.skipped}</span>
                <span className="cim-stat-label">Skipped</span>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="cim-errors-wrap">
                <p className="cim-errors-title">Errors ({result.errors.length})</p>
                <ul className="cim-errors-list">
                  {result.errors.map((e, i) => (
                    <li key={i} className="cim-error-item">{formatError(e)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .client-import-modal { display:flex; flex-direction:column; gap:16px; }

        .cim-template-row { display:flex; align-items:center; justify-content:space-between; }
        .cim-template-label { font-size:13px; color:#6b7280; }
        .cim-template-btn { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:500; color:#4f46e5; background:none; border:none; cursor:pointer; padding:0; }
        .cim-template-btn:hover { text-decoration:underline; }

        .cim-columns-wrap { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
        .cim-columns-title { font-size:12px; font-weight:600; color:#374151; margin:0 0 8px; }
        .cim-columns-list { display:flex; flex-wrap:wrap; gap:6px; }
        .cim-col-chip { background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:500; padding:2px 8px; border-radius:999px; }

        .cim-dropzone { border:2px dashed #d1d5db; border-radius:12px; padding:32px; display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:border-color .2s,background .2s; }
        .cim-dropzone:hover,.cim-dropzone--dragging { border-color:#4f46e5; background:#f5f3ff; }
        .cim-dropzone--has-file { cursor:default; padding:20px 24px; }
        .cim-upload-icon { color:#9ca3af; }
        .cim-drop-text { font-size:14px; color:#374151; margin:0; text-align:center; }
        .cim-browse-link { color:#4f46e5; font-weight:500; }
        .cim-drop-hint { font-size:12px; color:#9ca3af; margin:0; }

        .cim-selected-file { display:flex; align-items:center; gap:12px; width:100%; }
        .cim-file-icon--csv { color:#22c55e; }
        .cim-file-icon--xlsx { color:#16a34a; }
        .cim-file-info { flex:1; display:flex; flex-direction:column; }
        .cim-file-name { font-size:14px; font-weight:500; color:#111827; }
        .cim-file-size { font-size:12px; color:#9ca3af; }
        .cim-remove-file { background:none; border:none; color:#9ca3af; cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; }
        .cim-remove-file:hover { color:#ef4444; background:#fee2e2; }

        .cim-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; font-size:13px; }
        .cim-alert--error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }

        .cim-result { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:20px; }
        .cim-result-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
        .cim-result-icon { color:#16a34a; }
        .cim-result-title { font-size:15px; font-weight:600; color:#15803d; }
        .cim-result-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:12px; }
        .cim-stat { background:#fff; border-radius:8px; padding:12px; text-align:center; border:1px solid #e5e7eb; display:flex; flex-direction:column; gap:4px; }
        .cim-stat-value { font-size:22px; font-weight:700; color:#111827; }
        .cim-stat-label { font-size:11px; color:#6b7280; }
        .cim-stat--success .cim-stat-value { color:#16a34a; }
        .cim-stat--info .cim-stat-value { color:#4f46e5; }
        .cim-stat--warn .cim-stat-value { color:#d97706; }

        .cim-errors-wrap { background:#fef9c3; border:1px solid #fde68a; border-radius:8px; padding:12px; }
        .cim-errors-title { font-size:12px; font-weight:600; color:#92400e; margin:0 0 8px; }
        .cim-errors-list { margin:0; padding-left:16px; }
        .cim-error-item { font-size:12px; color:#92400e; margin-bottom:4px; }

        .cim-footer-btns { display:flex; gap:10px; justify-content:flex-end; width:100%; }
        .cim-btn { padding:9px 20px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; transition:background .15s; }
        .cim-btn--primary { background:#111827; color:#fff; }
        .cim-btn--primary:hover:not(:disabled) { background:#1f2937; }
        .cim-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
        .cim-btn--ghost { background:transparent; color:#374151; border:1px solid #d1d5db; }
        .cim-btn--ghost:hover:not(:disabled) { background:#f3f4f6; }
      `}</style>
    </Modal>
  );
}
