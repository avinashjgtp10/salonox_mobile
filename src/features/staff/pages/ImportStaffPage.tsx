import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/ImportStaffPage.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";

const ACCEPTED_EXTS = [".csv", ".xlsx", ".xls"];

type Step = 1 | 2 | 3 | 4;

const STAFF_COLUMNS = [
  { key: "name",                  label: "Name",                required: true,  hint: "Full name of the staff member. Required for import." },
  { key: "contact",               label: "Contact",             required: false, hint: "Phone/contact number of the staff member." },
  { key: "email",                 label: "Email",               required: true,  hint: "Email address of the staff member. Required for import." },
  { key: "address",               label: "Address",             required: false, hint: "Residential address of the staff member." },
  { key: "gender",                label: "Gender",              required: false, hint: "Gender of the staff member." },
  { key: "doj",                   label: "DOJ (dd-mm-YYYY)",    required: false, hint: "Date of joining in dd-mm-YYYY format." },
  { key: "dob",                   label: "DOB (dd-mm-YYYY)",    required: false, hint: "Date of birth in dd-mm-YYYY format." },
  { key: "designation",           label: "Designation",         required: false, hint: "Job title or designation." },
  { key: "hourly_rate",           label: "Hourly Rate",         required: false, hint: "Hourly pay rate." },
  { key: "fixed_salary",          label: "Fixed Salary",        required: false, hint: "Fixed monthly salary amount." },
  { key: "working_hours_per_day", label: "Working Hours/Day",   required: false, hint: "Number of working hours per day." },
  { key: "holidays",              label: "Holidays",            required: false, hint: "Number of holidays per month." },
];

const SAMPLE_ROWS = [
  ["jack", "465656565", "jack@yopmail.com", "Singapore", "Male", "02-12-2015", "02-12-1991", "Hair Dresser", "100", "150", "8", "5"],
  ["kamala", "9878987678", "hema@gmail.com", "baramati", "female", "", "", "Hair Dresser", "100", "1500", "8", "5"],
];

