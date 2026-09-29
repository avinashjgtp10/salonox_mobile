import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/ImportClientsPage.scss";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import Dropdown from "../../../components/ui/Dropdown";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4;

const SALONOX_COLUMNS = [
  {
    key: "firstName",
    label: "First name",
    required: true,
    hint: "First name of your client. Required for import.",
  },
  {
    key: "lastName",
    label: "Last name",
    required: false,
    hint: "Last name of your client.",
  },
  {
    key: "email",
    label: "Email",
    required: false,
    hint: "Email of your client.",
  },
  {
    key: "mobile",
    label: "Mobile number",
    required: true,
    hint: "The mobile number of the client. Required for import.",
  },
  {
    key: "gender",
    label: "Gender",
    required: false,
    hint: "Gender of the client.",
  },
  {
    key: "birthday",
    label: "Birthday",
    required: false,
    hint: "Birthday of the client.",
  },
  {
    key: "clientNotes",
    label: "Client notes",
    required: false,
    hint: "Important notes about the client.",
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const FileUpIcon = () => (
  <svg width="38" height="44" viewBox="0 0 38 44" fill="none">
    <path
      d="M23 2H6C4.9 2 4 2.9 4 4V40C4 41.1 4.9 42 6 42H32C33.1 42 34 41.1 34 40V13L23 2Z"
      stroke="#cbd5e1"
      strokeWidth="1.8"
      fill="#f8fafc"
    />
    <path d="M23 2V13H34" stroke="#cbd5e1" strokeWidth="1.8" />
    <path
      d="M19 23V33M19 23L15 27M19 23L23 27"
      stroke="#6366f1"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8.5" fill="#dcfce7" stroke="#86efac" />
    <path
      d="M5.5 9l2.5 2.5L13 6"
      stroke="#16a34a"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Step 1 – Upload ──────────────────────────────────────────────────────────
function StepUpload({
  file,
  onFileChange,
  error,
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
  error: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f) onFileChange(f);
    },
    [onFileChange],
  );

  return (
    <div className="col-md-6 mx-auto text-center">
      <p className="step-label">Import clients</p>
      <h2 className="step-title">Upload file</h2>
      <p className="step-desc">
        Upload a CSV file with your client data, or download and fill the
        template below.
      </p>

      {error && (
        <div className="toast-error d-inline-flex align-items-center mb-3">
          <span className="me-2">⚠</span>
          {error}
        </div>
      )}

      <div
        className={`upload-card ${drag ? "upload-card--drag" : ""} ${error ? "upload-card--error" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <FileUpIcon />
        <p className="upload-title mt-3">Upload CSV file</p>

        {file ? (
          <div className="file-pill mt-3" onClick={(e) => e.stopPropagation()}>
            <span className="csv-badge">CSV</span>
            <span className="file-name">{file.name}</span>
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            className="choose-btn mt-3"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Choose a CSV file
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="d-none"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      <p className="text-muted small mt-3">
        Don't have a file? Fill our template with your client information and
        upload.
      </p>
      <a href="#" className="download-link" onClick={(e) => e.preventDefault()}>
        Download template
      </a>
    </div>
  );
}

// ─── Step 2 – Column Matching ─────────────────────────────────────────────────
function StepColumnMatch({
  file,
  csvHeaders,
  mapping,
  onMappingChange,
  validationErrors,
}: {
  file: File | null;
  csvHeaders: string[];
  mapping: Record<string, string>;
  onMappingChange: (key: string, value: string) => void;
  validationErrors: Record<string, string>;
}) {
  return (
    <div className="col-md-8 mx-auto">
      <p className="step-label">Import clients</p>
      <h2 className="step-title">Review column matching</h2>
      <p className="step-desc">
        Make sure the columns in your file are matched correctly to the columns
        in the client list.
      </p>

      <div className="ready-banner d-flex align-items-center mb-3">
        <CheckCircleIcon />
        <span className="ms-2">File is ready for column matching.</span>
      </div>

      {file && (
        <div className="file-row d-flex align-items-center mb-4">
          <span className="csv-badge">CSV</span>
          <span className="file-name ms-2">{file.name}</span>
          <span className="file-size ms-2 text-muted">CSV · 1 KB</span>
          <span className="ms-auto text-muted" style={{ cursor: "pointer" }}>
            ×
          </span>
        </div>
      )}

      <div className="row col-headers pb-2 mb-1">
        <div className="col-6 col-head">Column in client list</div>
        <div className="col-6 col-head">Column in your file</div>
      </div>

      {SALONOX_COLUMNS.map((col) => (
        <div key={col.key} className="match-row">
          <div className="row align-items-start py-2">
            <div className="col-6">
              <div className="frozen-field">{col.label}</div>
              <p className="field-hint">{col.hint}</p>
            </div>
            <div className="col-6">
              <Dropdown
                className={`form-select match-select ${validationErrors[col.key] ? "is-invalid" : ""}`}
                value={mapping[col.key] ?? "None"}
                options={[{ id: "None", name: "None" }, ...csvHeaders.map((h) => ({ id: h, name: h }))]}
                onChange={(id) => onMappingChange(col.key, id)}
              />
              {validationErrors[col.key] && (
                <p className="req-msg">{validationErrors[col.key]}</p>
              )}
            </div>
          </div>
          <hr className="divider" />
        </div>
      ))}
    </div>
  );
}

// ─── Step 3 – Preview ─────────────────────────────────────────────────────────
// Required-field check for the sampled preview rows below — the authoritative,
// exhaustive check for the full file still happens server-side on actual
// import (see clients.service.ts importClients), since this preview only
// ever holds the first 5 data rows. This just surfaces the same missing-field
// problems early, before the user spends a round trip finding out.
interface PreviewError { row: number; field: string; message: string }
function validatePreviewRows(rows: Record<string, string>[]): PreviewError[] {
  const requiredCols = SALONOX_COLUMNS.filter((c) => c.required);
  const errors: PreviewError[] = [];
  rows.forEach((row, i) => {
    requiredCols.forEach((c) => {
      if (!row[c.key]?.trim()) {
        errors.push({ row: i + 1, field: c.label, message: `${c.label} is required` });
      }
    });
  });
  return errors;
}

function StepPreview({
  previewRows,
}: {
  previewRows: Record<string, string>[];
}) {
  const [activeTab, setActiveTab] = useState<"import" | "errors">("import");
  const previewErrors = validatePreviewRows(previewRows);

  return (
    <div className="col-md-10 mx-auto">
      <p className="step-label">Import clients</p>
      <h2 className="step-title">Preview client list</h2>
      <p className="step-desc">
        Check if all fields are imported correctly. Errors in a row will result
        in that row not being imported.
      </p>

      <div className="preview-tabs mb-4">
        <button
          className={`preview-tab ${activeTab === "import" ? "active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          To be imported ({previewRows.length})
        </button>
        <button
          className={`preview-tab ${activeTab === "errors" ? "active" : ""}`}
          onClick={() => setActiveTab("errors")}
        >
          Errors ({previewErrors.length})
        </button>
      </div>

      {activeTab === "import" &&
        (previewRows.length === 0 ? (
          <div className="preview-empty text-center py-5">
            <p className="empty-title">No rows were found</p>
            <p className="empty-sub">
              It looks like no data was found in this tab
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table preview-table">
              <thead>
                <tr>
                  {SALONOX_COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {SALONOX_COLUMNS.map((c) => (
                      <td key={c.key}>{row[c.key] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {activeTab === "errors" && (
        previewErrors.length === 0 ? (
          <div className="preview-empty text-center py-5">
            <p className="empty-title">No errors</p>
            <p className="empty-sub text-muted">All previewed rows passed validation.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table preview-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Field</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {previewErrors.map((e, i) => (
                  <tr key={i}>
                    <td>{e.row}</td>
                    <td>{e.field}</td>
                    <td className="text-danger">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─── Step 4 – Result ──────────────────────────────────────────────────────────
interface ImportResult { imported: number; updated: number; skipped: number; total_rows: number; errors: string[]; }

function StepResult({ success, result }: { success: boolean; result: ImportResult | null }) {
  return (
    <div className="col-md-5 mx-auto text-center pt-5">
      <div className="result-icon mx-auto mb-4">
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
      <h2 className="step-title">{success ? "Import successful!" : "Import failed!"}</h2>
      <p className={`step-desc ${success ? "text-success" : "text-muted"}`}>
        {success ? "Your clients have been added to your client list." : "No clients have been added to your client list."}
      </p>

      {result && (
        <div className="import-result-stats">
          <div className="irs-stat"><span className="irs-val">{result.total_rows}</span><span className="irs-lbl">Total rows</span></div>
          <div className="irs-stat irs-stat--green"><span className="irs-val">{result.imported}</span><span className="irs-lbl">Imported</span></div>
          <div className="irs-stat irs-stat--blue"><span className="irs-val">{result.updated}</span><span className="irs-lbl">Updated</span></div>
          <div className="irs-stat irs-stat--amber"><span className="irs-val">{result.skipped}</span><span className="irs-lbl">Skipped</span></div>
        </div>
      )}

      {result && result.errors.length > 0 && (
        <div className="import-errors-wrap mt-3 text-start">
          <p className="import-errors-title">Errors ({result.errors.length})</p>
          <ul className="import-errors-list">
            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ImportClientsPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [matchErrors, setMatchErrors] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number; total_rows: number; errors: string[] } | null>(null);

  const TOTAL = 4;
  const progressPct = ((step - 1) / (TOTAL - 1)) * 100;

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setUploadError("");
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        const headers = (lines[0] ?? "")
          .split(",")
          .map((h) => h.trim().replace(/^"|"$/g, ""));
        setCsvHeaders(headers);
        const auto: Record<string, string> = {};
        SALONOX_COLUMNS.forEach((col) => {
          const match = headers.find(
            (h) =>
              h.toLowerCase().includes(col.key.toLowerCase()) ||
              h.toLowerCase().includes(col.label.toLowerCase()),
          );
          auto[col.key] = match ?? "None";
        });
        setMapping(auto);
        const dataRows = lines.slice(1, 6);
        setPreviewRows(dataRows.map((line) => {
          const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          SALONOX_COLUMNS.forEach((col) => {
            const idx = headers.indexOf(auto[col.key] ?? "");
            row[col.key] = idx >= 0 ? vals[idx] ?? "" : "";
          });
          return row;
        }));
      };
      reader.readAsText(f);
    }
  };

  const handleMappingChange = (key: string, value: string) => {
    setMapping((p) => ({ ...p, [key]: value }));
    setMatchErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  };

  const handleNext = async () => {
    if (step === 1 && !file) {
      setUploadError("Please upload CSV file first");
      return;
    }
    if (step === 2) {
      const errs: Record<string, string> = {};
      SALONOX_COLUMNS.filter((c) => c.required).forEach((c) => {
        if (!mapping[c.key] || mapping[c.key] === "None")
          errs[c.key] = "This column is required.";
      });
      if (Object.keys(errs).length) {
        setMatchErrors(errs);
        return;
      }
      setMatchErrors({});
    }
    if (step === 3) {
      if (!file) return;
      setImporting(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post(CLIENT.IMPORT, formData, {
          headers: { "Content-Type": undefined },
          timeout: 60_000,
        });
        const data = res.data?.data ?? res.data;
        setImportResult(data);
        setImportSuccess((data?.imported ?? 0) > 0 || (data?.updated ?? 0) > 0);
      } catch (err: any) {
        setImportResult({ imported: 0, updated: 0, skipped: 0, total_rows: 0, errors: [err?.message || "Import failed"] });
        setImportSuccess(false);
      } finally {
        setImporting(false);
      }
    }
    setStep((p) => Math.min(p + 1, TOTAL) as Step);
  };

  const handleBack = () => setStep((p) => Math.max(p - 1, 1) as Step);

  return (
    <div className="import-clients-page">
      {/* TOP BAR */}
      <div className="import-topbar d-flex align-items-center px-4 py-2">
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          {step > 1 && step < 4 && (
            <button className="back-btn" onClick={handleBack}>
              ‹
            </button>
          )}
          <div className="progress-track flex-grow-1">
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="d-flex gap-2 ms-3">
          <button
            className="btn btn-outline-secondary btn-sm rounded-pill"
            onClick={() => navigate("/dashboard/clients/list")}
          >
            Close
          </button>
          {step < 4 && (
            <button
              className="btn btn-dark btn-sm rounded-pill"
              onClick={handleNext}
              disabled={importing}
            >
              {importing ? "Importing…" : step === 3 ? "Start Import" : "Next step"}
            </button>
          )}
          {step === 4 && (
            <button
              className="btn btn-dark btn-sm rounded-pill"
              onClick={() => navigate("/dashboard/clients/list")}
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="import-body container-fluid">
        <div className="row justify-content-center">
          {step === 1 && (
            <StepUpload
              file={file}
              onFileChange={handleFileChange}
              error={uploadError}
            />
          )}
          {step === 2 && (
            <StepColumnMatch
              file={file}
              csvHeaders={csvHeaders}
              mapping={mapping}
              onMappingChange={handleMappingChange}
              validationErrors={matchErrors}
            />
          )}
          {step === 3 && <StepPreview previewRows={previewRows} />}
          {step === 4 && <StepResult success={importSuccess} result={importResult} />}
        </div>
      </div>

      {/* STEP DOTS */}
      <div className="step-dots">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`dot ${n <= step ? "dot--active" : ""}`} />
        ))}
      </div>
    </div>
  );
}
