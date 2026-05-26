import { useRef, useState } from "react";
import { CloudUpload, FiletypeCsv, FileEarmarkExcel, CheckCircleFill, ExclamationCircleFill, X, Download } from "react-bootstrap-icons";
import { Modal } from "../../../components/ui";
import api from "../../../services/api/axios";
import { SERVICES } from "../../../services/api/endpoints";

interface ImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  errors: string[];
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

  function pickFile(f: File) {
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED.includes(ext)) { setError("Only CSV and Excel (.xlsx, .xls) files are supported."); return; }
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
        timeout: 60_000,
      });
      const data: ImportResult = res.data?.data ?? res.data;
      setResult(data);
      if (data.imported > 0) onSuccess();
    } catch (err: any) {
      setError(err?.message || "Import failed. Please check your file and try again.");
    } finally {
      setLoading(false);
    }
  }

  const isCSV = file?.name.toLowerCase().endsWith(".csv");

  return (
    <Modal show={show} onClose={handleClose} title="Import Services" size="lg"
      footer={
        result ? (
          <button className="sim-btn sim-btn--primary" onClick={handleClose}>Done</button>
        ) : (
          <div className="sim-footer-btns">
            <button className="sim-btn sim-btn--ghost" onClick={handleClose} disabled={loading}>Cancel</button>
            <button className="sim-btn sim-btn--primary" onClick={handleImport} disabled={!file || loading}>
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        )
      }
    >
      <div className="service-import-modal">
        {/* Template download */}
        <div className="sim-template-row">
          <span className="sim-template-label">Need the correct format?</span>
          <button className="sim-template-btn" onClick={downloadTemplate}>
            <Download size={13} /> Download sample template
          </button>
        </div>

        {/* Expected columns */}
        <div className="sim-columns-wrap">
          <p className="sim-columns-title">Expected columns:</p>
          <div className="sim-columns-list">
            {SAMPLE_COLUMNS.map((col) => (
              <span key={col} className="sim-col-chip">{col}</span>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        {!result && (
          <div
            className={`sim-dropzone ${dragging ? "sim-dropzone--dragging" : ""} ${file ? "sim-dropzone--has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
            {file ? (
              <div className="sim-selected-file">
                {isCSV
                  ? <FiletypeCsv size={28} className="sim-file-icon sim-file-icon--csv" />
                  : <FileEarmarkExcel size={28} className="sim-file-icon sim-file-icon--xlsx" />
                }
                <div className="sim-file-info">
                  <span className="sim-file-name">{file.name}</span>
                  <span className="sim-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button className="sim-remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }} title="Remove">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <CloudUpload size={36} className="sim-upload-icon" />
                <p className="sim-drop-text">Drag & drop your file here, or <span className="sim-browse-link">browse</span></p>
                <p className="sim-drop-hint">Supports CSV, XLSX, XLS · Max 10 MB</p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="sim-alert sim-alert--error">
            <ExclamationCircleFill size={15} /><span>{error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="sim-result">
            <div className="sim-result-header">
              <CheckCircleFill size={20} className="sim-result-icon" />
              <span className="sim-result-title">Import complete — {result.imported} service{result.imported !== 1 ? "s" : ""} imported successfully</span>
            </div>
            <div className="sim-result-stats">
              <div className="sim-stat"><span className="sim-stat-value">{result.total_rows}</span><span className="sim-stat-label">Total rows</span></div>
              <div className="sim-stat sim-stat--success"><span className="sim-stat-value">{result.imported}</span><span className="sim-stat-label">Imported</span></div>
              <div className="sim-stat sim-stat--warn"><span className="sim-stat-value">{result.skipped}</span><span className="sim-stat-label">Skipped</span></div>
            </div>
            {result.errors?.length > 0 && (
              <div className="sim-errors-wrap">
                <p className="sim-errors-title">Errors ({result.errors.length})</p>
                <ul className="sim-errors-list">
                  {result.errors.map((e, i) => <li key={i} className="sim-error-item">{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .service-import-modal { display:flex; flex-direction:column; gap:16px; }
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
        .sim-file-icon--csv { color:#22c55e; } .sim-file-icon--xlsx { color:#16a34a; }
        .sim-file-info { flex:1; display:flex; flex-direction:column; }
        .sim-file-name { font-size:14px; font-weight:500; color:#111827; }
        .sim-file-size { font-size:12px; color:#9ca3af; }
        .sim-remove-file { background:none; border:none; color:#9ca3af; cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; }
        .sim-remove-file:hover { color:#ef4444; background:#fee2e2; }
        .sim-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; font-size:13px; }
        .sim-alert--error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .sim-result { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:20px; }
        .sim-result-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
        .sim-result-icon { color:#16a34a; }
        .sim-result-title { font-size:15px; font-weight:600; color:#15803d; }
        .sim-result-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:12px; }
        .sim-stat { background:#fff; border-radius:8px; padding:12px; text-align:center; border:1px solid #e5e7eb; display:flex; flex-direction:column; gap:4px; }
        .sim-stat-value { font-size:22px; font-weight:700; color:#111827; }
        .sim-stat-label { font-size:11px; color:#6b7280; }
        .sim-stat--success .sim-stat-value { color:#16a34a; }
        .sim-stat--warn .sim-stat-value { color:#d97706; }
        .sim-errors-wrap { background:#fef9c3; border:1px solid #fde68a; border-radius:8px; padding:12px; }
        .sim-errors-title { font-size:12px; font-weight:600; color:#92400e; margin:0 0 8px; }
        .sim-errors-list { margin:0; padding-left:16px; }
        .sim-error-item { font-size:12px; color:#92400e; margin-bottom:4px; }
        .sim-footer-btns { display:flex; gap:10px; justify-content:flex-end; width:100%; }
        .sim-btn { padding:9px 20px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; transition:background .15s; }
        .sim-btn--primary { background:#111827; color:#fff; }
        .sim-btn--primary:hover:not(:disabled) { background:#1f2937; }
        .sim-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
        .sim-btn--ghost { background:transparent; color:#374151; border:1px solid #d1d5db; }
        .sim-btn--ghost:hover:not(:disabled) { background:#f3f4f6; }
      `}</style>
    </Modal>
  );
}
