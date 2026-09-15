import { useRef, useState } from "react";
import { CloudUpload, FiletypeCsv, FileEarmarkExcel, CheckCircleFill, ExclamationCircleFill, X, Download, ArrowRepeat } from "react-bootstrap-icons";
import { Modal } from "../../../components/ui";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import "../styles/StaffImportModal.scss";

interface ImportError {
  row: number;
  field?: string;
  email?: string;
  code: string;
  message: string;
}

interface ImportResult {
  total_rows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Only Name and Contact are mandatory for import — everything else is optional.
const REQUIRED_COLUMNS = new Set(["Name", "Contact"]);

const SAMPLE_CSV_COLUMNS = [
  "Name", "Contact", "Email", "Address", "Gender",
  "DOJ(dd-mm-YYYY)", "DOB(dd-mm-YYYY)", "Designation", "Role",
  "Hourly Rate", "Fixed Salary", "Working Hours/Day", "Holidays",
];

const SAMPLE_CSV_ROWS = [
  ["jack", "465656565", "jack@yopmail.com", "Singapore", "Male", "02-12-2015", "02-12-1991", "Hair Dresser", "Staff", "100", "150", "8", "5"],
  ["kamala", "9878987678", "hema@gmail.com", "baramati", "female", "", "", "Hair Dresser", "Manager", "100", "1500", "8", "5"],
];

function downloadTemplate() {
  const rows = [SAMPLE_CSV_COLUMNS, ...SAMPLE_CSV_ROWS];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "staff_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function StaffImportModal({ show, onClose, onSuccess }: Props) {
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

  // Lets the user swap in a different file at any point — while one is
  // already selected, or even after an import has finished — without
  // closing and reopening this modal. pickFile() (via the input's onChange)
  // already clears the previous result/error once the new file lands.
  function handleReImport() {
    fileRef.current?.click();
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Omit Content-Type so the browser sets multipart/form-data with the correct boundary
      const res = await api.post(STAFF.IMPORT, formData, {
        headers: { "Content-Type": undefined },
        timeout: 60_000,
      });
      const data: ImportResult = res.data?.data ?? res.data;
      setResult(data);
      if (data.imported > 0 || data.updated > 0) onSuccess();
    } catch (err: any) {
      // Interceptor wraps errors as ApiError with .message
      setError(err?.message || "Import failed. Please check your file and try again.");
    } finally {
      setLoading(false);
    }
  }

  const fileIcon = file?.name.endsWith(".csv")
    ? <FiletypeCsv size={28} className="sim-file-icon sim-file-icon--csv" />
    : <FileEarmarkExcel size={28} className="sim-file-icon sim-file-icon--xlsx" />;

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Import Staff"
      size="lg"
      footer={
        result ? (
          <button className="sim-btn sim-btn--primary" onClick={handleClose}>Done</button>
        ) : (
          <div className="sim-footer-btns">
            <button className="sim-btn sim-btn--ghost" onClick={handleClose} disabled={loading}>Cancel</button>
            <button
              className="sim-btn sim-btn--primary"
              onClick={handleImport}
              disabled={!file || loading}
            >
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        )
      }
    >
      <div className="staff-import-modal">
        {/* Template download */}
        <div className="sim-template-row">
          <span className="sim-template-label">Need the correct format?</span>
          <button className="sim-template-btn" onClick={downloadTemplate}>
            <Download size={13} /> Download sample template
          </button>
        </div>

        {/* Column reference */}
        <div className="sim-columns-wrap">
          <p className="sim-columns-title">Expected columns:</p>
          <div className="sim-columns-list">
            {SAMPLE_CSV_COLUMNS.map((col) => (
              <span key={col} className="sim-col-chip">
                {col}
                {REQUIRED_COLUMNS.has(col) && <span className="sim-col-chip__required"> *</span>}
              </span>
            ))}
          </div>
          <p className="sim-columns-hint">* Required</p>
        </div>

        {/* Hidden file input — kept mounted regardless of file/result state so
            Re-import can always trigger it via fileRef. */}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="sim-hidden-input"
          onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
        />

