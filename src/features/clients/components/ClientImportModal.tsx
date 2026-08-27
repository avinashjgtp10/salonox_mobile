import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  CloudUpload,
  FiletypeCsv,
  FileEarmarkExcel,
  CheckCircleFill,
  ExclamationCircleFill,
  X,
  Download,
  PencilSquare,
} from "react-bootstrap-icons";
import { Modal } from "../../../components/ui";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";

// ── Types ───────────────────────────────────────────────────────────────────

interface ImportRow {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  gender: string;
  birthday: string;
  clientNotes: string;
}

interface RawImportError {
  row?: number;
  message?: string;
}

interface ImportResult {
  total_rows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<string | RawImportError>;
}

interface FailedRow extends ImportRow {
  key: string;
  status: "Skipped" | "Failed";
  reason: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Constants ───────────────────────────────────────────────────────────────

// Columns the backend expects in the CSV/Excel file
const SAMPLE_COLUMNS: (keyof ImportRow)[] = ["firstName", "lastName", "email", "mobile", "gender", "birthday", "clientNotes"];
const SAMPLE_ROWS = [
  ["John", "Doe", "john@example.com", "9876543210", "Male", "15-06-1990", "Regular customer"],
  ["Jane", "Smith", "jane@example.com", "8765432109", "Female", "22-03-1995", ""],
];

const EMPTY_ROW: ImportRow = { firstName: "", lastName: "", email: "", mobile: "", gender: "", birthday: "", clientNotes: "" };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recognized header spellings mapped to canonical ImportRow keys, so files
// that use "Mobile Number" / "mobile_number" / "Phone" etc. still parse.
const HEADER_MAP: Record<string, keyof ImportRow> = {
  firstname: "firstName", "first name": "firstName", "first_name": "firstName",
  lastname: "lastName", "last name": "lastName", "last_name": "lastName",
  email: "email",
  mobile: "mobile", "mobile number": "mobile", "mobile_number": "mobile", phone: "mobile", "phone number": "mobile",
  gender: "gender",
  birthday: "birthday", dob: "birthday", "date of birth": "birthday",
  clientnotes: "clientNotes", "client notes": "clientNotes", "client_notes": "clientNotes", notes: "clientNotes",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function formatError(e: string | RawImportError): string {
  if (typeof e === "string") return e;
  return e.row ? `Row ${e.row}: ${e.message}` : (e.message ?? "Unknown error");
}

function escapeCsvCell(v: string): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsvFile(rows: ImportRow[], filename: string): File {
  const lines = [SAMPLE_COLUMNS, ...rows.map((r) => SAMPLE_COLUMNS.map((c) => r[c] ?? ""))];
  const csv = lines.map((line) => line.map(escapeCsvCell).join(",")).join("\n");
  return new File([csv], filename, { type: "text/csv" });
}

function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
        const rows: ImportRow[] = raw.map((r) => {
          const row: ImportRow = { ...EMPTY_ROW };
          for (const [key, value] of Object.entries(r)) {
            const canon = HEADER_MAP[key.trim().toLowerCase()];
            if (canon) row[canon] = String(value ?? "").trim();
          }
          return row;
        });
        resolve(rows);
      } catch {
        reject(new Error("Could not read file. Make sure it is .csv, .xlsx, or .xls"));
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsArrayBuffer(file);
  });
}

// Validates the required-field/format rules that can be checked without a
// server round trip. Returns a human-readable failure reason, or null if the
// row is clean. `seenEmails` catches duplicate emails within the same file —
// duplicates against existing clients in the database are still caught by
// the backend and surfaced as "Failed" rows from its response.
function validateRow(row: ImportRow, seenEmails?: Set<string>): string | null {
  if (!row.firstName.trim()) return "First Name is required.";
  if (!row.gender.trim()) return "Gender is required.";
  if (!row.mobile.trim()) return "Mobile Number is required.";
  const digits = row.mobile.replace(/\D/g, "");
  if (digits.length < 10) return "Mobile Number is invalid.";
  if (row.email.trim()) {
    if (!EMAIL_REGEX.test(row.email.trim())) return "Email format is invalid.";
    if (seenEmails) {
      const key = row.email.trim().toLowerCase();
      if (seenEmails.has(key)) return "Duplicate email within this file.";
      seenEmails.add(key);
    }
  }
  return null;
}

