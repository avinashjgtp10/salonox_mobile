import { useRef, useState } from "react";
import { CloudUpload, FiletypeCsv, FileEarmarkExcel, CheckCircleFill, ExclamationCircleFill, ExclamationTriangleFill, X, Download, Eye, ChevronDown, ChevronUp } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SALE } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

// ─── Types ────────────────────────────────────────────────────────────────
interface ImportIssue {
  row: number;
  status: "failed" | "skipped";
  reason: string;
  suggestion?: string;
}

interface RowPreviewItem {
  input: string;
  matched_name: string | null;
  type: "service" | "product" | null;
}

interface RowPreview {
  row: number;
  date?: string;
  client: { input: string | undefined; matched_name: string | null; will_create: boolean };
  staff: { input: string | undefined; matched_name: string | null; will_create: boolean };
  items: RowPreviewItem[];
  amount?: number;
  discount: number;
  tax: number;
  payment_method: string | null;
  status: "valid" | "failed";
  error?: string;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  // Bill Amount — the sale value excluding tax (amount - discount).
  total_bill_amount: number;
  // Tax Amount — the GST/tax summed across all rows.
  total_tax_amount: number;
  // Total Sale — total_bill_amount + total_tax_amount.
  total_billed: number;
  new_clients: number;
  new_staff: number;
  duplicate_batch: boolean;
  issues: ImportIssue[];
  preview?: RowPreview[];
  preview_truncated?: boolean;
}

// ─── Template ─────────────────────────────────────────────────────────────
const SAMPLE_COLUMNS = [
  "Date *", "Client *", "Client Phone *", "Staff *", "Service/Product *",
  "Amount *", "Discount", "Tax", "Payment Method", "Notes",
];

const SAMPLE_ROWS = [
  ["01-01-2025", "Client A", "9876543210", "Staff A", "Haircut", "500", "", "", "Cash", ""],
  ["02-01-2025", "Client A", "9876543210", "Staff A, Staff B", "Haircut Ladies, Loreal Spa Ladies", "3422", "", "", "Gpay", ""],
];