        {/* Drop zone */}
        {!result && (
          <div
            className={`sim-dropzone ${dragging ? "sim-dropzone--dragging" : ""} ${file ? "sim-dropzone--has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
          >
            {file ? (
              <div className="sim-selected-file">
                {fileIcon}
                <div className="sim-file-info">
                  <span className="sim-file-name">{file.name}</span>
                  <span className="sim-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  className="sim-reimport-btn"
                  onClick={(e) => { e.stopPropagation(); handleReImport(); }}
                  title="Choose a different file"
                >
                  <ArrowRepeat size={13} /> Re-import
                </button>
                <button
                  className="sim-remove-file"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <CloudUpload size={36} className="sim-upload-icon" />
                <p className="sim-drop-text">Drag & drop your file here, or <span className="sim-browse-link">browse</span></p>
                <p className="sim-drop-hint">Supports CSV, XLSX, XLS</p>
              </>
            )}
          </div>
        )}

        {/* Top-level failure — the request itself never produced a result
            (bad upload, network error, whole-file rejection before any row
            was even looked at). */}
        {error && (
          <div className="sim-result sim-result--failed">
            <div className="sim-result-header">
              <ExclamationCircleFill size={20} className="sim-result-icon sim-result-icon--error" />
              <span className="sim-result-title sim-result-title--error">Import Failed</span>
              <button className="sim-reimport-btn sim-reimport-btn--result" onClick={handleReImport}>
                <ArrowRepeat size={13} /> Re-import
              </button>
            </div>
            <p className="sim-fail-reason">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (() => {
          const hasErrors = result.errors.length > 0;
          // Structural failures (missing columns, unreadable file) come back
          // as a single row:0 entry — there's no per-row table to show for
          // those, just the one reason.
          const rowErrors = result.errors.filter((e) => e.row > 0);
          const fileErrors = result.errors.filter((e) => e.row === 0);
          return (
            <div className={`sim-result ${hasErrors ? "sim-result--failed" : ""}`}>
              <div className="sim-result-header">
                {hasErrors
                  ? <ExclamationCircleFill size={20} className="sim-result-icon sim-result-icon--error" />
                  : <CheckCircleFill size={20} className="sim-result-icon" />}
                <span className={`sim-result-title ${hasErrors ? "sim-result-title--error" : ""}`}>
                  {hasErrors ? "Import Failed" : "Import complete"}
                </span>
                <button className="sim-reimport-btn sim-reimport-btn--result" onClick={handleReImport}>
                  <ArrowRepeat size={13} /> Re-import
                </button>
              </div>

              {fileErrors.map((e, i) => (
                <p key={i} className="sim-fail-reason">{e.message}</p>
              ))}

              <div className="sim-result-stats">
                <div className="sim-stat">
                  <span className="sim-stat-value">{result.total_rows}</span>
                  <span className="sim-stat-label">Total rows</span>
                </div>
                <div className="sim-stat sim-stat--success">
                  <span className="sim-stat-value">{result.imported}</span>
                  <span className="sim-stat-label">Imported</span>
                </div>
                <div className="sim-stat sim-stat--info">
                  <span className="sim-stat-value">{result.updated}</span>
                  <span className="sim-stat-label">Updated</span>
                </div>
                <div className="sim-stat sim-stat--warn">
                  <span className="sim-stat-value">{result.skipped}</span>
                  <span className="sim-stat-label">Skipped</span>
                </div>
              </div>

              {rowErrors.length > 0 && (
                <div className="sim-errors-wrap">
                  <div className="sim-errors-table-scroll">
                    <table className="sim-errors-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Field</th>
                          <th>Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rowErrors.map((e, i) => (
                          <tr key={i}>
                            <td>{e.row}</td>
                            <td>{e.field ?? "—"}</td>
                            <td>{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="sim-errors-summary">
                    {rowErrors.length} error{rowErrors.length !== 1 ? "s" : ""} found. Please correct the errors and re-import the file.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </Modal>
  );
}
