import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudUpload, FiletypeCsv, FileEarmarkExcel, CheckCircleFill, ExclamationCircleFill, X, Download } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PRODUCTS } from "../../../services/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportIssue {
  row: number;
  name?: string;
  status: "failed" | "skipped";
  reason: string;
  suggestion?: string;
}

interface ImportResult {
  total_rows: number;
  imported: number;
  skipped: number;
  failed?: number;
  categoriesCreated: string[];
  issues: ImportIssue[];
}

// ─── Template ─────────────────────────────────────────────────────────────────
// Mirrors the Add Product page field-for-field (ProductFormPage.tsx) —
// same columns in the same order, "*" marking what that page requires too.
// Product Name / Category / Stock Quantity are always required; Unit Size is
// required only for Consumable/Both; Retail Price is required only when the
// product sells retail (Retail/Both) — same conditional rules as the form.
const SAMPLE_COLUMNS = [
  "Product Name *",
  "Barcode",
  "Category *",
  "Brand",
  "Supplier",
  "Description",
  "Remark",
  "Product Type",
  "Stock Quantity *",
  "Unit Size",
  "Unit",
  "Low Stock Alert",
  "Lot Number",
  "Supply Price",
  "Tax Type",
  "Custom Tax Rate",
  "Tax Group",
  "HSN/SAC",
  "Expiry Date",
  "Retail Price *",
  "Is Public",
];

const SAMPLE_ROWS = [
  [
    "Lakme Blush & Glow Kiwi Freshness Gel Face Wash 100g",
    "LWFV100",
    "Skin Care",
    "Lakme",
    "",
    "",
    "",
    "Retail",
    "1",
    "",
    "",
    "1",
    "",
    "215",
    "GST 18%",
    "",
    "",
    "",
    "",
    "269",
    "Yes",
  ],
  [
    "Lakme Perfect Radiance Skin Lighting Face Wash 50gm",
    "LPRA1R4",
    "Skin Care",
    "Lakme",
    "",
    "",
    "",
    "Retail",
    "11",
    "",
    "",
    "4",
    "",
    "0",
    "GST 18%",
    "",
    "",
    "",
    "",
    "130",
    "Yes",
  ],
];