function downloadTemplate() {
  const csv = [SAMPLE_COLUMNS, ...SAMPLE_ROWS].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "bulk_billing_import_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function downloadErrorReport(issues: ImportIssue[]) {
  const header = ["Row", "Status", "Reason", "Suggested Fix"];
  const lines = issues.map((iss) => [
    iss.row || "", iss.status === "skipped" ? "Skipped" : "Failed", iss.reason, iss.suggestion || "",
  ].map(csvCell).join(","));
  const csv = [header.map(csvCell).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "bulk_billing_import_error_report.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function BulkBillingImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { formatAmount } = useCurrency();
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const canImport = can("view_settings_bulk_billing_import");
  const denyImport = () => dispatch(showPermissionDenied(
    `Your account does not have the "view_settings_bulk_billing_import" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [finalResult, setFinalResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRowPreview, setShowRowPreview] = useState(false);

  const ACCEPTED = [".csv", ".xlsx", ".xls"];
  const result = finalResult ?? preview;

  function pickFile(f: File) {
    if (!canImport) { denyImport(); return; }
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError("Only CSV and Excel (.xlsx, .xls) files are supported.");
      return;
    }
    setFile(f);
    setError(null);
    setPreview(null);
    setFinalResult(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  }

  async function runImport(dryRun: boolean) {
    if (!canImport) { denyImport(); return; }
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dry_run", String(dryRun));
      const res = await api.post(SALE.IMPORT, formData, {
        headers: { "Content-Type": undefined },
        timeout: 300_000, // large sheets can take a while
      });
      const data: ImportResult = res.data?.data ?? res.data;
      if (dryRun) setPreview(data);
      else setFinalResult(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Import failed. Please check your file and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPreview(null);
    setFinalResult(null);
    setFile(null);
    setError(null);
    setTimeout(() => fileRef.current?.click(), 80);
  }

  const isCSV = file?.name.toLowerCase().endsWith(".csv");
  const blockedByDuplicate = !!preview?.duplicate_batch && !finalResult;

  return (
    <div className="bbi-page">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
      />

      <div className="bbi-header">
        <h2 className="bbi-title">Bulk Billing Import</h2>
        <p className="bbi-subtitle">
          Upload an Excel or CSV of historical billing records — SalonoX will validate every row and generate
          correctly dated invoices, preserving each row's own billing date, amount, discount and tax. Client
          Phone is required on every row (used to reliably match or create the client — a bare name alone risks
          splitting an existing client into a duplicate). A Client or Staff name that doesn't match an existing
          record is added automatically (Staff auto-added this way only gets a name — email/phone/gender can be
          filled in later from Team settings; SalonoX assigns their Staff Code the same way it does for any new
          staff member). The Service/Product column can list multiple items on one bill separated by commas
          (e.g. "Haircut, Hair Spa") — each must match your existing catalog exactly. For a bill with more than
          one item, Staff can likewise list one name per item in the same order (e.g. "Staff A, Staff B"), or a
          single name to apply to the whole bill. Leave Staff blank for a bill with no recorded staff; it's
          billed under "Unknown / Imported Staff" instead of guessing. Payment Method accepts common UPI app
          names (Gpay, Google Pay, PhonePe, Paytm) — all normalized to UPI.
        </p>
      </div>

      <div className="bbi-card">
        {/* Template row */}
        <div className="bbi-template-row">
          <span className="bbi-template-label">Need the correct format?</span>
          <button className="bbi-template-btn" onClick={downloadTemplate}>
            <Download size={13} /> Download sample template
          </button>
        </div>

        {/* Expected columns */}
        <div className="bbi-columns-wrap">
          <p className="bbi-columns-title">Expected columns:</p>
          <div className="bbi-columns-list">
            {SAMPLE_COLUMNS.map((col) => <span key={col} className="bbi-col-chip">{col}</span>)}
          </div>
        </div>

        {/* Drop zone */}
        {!result && (
          <div
            className={`bbi-dropzone ${dragging ? "bbi-dropzone--dragging" : ""} ${file ? "bbi-dropzone--has-file" : ""}`}
            style={!canImport ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            title={!canImport ? "You don't have permission to import billing records." : undefined}
            onDragOver={(e) => { e.preventDefault(); if (canImport) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { if (!canImport) { e.preventDefault(); denyImport(); return; } onDrop(e); }}
            onClick={() => { if (!canImport) { denyImport(); return; } if (!file) fileRef.current?.click(); }}
          >
            {file ? (
              <div className="bbi-selected-file">
                {isCSV ? <FiletypeCsv size={28} className="bbi-file-icon bbi-file-icon--csv" /> : <FileEarmarkExcel size={28} className="bbi-file-icon bbi-file-icon--xlsx" />}
                <div className="bbi-file-info">
                  <span className="bbi-file-name">{file.name}</span>
                  <span className="bbi-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button className="bbi-remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }} title="Remove">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <CloudUpload size={36} className="bbi-upload-icon" />
                <p className="bbi-drop-text">Drag &amp; drop your file here, or <span className="bbi-browse-link">browse</span></p>
                <p className="bbi-drop-hint">Supports CSV, XLSX, XLS · Max 10 MB</p>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="bbi-alert bbi-alert--error">
            <ExclamationCircleFill size={15} /><span>{error}</span>
          </div>
        )}

        {preview?.duplicate_batch && (
          <div className="bbi-alert bbi-alert--warn">
            <ExclamationTriangleFill size={15} />
            <span>
              {finalResult
                ? "This exact file was already imported previously — no new invoices were created."
                : "This exact file appears to have already been imported. Generating invoices from it again is blocked to avoid duplicate billing."}
            </span>
          </div>
        )}

        {/* Result / preview */}
        {result && (
          <div className={`bbi-result ${finalResult ? "bbi-result--final" : "bbi-result--preview"}`}>
            <div className="bbi-result-header">
              {finalResult ? <CheckCircleFill size={20} className="bbi-result-icon" /> : <Eye size={20} className="bbi-result-icon" />}
              <span className="bbi-result-title">
                {finalResult
                  ? `Import complete — ${finalResult.success} invoice${finalResult.success !== 1 ? "s" : ""} generated`
                  : `Preview — ${preview!.success} of ${preview!.total} row${preview!.total !== 1 ? "s" : ""} ready to import`}
              </span>
            </div>
            <div className="bbi-result-stats">
              <div className="bbi-stat"><span className="bbi-stat-value">{result.total}</span><span className="bbi-stat-label">Total rows</span></div>
              <div className="bbi-stat bbi-stat--success"><span className="bbi-stat-value">{result.success}</span><span className="bbi-stat-label">{finalResult ? "Invoices created" : "Valid"}</span></div>
              <div className="bbi-stat bbi-stat--warn"><span className="bbi-stat-value">{result.skipped}</span><span className="bbi-stat-label">Skipped</span></div>
              <div className="bbi-stat bbi-stat--error"><span className="bbi-stat-value">{result.failed}</span><span className="bbi-stat-label">Failed</span></div>
              <div className="bbi-stat"><span className="bbi-stat-value">{formatAmount(result.total_bill_amount)}</span><span className="bbi-stat-label">Bill Amount</span></div>
              <div className="bbi-stat"><span className="bbi-stat-value">{formatAmount(result.total_tax_amount)}</span><span className="bbi-stat-label">Tax Amount</span></div>
              <div className="bbi-stat"><span className="bbi-stat-value">{formatAmount(result.total_billed)}</span><span className="bbi-stat-label">Total Sale</span></div>
              {result.new_clients > 0 && (
                <div className="bbi-stat"><span className="bbi-stat-value">{result.new_clients}</span><span className="bbi-stat-label">{finalResult ? "New clients added" : "New clients"}</span></div>
              )}
              {result.new_staff > 0 && (
                <div className="bbi-stat"><span className="bbi-stat-value">{result.new_staff}</span><span className="bbi-stat-label">{finalResult ? "New staff added" : "New staff"}</span></div>
              )}
            </div>

            {result.issues?.length > 0 && (
              <div className="bbi-errors-wrap">
                <div className="bbi-errors-head">
                  <p className="bbi-errors-title">Rows needing attention ({result.issues.length})</p>
                  <button type="button" className="bbi-report-btn" onClick={() => downloadErrorReport(result.issues)}>
                    <Download size={12} /> Download error report (CSV)
                  </button>
                </div>
                <div className="bbi-issues-table-wrap">
                  <table className="bbi-issues-table">
                    <thead><tr><th>Row</th><th>Status</th><th>Reason</th><th>Suggested fix</th></tr></thead>
                    <tbody>
                      {result.issues.map((iss, i) => (
                        <tr key={i}>
                          <td>{iss.row || "—"}</td>
                          <td><span className={`bbi-status-chip bbi-status-chip--${iss.status}`}>{iss.status === "skipped" ? "Skipped" : "Failed"}</span></td>
                          <td>{iss.reason}</td>
                          <td>{iss.suggestion || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!finalResult && preview?.preview && preview.preview.length > 0 && (
              <div className="bbi-rowpreview-wrap">
                <button type="button" className="bbi-rowpreview-toggle" onClick={() => setShowRowPreview((s) => !s)}>
                  {showRowPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Row-by-row preview ({preview.preview.length}{preview.preview_truncated ? ` of ${preview.total}` : ""})
                </button>
                {showRowPreview && (
                  <div className="bbi-rowpreview-table-wrap">
                    {preview.preview_truncated && (
                      <p className="bbi-rowpreview-note">
                        Showing the first {preview.preview.length} of {preview.total} rows — every row is still
                        validated and (on Generate) processed; this preview is just capped for display.
                      </p>
                    )}
                    <table className="bbi-rowpreview-table">
                      <thead>
                        <tr>
                          <th>Row</th><th>Date</th><th>Client</th><th>Staff</th><th>Item(s)</th>
                          <th>Amount</th><th>Discount</th><th>Tax</th><th>Payment</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.map((rp) => (
                          <tr key={rp.row} className={rp.status === "failed" ? "bbi-rowpreview-row--failed" : undefined}>
                            <td>{rp.row}</td>
                            <td>{rp.date || "—"}</td>
                            <td>
                              {rp.client.matched_name || rp.client.input || "—"}
                              {rp.client.will_create && <span className="bbi-rowpreview-tag">new</span>}
                            </td>
                            <td>
                              {rp.staff.matched_name || rp.staff.input || "—"}
                              {rp.staff.will_create && <span className="bbi-rowpreview-tag">new</span>}
                            </td>
                            <td>
                              {rp.items.length === 0 ? "—" : rp.items.map((it, idx) => (
                                <div key={idx} className={it.matched_name ? undefined : "bbi-rowpreview-unmatched"}>
                                  {it.input}{it.matched_name && it.matched_name !== it.input ? ` → ${it.matched_name}` : ""}
                                  {!it.matched_name && " (not found)"}
                                </div>
                              ))}
                            </td>
                            <td>{rp.amount != null ? formatAmount(rp.amount) : "—"}</td>
                            <td>{formatAmount(rp.discount)}</td>
                            <td>{formatAmount(rp.tax)}</td>
                            <td>{rp.payment_method || "Cash"}</td>
                            <td>
                              <span className={`bbi-status-chip bbi-status-chip--${rp.status === "failed" ? "failed" : "skipped"}`} style={rp.status === "valid" ? { background: "#dcfce7", color: "#15803d" } : undefined}>
                                {rp.status === "valid" ? "Valid" : "Failed"}
                              </span>
                              {rp.error && <div className="bbi-rowpreview-error">{rp.error}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer buttons */}
        <div className="bbi-footer">
          {!result && (
            <button
              className="bbi-btn bbi-btn--primary"
              onClick={() => { if (!canImport) { denyImport(); return; } runImport(true); }}
              disabled={canImport && (!file || loading)}
              title={!canImport ? "You don't have permission to import billing records." : undefined}
            >
              {loading ? "Validating…" : "Preview"}
            </button>
          )}
          {preview && !finalResult && (
            <>
              <button className="bbi-btn bbi-btn--ghost" onClick={handleReset} disabled={loading}>Choose a different file</button>
              <button
                className="bbi-btn bbi-btn--primary"
                onClick={() => { if (!canImport) { denyImport(); return; } runImport(false); }}
                disabled={canImport && (loading || preview.success === 0 || blockedByDuplicate)}
                title={!canImport ? "You don't have permission to import billing records." : undefined}
              >
                {loading ? "Generating…" : `Generate ${preview.success} Invoice${preview.success !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
          {finalResult && (
            <button className="bbi-btn bbi-btn--ghost" onClick={handleReset}>Import another file</button>
          )}
        </div>
      </div>

      <style>{`
        .bbi-page { display:flex; flex-direction:column; gap:16px; }
        .bbi-header { display:flex; flex-direction:column; gap:4px; }
        .bbi-title { font-size:16px; font-weight:600; color:#111827; margin:0; }
        .bbi-subtitle { font-size:13px; color:#6b7280; margin:0; max-width:900px; }

        .bbi-card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:24px; display:flex; flex-direction:column; gap:18px; max-width:1100px; }

        .bbi-template-row { display:flex; align-items:center; justify-content:space-between; }
        .bbi-template-label { font-size:13px; color:#6b7280; }
        .bbi-template-btn { display:flex; align-items:center; gap:5px; font-size:13px; font-weight:500; color:#4f46e5; background:none; border:none; cursor:pointer; padding:0; }
        .bbi-template-btn:hover { text-decoration:underline; }

        .bbi-columns-wrap { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
        .bbi-columns-title { font-size:12px; font-weight:600; color:#374151; margin:0 0 8px; }
        .bbi-columns-list { display:flex; flex-wrap:wrap; gap:6px; }
        .bbi-col-chip { background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:500; padding:2px 8px; border-radius:999px; }

        .bbi-dropzone { border:2px dashed #d1d5db; border-radius:12px; padding:32px; display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:border-color .2s,background .2s; }
        .bbi-dropzone:hover,.bbi-dropzone--dragging { border-color:#4f46e5; background:#f5f3ff; }
        .bbi-dropzone--has-file { cursor:default; padding:20px 24px; }
        .bbi-upload-icon { color:#9ca3af; }
        .bbi-drop-text { font-size:14px; color:#374151; margin:0; text-align:center; }
        .bbi-browse-link { color:#4f46e5; font-weight:500; }
        .bbi-drop-hint { font-size:12px; color:#9ca3af; margin:0; }

        .bbi-selected-file { display:flex; align-items:center; gap:12px; width:100%; }
        .bbi-file-icon--csv { color:#22c55e; }
        .bbi-file-icon--xlsx { color:#16a34a; }
        .bbi-file-info { flex:1; display:flex; flex-direction:column; }
        .bbi-file-name { font-size:14px; font-weight:500; color:#111827; }
        .bbi-file-size { font-size:12px; color:#9ca3af; }
        .bbi-remove-file { background:none; border:none; color:#9ca3af; cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:4px; }
        .bbi-remove-file:hover { color:#ef4444; background:#fee2e2; }

        .bbi-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; font-size:13px; }
        .bbi-alert--error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
        .bbi-alert--warn { background:#fffbeb; color:#92400e; border:1px solid #fde68a; }

        .bbi-result { border-radius:12px; padding:20px; border:1px solid; }
        .bbi-result--preview { background:#eff6ff; border-color:#bfdbfe; }
        .bbi-result--final { background:#f0fdf4; border-color:#bbf7d0; }
        .bbi-result-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
        .bbi-result--preview .bbi-result-icon { color:#2563eb; }
        .bbi-result--final .bbi-result-icon { color:#16a34a; }
        .bbi-result--preview .bbi-result-title { color:#1e40af; }
        .bbi-result--final .bbi-result-title { color:#15803d; }
        .bbi-result-title { font-size:15px; font-weight:600; }
        /* Fixed 5-per-row — auto-fit/minmax packed as many as fit (7 on a wide
           screen), which is what made cards cramped enough to wrap currency
           values mid-number. A fixed column count always wraps to a new row
           after the 5th card, regardless of container width. */
        .bbi-result-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:4px; }
        /* min-width:0 overrides the grid item's default min-width:auto —
           without it, a long unbroken currency string (e.g. "₹1,46,79,961.00")
           forces its column wider than the 130px track, which visually
           overflows/clips the figure instead of wrapping it onto a second
           line. Large rupee totals on an 8,000+ row import made this show up
           immediately; short integer stats (Total rows, New staff, etc.)
           never hit it because they're short enough to fit either way. */
        .bbi-stat { min-width:0; background:#fff; border-radius:8px; padding:12px 8px; text-align:center; border:1px solid #e5e7eb; display:flex; flex-direction:column; gap:4px; }
        .bbi-stat-value { font-size:20px; font-weight:700; color:#111827; overflow-wrap:break-word; word-break:break-word; }
        .bbi-stat-label { font-size:11px; color:#6b7280; }
        .bbi-stat--success .bbi-stat-value { color:#16a34a; }
        .bbi-stat--warn .bbi-stat-value { color:#d97706; }
        .bbi-stat--error .bbi-stat-value { color:#dc2626; }

        .bbi-errors-wrap { background:#fef9c3; border:1px solid #fde68a; border-radius:8px; padding:12px; margin-top:12px; }
        .bbi-errors-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
        .bbi-errors-title { font-size:12px; font-weight:600; color:#92400e; margin:0; }
        .bbi-report-btn { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; color:#92400e; background:#fff; border:1px solid #fde68a; border-radius:6px; padding:5px 10px; cursor:pointer; white-space:nowrap; }
        .bbi-report-btn:hover { background:#fef3c7; }
        .bbi-issues-table-wrap { max-height:280px; overflow-y:auto; overflow-x:auto; border:1px solid #fde68a; border-radius:6px; background:#fffdf5; }
        .bbi-issues-table { width:100%; border-collapse:collapse; font-size:12px; }
        .bbi-issues-table thead th { position:sticky; top:0; background:#fef3c7; color:#92400e; text-align:left; font-weight:600; padding:7px 10px; white-space:nowrap; border-bottom:1px solid #fde68a; }
        .bbi-issues-table tbody td { padding:7px 10px; color:#78350f; border-bottom:1px solid #fef3c7; vertical-align:top; }
        .bbi-issues-table tbody tr:last-child td { border-bottom:none; }
        .bbi-status-chip { display:inline-block; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
        .bbi-status-chip--failed { background:#fee2e2; color:#b91c1c; }
        .bbi-status-chip--skipped { background:#fef3c7; color:#b45309; }

        .bbi-rowpreview-wrap { margin-top:12px; }
        .bbi-rowpreview-toggle { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#374151; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:6px 10px; cursor:pointer; }
        .bbi-rowpreview-toggle:hover { background:#e5e7eb; }
        .bbi-rowpreview-note { font-size:11.5px; color:#6b7280; margin:8px 0; }
        .bbi-rowpreview-table-wrap { max-height:400px; overflow:auto; border:1px solid #e5e7eb; border-radius:6px; margin-top:8px; }
        .bbi-rowpreview-table { width:100%; border-collapse:collapse; font-size:11.5px; }
        .bbi-rowpreview-table thead th { position:sticky; top:0; background:#f9fafb; color:#374151; text-align:left; font-weight:600; padding:6px 9px; white-space:nowrap; border-bottom:1px solid #e5e7eb; }
        .bbi-rowpreview-table tbody td { padding:6px 9px; color:#374151; border-bottom:1px solid #f3f4f6; vertical-align:top; }
        .bbi-rowpreview-table tbody tr:last-child td { border-bottom:none; }
        .bbi-rowpreview-row--failed { background:#fef2f2; }
        .bbi-rowpreview-tag { margin-left:5px; font-size:9.5px; font-weight:700; color:#4f46e5; background:#e0e7ff; padding:1px 5px; border-radius:999px; }
        .bbi-rowpreview-unmatched { color:#dc2626; }
        .bbi-rowpreview-error { font-size:10.5px; color:#dc2626; margin-top:2px; }

        .bbi-footer { display:flex; gap:10px; justify-content:flex-end; }
        .bbi-btn { padding:9px 20px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; transition:background .15s; }
        .bbi-btn--primary { background:#111827; color:#fff; }
        .bbi-btn--primary:hover:not(:disabled) { background:#1f2937; }
        .bbi-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
        .bbi-btn--ghost { background:transparent; color:#374151; border:1px solid #d1d5db; }
        .bbi-btn--ghost:hover:not(:disabled) { background:#f3f4f6; }
      `}</style>
    </div>
  );
}