async function postImport(rows: ImportRow[], filename: string): Promise<ImportResult> {
  const uploadFile = rowsToCsvFile(rows, filename);
  const formData = new FormData();
  formData.append("file", uploadFile);
  const res = await api.post(CLIENT.IMPORT, formData, {
    headers: { "Content-Type": undefined },
    timeout: 60_000,
  });
  return res.data?.data ?? res.data;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ClientImportModal({ show, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ImportRow>(EMPTY_ROW);
  const [rowSubmitting, setRowSubmitting] = useState<string | null>(null);

  const ACCEPTED = [".csv", ".xlsx", ".xls"];

  function handleClose() {
    setFile(null);
    setResult(null);
    setFailedRows([]);
    setError(null);
    setEditingKey(null);
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
    setFailedRows([]);
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
    setFailedRows([]);
    try {
      const rows = await parseFile(file);
      if (!rows.length) {
        setError("The file has no data rows.");
        return;
      }

      const seenEmails = new Set<string>();
      const validRows: ImportRow[] = [];
      const localFailed: FailedRow[] = [];
      rows.forEach((row, i) => {
        const reason = validateRow(row, seenEmails);
        if (reason) {
          localFailed.push({ ...row, key: `local-${i}`, status: "Skipped", reason });
        } else {
          validRows.push(row);
        }
      });

      let serverResult: ImportResult | null = null;
      const serverFailed: FailedRow[] = [];

      if (validRows.length > 0) {
        serverResult = await postImport(validRows, "clients_import.csv");

        (serverResult.errors ?? []).forEach((e, i) => {
          if (typeof e === "object" && e.row) {
            const row = validRows[e.row - 1]; // 1-based row numbers in the file we sent
            serverFailed.push({
              ...(row ?? EMPTY_ROW),
              key: `server-${e.row}`,
              status: "Failed",
              reason: e.message ?? "Import failed for this row.",
            });
          } else {
            serverFailed.push({
              ...EMPTY_ROW,
              key: `server-generic-${i}`,
              status: "Failed",
              reason: formatError(e),
            });
          }
        });
      }

      const allFailed = [...localFailed, ...serverFailed];
      setFailedRows(allFailed);
      setResult({
        total_rows: rows.length,
        imported: serverResult?.imported ?? 0,
        updated: serverResult?.updated ?? 0,
        skipped: allFailed.length,
        errors: serverResult?.errors ?? [],
      });
      if ((serverResult?.imported ?? 0) > 0 || (serverResult?.updated ?? 0) > 0) onSuccess();
    } catch (err: any) {
      setError(err?.message || "Import failed. Please check your file and try again.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(row: FailedRow) {
    setEditingKey(row.key);
    setEditDraft({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      mobile: row.mobile,
      gender: row.gender,
      birthday: row.birthday,
      clientNotes: row.clientNotes,
    });
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditDraft(EMPTY_ROW);
  }

  async function submitReimport(row: FailedRow) {
    const reason = validateRow(editDraft);
    if (reason) {
      setFailedRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, ...editDraft, status: "Skipped", reason } : r)));
      return;
    }

    setRowSubmitting(row.key);
    try {
      const data = await postImport([editDraft], "client_reimport.csv");
      if ((data.imported ?? 0) > 0 || (data.updated ?? 0) > 0) {
        setFailedRows((prev) => prev.filter((r) => r.key !== row.key));
        setResult((prev) =>
          prev
            ? {
                ...prev,
                imported: prev.imported + (data.imported ?? 0),
                updated: prev.updated + (data.updated ?? 0),
                skipped: Math.max(0, prev.skipped - 1),
              }
            : prev
        );
        onSuccess();
        cancelEdit();
      } else {
        const msg = data.errors?.[0] ? formatError(data.errors[0]) : "Still couldn't import this record.";
        setFailedRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, ...editDraft, status: "Failed", reason: msg } : r)));
      }
    } catch (err: any) {
      const msg = err?.message || "Re-import failed.";
      setFailedRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, ...editDraft, status: "Failed", reason: msg } : r)));
    } finally {
      setRowSubmitting(null);
    }
  }

  function exportFailedRows() {
    const cols = [...SAMPLE_COLUMNS, "status", "reason"];
    const lines = [
      cols,
      ...failedRows.map((r) => [r.firstName, r.lastName, r.email, r.mobile, r.gender, r.birthday, r.clientNotes, r.status, r.reason]),
    ];
    const csv = lines.map((line) => line.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients_import_failed.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const isCSV = file?.name.toLowerCase().endsWith(".csv");

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Import Clients"
      size="xl"
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
            <span className="cim-col-chip cim-col-chip--required">firstName *</span>
            <span className="cim-col-chip cim-col-chip--required">gender *</span>
            <span className="cim-col-chip cim-col-chip--required">mobile *</span>
            <span className="cim-col-chip">lastName</span>
            <span className="cim-col-chip">email</span>
            <span className="cim-col-chip">birthday</span>
            <span className="cim-col-chip">clientNotes</span>
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
                <span className="cim-stat-value">{failedRows.length}</span>
                <span className="cim-stat-label">Skipped</span>
              </div>
            </div>

            {failedRows.length > 0 && (
              <div className="cim-failed-wrap">
                <div className="cim-failed-header">
                  <p className="cim-failed-title">Skipped / Failed records ({failedRows.length})</p>
                  <button className="cim-template-btn" onClick={exportFailedRows}>
                    <Download size={13} /> Export failed records
                  </button>
                </div>

                <div className="cim-failed-table-wrap">
                  <table className="cim-failed-table">
                    <thead>
                      <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Gender</th>
                        <th>Birthday</th>
                        <th>Client Notes</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedRows.map((row) => {
                        const isEditing = editingKey === row.key;
                        const isSubmitting = rowSubmitting === row.key;
                        return (
                          <tr key={row.key} className={isEditing ? "cim-row--editing" : ""}>
                            {isEditing ? (
                              <>
                                <td><input className="cim-cell-input" value={editDraft.firstName} onChange={(e) => setEditDraft((d) => ({ ...d, firstName: e.target.value }))} /></td>
                                <td><input className="cim-cell-input" value={editDraft.lastName} onChange={(e) => setEditDraft((d) => ({ ...d, lastName: e.target.value }))} /></td>
                                <td><input className="cim-cell-input" value={editDraft.email} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} /></td>
                                <td><input className="cim-cell-input" value={editDraft.mobile} onChange={(e) => setEditDraft((d) => ({ ...d, mobile: e.target.value }))} /></td>
                                <td>
                                  <select className="cim-cell-input" value={editDraft.gender} onChange={(e) => setEditDraft((d) => ({ ...d, gender: e.target.value }))}>
                                    <option value="">—</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </td>
                                <td><input className="cim-cell-input" value={editDraft.birthday} onChange={(e) => setEditDraft((d) => ({ ...d, birthday: e.target.value }))} /></td>
                                <td><input className="cim-cell-input" value={editDraft.clientNotes} onChange={(e) => setEditDraft((d) => ({ ...d, clientNotes: e.target.value }))} /></td>
                                <td><span className={`cim-status-pill cim-status-pill--${row.status.toLowerCase()}`}>{row.status}</span></td>
                                <td className="cim-reason-cell">{row.reason}</td>
                                <td className="cim-action-cell">
                                  <button className="cim-row-btn cim-row-btn--save" onClick={() => submitReimport(row)} disabled={isSubmitting}>
                                    {isSubmitting ? "Saving…" : "Save & Retry"}
                                  </button>
                                  <button className="cim-row-btn" onClick={cancelEdit} disabled={isSubmitting}>Cancel</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>{row.firstName || "—"}</td>
                                <td>{row.lastName || "—"}</td>
                                <td>{row.email || "—"}</td>
                                <td>{row.mobile || "—"}</td>
                                <td>{row.gender || "—"}</td>
                                <td>{row.birthday || "—"}</td>
                                <td className="cim-notes-cell">{row.clientNotes || "—"}</td>
                                <td><span className={`cim-status-pill cim-status-pill--${row.status.toLowerCase()}`}>{row.status}</span></td>
                                <td className="cim-reason-cell">{row.reason}</td>
                                <td className="cim-action-cell">
                                  <button className="cim-row-btn cim-row-btn--reimport" onClick={() => startEdit(row)}>
                                    <PencilSquare size={12} /> Re-import
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
        .cim-col-chip--required { background:#fee2e2; color:#b91c1c; }

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

        .cim-failed-wrap { margin-top:16px; }
        .cim-failed-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .cim-failed-title { font-size:13px; font-weight:600; color:#92400e; margin:0; }

        .cim-failed-table-wrap { background:#fff; border:1px solid #fde68a; border-radius:8px; overflow-x:auto; max-height:340px; overflow-y:auto; }
        .cim-failed-table { width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap; }
        .cim-failed-table thead th {
          position:sticky; top:0; background:#fffbeb; text-align:left; font-weight:600; color:#92400e;
          padding:8px 10px; border-bottom:1px solid #fde68a; z-index:1;
        }
        .cim-failed-table td { padding:8px 10px; border-bottom:1px solid #f3f4f6; color:#374151; }
        .cim-failed-table tbody tr:last-child td { border-bottom:none; }
        .cim-failed-table tbody tr:hover { background:#fffdf5; }
        .cim-row--editing { background:#fefce8; }

        .cim-notes-cell { max-width:160px; overflow:hidden; text-overflow:ellipsis; }
        .cim-reason-cell { max-width:220px; white-space:normal; color:#b91c1c; font-weight:500; }

        .cim-status-pill { display:inline-block; padding:2px 9px; border-radius:999px; font-size:10.5px; font-weight:700; }
        .cim-status-pill--skipped { background:#fef3c7; color:#92400e; }
        .cim-status-pill--failed { background:#fee2e2; color:#b91c1c; }

        .cim-action-cell { display:flex; gap:6px; }
        .cim-row-btn { font-size:11.5px; font-weight:600; padding:5px 10px; border-radius:6px; border:1px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; display:flex; align-items:center; gap:4px; white-space:nowrap; }
        .cim-row-btn:hover:not(:disabled) { background:#f9fafb; }
        .cim-row-btn:disabled { opacity:.6; cursor:not-allowed; }
        .cim-row-btn--reimport { color:#4f46e5; border-color:#c7d2fe; }
        .cim-row-btn--save { background:#111827; color:#fff; border-color:#111827; }
        .cim-row-btn--save:hover:not(:disabled) { background:#1f2937; }

        .cim-cell-input { width:100%; min-width:90px; font-size:12px; padding:5px 7px; border:1px solid #d1d5db; border-radius:5px; font-family:inherit; }
        .cim-cell-input:focus { outline:none; border-color:#4f46e5; }

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