function downloadTemplate() {
  const csv = [SAMPLE_COLUMNS, ...SAMPLE_ROWS]
    .map((r) => r.map((v) => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function downloadErrorReport(issues: ImportIssue[]) {
  const header = ["Row", "Product Name", "Status", "Reason", "Suggested Fix"];
  const lines = issues.map((iss) => [
    iss.row || "",
    iss.name || "",
    iss.status === "skipped" ? "Skipped" : "Failed",
    iss.reason,
    iss.suggestion || "",
  ].map(csvCell).join(","));
  const csv = [header.map(csvCell).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "product_import_error_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ImportProductsPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ACCEPTED = [".csv", ".xlsx", ".xls"];

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
      const res = await api.post(PRODUCTS.IMPORT, formData, {
        headers: { "Content-Type": undefined },
        timeout: 300_000,  // 5 minutes — large CSVs can take 90–120s
      });
      const data = res.data?.data ?? res.data;
      setResult({
        total_rows: data.total ?? (data.success ?? 0) + (data.failed ?? 0) + (data.skipped ?? 0),
        imported: data.success ?? data.imported ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
        categoriesCreated: data.categoriesCreated ?? [],
        // Backend now returns rich per-row issues (row, name, status,
        // reason, suggestion) instead of a bare {row, reason} pair — falls
        // back to the old `errors` shape if an older API build is still live.
        issues: (data.issues ?? data.errors ?? []).map((e: any): ImportIssue =>
          typeof e === "string"
            ? { row: 0, status: "failed", reason: e }
            : { row: e.row, name: e.name, status: e.status ?? "failed", reason: e.reason, suggestion: e.suggestion }
        ),
      });
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

  function handleReimport() {
    setResult(null);
    setFile(null);
    setError(null);
    setTimeout(() => fileRef.current?.click(), 80);
  }

  const isCSV = file?.name.toLowerCase().endsWith(".csv");
  const importedCount = result?.imported ?? 0;

  return (
    <div className="pip-page">
      {/* Hidden File Input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
      />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="pip-topbar">
        <span className="pip-topbar-title">Import Products</span>
        <button
          className="pip-close-btn"
          onClick={() => navigate("/dashboard/catalog/products")}
        >
          <X size={20} />
          Close
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="pip-body">
        <div className="pip-card">

          {/* Template row */}
          <div className="pip-template-row">
            <span className="pip-template-label">Need the correct format?</span>
            <button className="pip-template-btn" onClick={downloadTemplate}>
              <Download size={13} /> Download sample template
            </button>
          </div>

          {/* Expected columns */}
          <div className="pip-columns-wrap">
            <p className="pip-columns-title">Expected columns:</p>
            <div className="pip-columns-list">
              {SAMPLE_COLUMNS.map((col) => (
                <span key={col} className="pip-col-chip">{col}</span>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              className={`pip-dropzone ${dragging ? "pip-dropzone--dragging" : ""} ${file ? "pip-dropzone--has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !file && fileRef.current?.click()}
            >
              {file ? (
                <div className="pip-selected-file">
                  {isCSV
                    ? <FiletypeCsv size={28} className="pip-file-icon pip-file-icon--csv" />
                    : <FileEarmarkExcel size={28} className="pip-file-icon pip-file-icon--xlsx" />
                  }
                  <div className="pip-file-info">
                    <span className="pip-file-name">{file.name}</span>
                    <span className="pip-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button
                    className="pip-remove-file"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }}
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <CloudUpload size={36} className="pip-upload-icon" />
                  <p className="pip-drop-text">
                    Drag &amp; drop your file here, or <span className="pip-browse-link">browse</span>
                  </p>
                  <p className="pip-drop-hint">Supports CSV, XLSX, XLS · Max 10 MB</p>
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="pip-alert pip-alert--error">
              <ExclamationCircleFill size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="pip-result">
              <div className="pip-result-header">
                <CheckCircleFill size={20} className="pip-result-icon" />
                <span className="pip-result-title">
                  Import complete — {importedCount} product{importedCount !== 1 ? "s" : ""} imported successfully
                </span>
              </div>
              <div className="pip-result-stats">
                <div className="pip-stat">
                  <span className="pip-stat-value">{result.total_rows}</span>
                  <span className="pip-stat-label">Total rows</span>
                </div>
                <div className="pip-stat pip-stat--success">
                  <span className="pip-stat-value">{result.imported}</span>
                  <span className="pip-stat-label">Imported</span>
                </div>
                <div className="pip-stat pip-stat--warn">
                  <span className="pip-stat-value">{result.skipped}</span>
                  <span className="pip-stat-label">Skipped</span>
                </div>
                {(result.failed ?? 0) > 0 && (
                  <div className="pip-stat pip-stat--error">
                    <span className="pip-stat-value">{result.failed}</span>
                    <span className="pip-stat-label">Failed</span>
                  </div>
                )}
              </div>
              {result.categoriesCreated?.length > 0 && (
                <div className="pip-categories-wrap">
                  <p className="pip-categories-title">
                    New categories created ({result.categoriesCreated.length})
                  </p>
                  <div className="pip-columns-list">
                    {result.categoriesCreated.map((name) => (
                      <span key={name} className="pip-col-chip">{name}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.issues?.length > 0 && (
                <div className="pip-errors-wrap">
                  <div className="pip-errors-head">
                    <p className="pip-errors-title">
                      Rows needing attention ({result.issues.length})
                    </p>
                    <div className="pip-errors-head-right">
                      <button
                        type="button"
                        className="pip-report-btn"
                        onClick={() => downloadErrorReport(result.issues)}
                      >
                        <Download size={12} /> Download error report (CSV)
                      </button>
                      <button
                        type="button"
                        className="pip-reimport-btn"
                        onClick={handleReimport}
                      >
                        <CloudUpload size={13} /> Re-import
                      </button>
                    </div>
                  </div>
                  <div className="pip-issues-table-wrap">
                    <table className="pip-issues-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Product</th>
                          <th>Status</th>
                          <th>Reason</th>
                          <th>Suggested fix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.issues.map((iss, i) => (
                          <tr key={i}>
                            <td>{iss.row || "—"}</td>
                            <td>{iss.name || "—"}</td>
                            <td>
                              <span className={`pip-status-chip pip-status-chip--${iss.status}`}>
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
            </div>
          )}

          {/* Footer buttons */}
          <div className="pip-footer">
            <button
              className="pip-btn pip-btn--ghost"
              onClick={() => navigate("/dashboard/catalog/products")}
              disabled={loading}
            >
              Cancel
            </button>
            {result ? (
              <>
                {((result.failed ?? 0) > 0 || (result.skipped ?? 0) > 0 || (result.issues?.length ?? 0) > 0) && (
                  <button
                    type="button"
                    className="pip-btn pip-btn--reimport"
                    onClick={handleReimport}
                  >
                    <CloudUpload size={14} /> Re-import
                  </button>
                )}
                <button
                  className="pip-btn pip-btn--primary"
                  onClick={() => navigate("/dashboard/catalog/products")}
                >
                  Done
                </button>
              </>
            ) : (
              <button
                className="pip-btn pip-btn--primary"
                onClick={handleImport}
                disabled={!file || loading}
              >
                {loading ? "Importing…" : "Import"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .pip-page { min-height:100vh; background:#f9fafb; font-family:'Inter',sans-serif; }

        /* Top bar */
        .pip-topbar { display:flex; align-items:center; justify-content:space-between; padding:14px 28px; background:#fff; border-bottom:1px solid #e5e7eb; }
        .pip-topbar-title { font-size:16px; font-weight:600; color:#111827; }
        .pip-close-btn { display:flex; align-items:center; gap:6px; background:none; border:1px solid #d1d5db; border-radius:8px; padding:7px 14px; font-size:14px; color:#374151; cursor:pointer; transition:background .15s; }
        .pip-close-btn:hover { background:#f3f4f6; }

        /* Body */
        .pip-body { display:flex; justify-content:center; padding:40px 20px; }
        .pip-card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:28px; width:100%; max-width:680px; display:flex; flex-direction:column; gap:20px; }

        /* Template row */
        .pip-template-row { display:flex; align-items:center; justify-content:space-between; }
        .pip-template-label { font-size:13px; color:#6b7280; }
        .pip-template-btn { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:500; color:#4f46e5; background:none; border:none; cursor:pointer; padding:0; }
        .pip-template-btn:hover { text-decoration:underline; }

        /* Columns */
        .pip-columns-wrap { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
        .pip-columns-title { font-size:12px; font-weight:600; color:#374151; margin:0 0 8px; }
        .pip-columns-list { display:flex; flex-wrap:wrap; gap:6px; }
        .pip-col-chip { background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:500; padding:2px 8px; border-radius:999px; }

        /* Dropzone */
        .pip-dropzone { border:2px dashed #d1d5db; border-radius:12px; padding:32px; display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:border-color .2s,background .2s; }
        .pip-dropzone:hover,.pip-dropzone--dragging { border-color:#4f46e5; background:#f5f3ff; }
        .pip-dropzone--has-file { cursor:default; padding:20px 24px; }
        .pip-upload-icon { color:#9ca3af; }
        .pip-drop-text { font-size:14px; color:#374151; margin:0; text-align:center; }
        .pip-browse-link { color:#4f46e5; font-weight:500; }
        .pip-drop-hint { font-size:12px; color:#9ca3af; margin:0; }

        /* Selected file */
        .pip-selected-file { display:flex; align-items:center; gap:12px; width:100%; }
        .pip-file-icon--csv { color:#22c55e; }
        .pip-file-icon--xlsx { color:#16a34a; }
        .pip-file-info { flex:1; display:flex; flex-direction:column; }
        .pip-file-name { font-size:14px; font-weight:500; color:#111827; }
        .pip-file-size { font-size:12px; color:#9ca3af; }
        .pip-remove-file { background:none; border:none; color:#9ca3af; cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; }
        .pip-remove-file:hover { color:#ef4444; background:#fee2e2; }

        /* Alert */
        .pip-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; font-size:13px; }
        .pip-alert--error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }

        /* Result */
        .pip-result { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:20px; }
        .pip-result-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
        .pip-result-icon { color:#16a34a; }
        .pip-result-title { font-size:15px; font-weight:600; color:#15803d; }
        .pip-result-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:12px; margin-bottom:12px; }
        .pip-stat { background:#fff; border-radius:8px; padding:12px; text-align:center; border:1px solid #e5e7eb; display:flex; flex-direction:column; gap:4px; }
        .pip-stat-value { font-size:22px; font-weight:700; color:#111827; }
        .pip-stat-label { font-size:11px; color:#6b7280; }
        .pip-stat--success .pip-stat-value { color:#16a34a; }
        .pip-stat--warn .pip-stat-value { color:#d97706; }
        .pip-stat--error .pip-stat-value { color:#dc2626; }
        .pip-categories-wrap { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; margin-bottom:12px; }
        .pip-categories-title { font-size:12px; font-weight:600; color:#1e40af; margin:0 0 8px; }
        .pip-errors-wrap { background:#fef9c3; border:1px solid #fde68a; border-radius:8px; padding:12px; }
        .pip-errors-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
        .pip-errors-head-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pip-errors-title { font-size:12px; font-weight:600; color:#92400e; margin:0; }
        .pip-report-btn { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:#92400e; background:#fff; border:1px solid #fde68a; border-radius:6px; padding:5px 10px; cursor:pointer; white-space:nowrap; transition:background .15s; }
        .pip-report-btn:hover { background:#fef3c7; }
        .pip-reimport-btn { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:#4f46e5; background:#fff; border:1px solid #c7d2fe; border-radius:6px; padding:5px 10px; cursor:pointer; white-space:nowrap; transition:background .15s; }
        .pip-reimport-btn:hover { background:#eef2ff; }
        .pip-issues-table-wrap { max-height:280px; overflow-y:auto; overflow-x:auto; border:1px solid #fde68a; border-radius:6px; background:#fffdf5; }
        .pip-issues-table { width:100%; border-collapse:collapse; font-size:12px; }
        .pip-issues-table thead th { position:sticky; top:0; background:#fef3c7; color:#92400e; text-align:left; font-weight:600; padding:7px 10px; white-space:nowrap; border-bottom:1px solid #fde68a; }
        .pip-issues-table tbody td { padding:7px 10px; color:#78350f; border-bottom:1px solid #fef3c7; vertical-align:top; }
        .pip-issues-table tbody tr:last-child td { border-bottom:none; }
        .pip-status-chip { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
        .pip-status-chip--failed { background:#fee2e2; color:#b91c1c; }
        .pip-status-chip--skipped { background:#fef3c7; color:#b45309; }

        /* Footer */
        .pip-footer { display:flex; gap:10px; justify-content:flex-end; }
        .pip-btn { padding:9px 20px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; transition:background .15s; }
        .pip-btn--primary { background:#111827; color:#fff; }
        .pip-btn--primary:hover:not(:disabled) { background:#1f2937; }
        .pip-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
        .pip-btn--ghost { background:transparent; color:#374151; border:1px solid #d1d5db; }
        .pip-btn--ghost:hover:not(:disabled) { background:#f3f4f6; }
        .pip-btn--reimport { display:flex; align-items:center; gap:6px; background:#fff; color:#4f46e5; border:1px solid #c7d2fe; }
        .pip-btn--reimport:hover { background:#eef2ff; }
      `}</style>
    </div>
  );
}