function downloadTemplate() {
  const headers = STAFF_COLUMNS.map((c) => c.label);
  const csv = [headers, ...SAMPLE_ROWS].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "staff_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const FileUpIcon = () => (
  <svg width="38" height="44" viewBox="0 0 38 44" fill="none">
    <path d="M23 2H6C4.9 2 4 2.9 4 4V40C4 41.1 4.9 42 6 42H32C33.1 42 34 41.1 34 40V13L23 2Z" stroke="#cbd5e1" strokeWidth="1.8" fill="#f8fafc" />
    <path d="M23 2V13H34" stroke="#cbd5e1" strokeWidth="1.8" />
    <path d="M19 23V33M19 23L15 27M19 23L23 27" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8.5" fill="#dcfce7" stroke="#86efac" />
    <path d="M5.5 9l2.5 2.5L13 6" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// ─── Step 1 – Upload ──────────────────────────────────────────────────────────
function fileExtLabel(f: File) {
  return f.name.slice(f.name.lastIndexOf(".") + 1).toUpperCase() || "FILE";
}

function StepUpload({ file, onFileChange, error }: { file: File | null; onFileChange: (f: File | null) => void; error: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileChange(f);
  }, [onFileChange]);

  return (
    <div className="col-md-6 mx-auto text-center">
      <p className="isp-step-label">Import staff</p>
      <h2 className="isp-step-title">Upload file</h2>
      <p className="isp-step-desc">
        Upload a CSV or Excel file with your staff data, or download and fill the template below.
      </p>

      {error && (
        <div className="isp-toast-error d-inline-flex align-items-center mb-3">
          <span className="me-2">⚠</span> {error}
        </div>
      )}

      <div
        className={`isp-upload-card ${drag ? "isp-upload-card--drag" : ""} ${error ? "isp-upload-card--error" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <FileUpIcon />
        <p className="isp-upload-title mt-3">Upload CSV / Excel file</p>

        {file ? (
          <div className="isp-file-pill mt-3" onClick={(e) => e.stopPropagation()}>
            <span className="isp-csv-badge">{fileExtLabel(file)}</span>
            <span className="isp-file-name">{file.name}</span>
            <button className="isp-remove-btn" onClick={(e) => { e.stopPropagation(); onFileChange(null); }}>×</button>
          </div>
        ) : (
          <button className="isp-choose-btn mt-3" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            Choose a file
          </button>
        )}

        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="d-none"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
      </div>

      <p className="text-muted small mt-3">
        Don't have a file? Fill our template with your staff information and upload.
      </p>
      <button className="isp-download-link" onClick={downloadTemplate}>Download template</button>
    </div>
  );
}

// ─── Step 2 – Column Matching ─────────────────────────────────────────────────
function StepColumnMatch({ file, csvHeaders, mapping, onMappingChange, validationErrors }: {
  file: File | null;
  csvHeaders: string[];
  mapping: Record<string, string>;
  onMappingChange: (key: string, value: string) => void;
  validationErrors: Record<string, string>;
}) {
  return (
    <div className="col-md-8 mx-auto">
      <p className="isp-step-label">Import staff</p>
      <h2 className="isp-step-title">Review column matching</h2>
      <p className="isp-step-desc">
        Make sure the columns in your file are matched correctly to the columns in the staff list.
      </p>

      <div className="isp-ready-banner d-flex align-items-center mb-3">
        <CheckCircleIcon />
        <span className="ms-2">File is ready for column matching.</span>
      </div>

      {file && (
        <div className="isp-file-row d-flex align-items-center mb-4">
          <span className="isp-csv-badge">CSV</span>
          <span className="isp-file-name ms-2">{file.name}</span>
          <span className="isp-file-size ms-2 text-muted">· {(file.size / 1024).toFixed(1)} KB</span>
        </div>
      )}

      <div className="row isp-col-headers pb-2 mb-1">
        <div className="col-6 isp-col-head">Column in staff list</div>
        <div className="col-6 isp-col-head">Column in your file</div>
      </div>

      {STAFF_COLUMNS.map((col) => (
        <div key={col.key} className="isp-match-row">
          <div className="row align-items-start py-2">
            <div className="col-6">
              <div className="isp-frozen-field">
                {col.label}
                {col.required && <span className="isp-required-dot"> *</span>}
              </div>
              <p className="isp-field-hint">{col.hint}</p>
            </div>
            <div className="col-6">
              <select
                className={`form-select isp-match-select ${validationErrors[col.key] ? "is-invalid" : ""}`}
                value={mapping[col.key] ?? "None"}
                onChange={(e) => onMappingChange(col.key, e.target.value)}
              >
                <option value="None">None</option>
                {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              {validationErrors[col.key] && <p className="isp-req-msg">{validationErrors[col.key]}</p>}
            </div>
          </div>
          <hr className="isp-divider" />
        </div>
      ))}
    </div>
  );
}

// ─── Step 3 – Preview ─────────────────────────────────────────────────────────
function StepPreview({ previewRows, mapping }: { previewRows: Record<string, string>[]; mapping: Record<string, string> }) {
  const [activeTab, setActiveTab] = useState<"import" | "errors">("import");
  const visibleCols = STAFF_COLUMNS.filter((c) => mapping[c.key] && mapping[c.key] !== "None");

  return (
    <div className="col-md-10 mx-auto">
      <p className="isp-step-label">Import staff</p>
      <h2 className="isp-step-title">Preview staff list</h2>
      <p className="isp-step-desc">
        Check if all fields are imported correctly. Errors in a row will result in that row not being imported.
      </p>

      <div className="isp-preview-tabs mb-4">
        <button className={`isp-preview-tab ${activeTab === "import" ? "active" : ""}`} onClick={() => setActiveTab("import")}>
          To be imported ({previewRows.length})
        </button>
        <button className={`isp-preview-tab ${activeTab === "errors" ? "active" : ""}`} onClick={() => setActiveTab("errors")}>
          Errors (0)
        </button>
      </div>

      {activeTab === "import" && (
        previewRows.length === 0 ? (
          <div className="isp-preview-empty text-center py-5">
            <p className="isp-empty-title">No rows were found</p>
            <p className="isp-empty-sub">It looks like no data was found in your file.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table isp-preview-table">
              <thead>
                <tr>{visibleCols.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>{visibleCols.map((c) => <td key={c.key}>{row[c.key] || "—"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === "errors" && (
        <div className="isp-preview-empty text-center py-5">
          <p className="isp-empty-title">No errors</p>
          <p className="isp-empty-sub text-muted">All rows passed validation.</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 4 – Result ──────────────────────────────────────────────────────────
interface ImportError { row: number; email?: string; code: string; message: string; }
interface ImportResult { imported: number; updated: number; skipped: number; total_rows: number; errors: ImportError[]; }

function StepResult({ result }: { result: ImportResult | null }) {
  const success = (result?.imported ?? 0) > 0 || (result?.updated ?? 0) > 0;

  return (
    <div className="col-md-5 mx-auto text-center pt-5">
      <div className="isp-result-icon mx-auto mb-4">
        {success ? (
          <svg viewBox="0 0 60 60" width="56">
            <circle cx="30" cy="30" r="29" fill="#dcfce7" stroke="#86efac" strokeWidth="2" />
            <path d="M18 30l9 9 15-18" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        ) : (
          <svg viewBox="0 0 60 60" width="56">
            <circle cx="30" cy="30" r="29" fill="#f1f5f9" />
            <path d="M20 20L40 40M40 20L20 40" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h2 className="isp-step-title">{success ? "Import successful!" : "Import failed!"}</h2>
      <p className={`isp-step-desc ${success ? "text-success" : "text-muted"}`}>
        {success ? "Your staff members have been added to your team." : "No staff members were added. Please check your file."}
      </p>

      {result && (
        <div className="isp-result-stats">
          <div className="isp-stat"><span className="isp-stat-value">{result.total_rows}</span><span className="isp-stat-label">Total rows</span></div>
          <div className="isp-stat isp-stat--success"><span className="isp-stat-value">{result.imported}</span><span className="isp-stat-label">Imported</span></div>
          <div className="isp-stat isp-stat--info"><span className="isp-stat-value">{result.updated}</span><span className="isp-stat-label">Updated</span></div>
          <div className="isp-stat isp-stat--warn"><span className="isp-stat-value">{result.skipped}</span><span className="isp-stat-label">Skipped</span></div>
        </div>
      )}

      {result && result.errors.length > 0 && (
        <div className="isp-errors-wrap mt-3 text-start">
          <p className="isp-errors-title">Errors ({result.errors.length})</p>
          <ul className="isp-errors-list">
            {result.errors.map((e, i) => (
                <li key={i} className="isp-error-item">
                  {`Row ${e.row}${e.email ? ` (${e.email})` : ""}: ${e.message}`}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImportStaffPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [matchErrors, setMatchErrors] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const TOTAL = 4;
  const progressPct = ((step - 1) / (TOTAL - 1)) * 100;

  const handleFileChange = (f: File | null) => {
    setUploadError("");
    if (!f) { setFile(null); return; }

    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      setFile(null);
      setUploadError(`"${ext || f.name}" is not supported. Please upload a CSV or Excel (.xlsx, .xls) file.`);
      return;
    }

    setFile(f);

    const applyHeaders = (headers: string[], dataRows: string[][]) => {
      setCsvHeaders(headers);

      const auto: Record<string, string> = {};
      STAFF_COLUMNS.forEach((col) => {
        const match = headers.find((h) =>
          h.toLowerCase().replace(/[^a-z]/g, "").includes(col.key.toLowerCase().replace(/[^a-z]/g, "")) ||
          h.toLowerCase().includes(col.label.toLowerCase())
        );
        auto[col.key] = match ?? "None";
      });
      setMapping(auto);

      setPreviewRows(dataRows.slice(0, 5).map((vals) => {
        const row: Record<string, string> = {};
        STAFF_COLUMNS.forEach((col) => {
          const idx = headers.indexOf(auto[col.key] ?? "");
          row[col.key] = idx >= 0 ? (vals[idx] ?? "") : "";
        });
        return row;
      }));
    };

    if (ext === ".csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        const headers = (lines[0] ?? "").split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        const dataRows = lines.slice(1).map((line) =>
          line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
        );
        applyHeaders(headers, dataRows);
      };
      reader.readAsText(f);
    } else {
      // Excel: use SheetJS
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
          const headers = (rows[0] ?? []).map((h) => String(h).trim());
          applyHeaders(headers, rows.slice(1));
        } catch {
          setFile(null);
          setUploadError("Could not read the Excel file. Please check the file and try again.");
        }
      };
      reader.readAsArrayBuffer(f);
    }
  };

  const handleMappingChange = (key: string, value: string) => {
    setMapping((p) => ({ ...p, [key]: value }));
    setMatchErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  const handleNext = async () => {
    if (step === 1 && !file) { setUploadError("Please upload a CSV or Excel file first"); return; }

    if (step === 2) {
      const errs: Record<string, string> = {};
      STAFF_COLUMNS.filter((c) => c.required).forEach((c) => {
        if (!mapping[c.key] || mapping[c.key] === "None") errs[c.key] = "This column is required.";
      });
      if (Object.keys(errs).length) { setMatchErrors(errs); return; }
      setMatchErrors({});
    }

    if (step === 3) {
      if (!file) return;
      setImporting(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post(STAFF.IMPORT, formData, {
          headers: { "Content-Type": undefined },
          timeout: 60_000,
        });
        setImportResult(res.data?.data ?? res.data);
      } catch (err: any) {
        setImportResult({ imported: 0, updated: 0, skipped: 0, total_rows: 0, errors: [{ row: 0, code: "IMPORT_FAILED", message: err?.message || "Import failed" }] });
      } finally {
        setImporting(false);
      }
    }

    setStep((p) => Math.min(p + 1, TOTAL) as Step);
  };

  const handleBack = () => setStep((p) => Math.max(p - 1, 1) as Step);

  return (
    <div className="import-staff-page">
      {/* TOP BAR */}
      <div className="isp-topbar d-flex align-items-center px-4 py-2">
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          {step > 1 && step < 4 && (
            <button className="isp-back-btn" onClick={handleBack}>‹</button>
          )}
          <div className="isp-progress-track flex-grow-1">
            <div className="isp-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="d-flex gap-2 ms-3">
          <button className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => navigate("/dashboard/team/members")}>
            Close
          </button>
          {step < 4 && (
            <button className="btn btn-dark btn-sm rounded-pill" onClick={handleNext} disabled={importing}>
              {importing ? "Importing…" : step === 3 ? "Start Import" : "Next step"}
            </button>
          )}
          {step === 4 && (
            <button className="btn btn-dark btn-sm rounded-pill" onClick={() => navigate("/dashboard/team/members")}>
              Done
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="isp-body container-fluid">
        <div className="row justify-content-center">
          {step === 1 && <StepUpload file={file} onFileChange={handleFileChange} error={uploadError} />}
          {step === 2 && <StepColumnMatch file={file} csvHeaders={csvHeaders} mapping={mapping} onMappingChange={handleMappingChange} validationErrors={matchErrors} />}
          {step === 3 && <StepPreview previewRows={previewRows} mapping={mapping} />}
          {step === 4 && <StepResult result={importResult} />}
        </div>
      </div>

      {/* STEP DOTS */}
      <div className="isp-step-dots">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`isp-dot ${n <= step ? "isp-dot--active" : ""}`} />
        ))}
      </div>
    </div>
  );
}
