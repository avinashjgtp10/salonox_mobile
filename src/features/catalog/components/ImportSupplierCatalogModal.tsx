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
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchSupplierProductsThunk } from "../../../middleware/inventory/inventory.thunk";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import type { SupplierCatalogImportResult, SupplierProduct } from "../../../types/inventory.types";
import ResolveSupplierProductRow from "./ResolveSupplierProductRow";
import "../styles/ImportSupplierCatalogModal.scss";

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplierId: string;
}

const SAMPLE_COLUMNS = ["Product Name", "Barcode", "Brand", "Category", "SKU", "Price", "HSN/SAC"];
const SAMPLE_ROWS = [
  ["Hair Developer 6%", "8901030123456", "Wella", "Hair Care", "ABC-HD06", "390", "3305"],
  ["Keratin Mask 500ml", "", "L'Oreal", "Hair Care", "ABC-KM500", "850", "3305"],
];

function downloadTemplate() {
  const csv = [SAMPLE_COLUMNS, ...SAMPLE_ROWS].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "supplier_catalog_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function downloadErrorReport(result: SupplierCatalogImportResult) {
  const header = ["Row", "Product Name", "Status", "Reason"];
  const lines = result.issues.map((iss) =>
    [iss.row || "", iss.name || "", "Failed", iss.reason].map(csvCell).join(","),
  );
  const csv = [header.map(csvCell).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "supplier_catalog_import_error_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Import Supplier Catalog — mirrors ServiceImportModal.tsx's structure
// (drag/drop file zone, sample-template download, post-import result panel)
// but adds a "Needs attention" section: any row that landed unmatched isn't
// an error, it just needs a human to Link/Create Product/Ignore before it
// can be added to an order — see ResolveSupplierProductRow.tsx.
export default function ImportSupplierCatalogModal({ show, onClose, onSuccess, supplierId }: Props) {
  const dispatch = useAppDispatch();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SupplierCatalogImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAttention, setNeedsAttention] = useState<SupplierProduct[]>([]);

  const ACCEPTED = [".csv", ".xlsx", ".xls"];

  function handleClose() {
    setFile(null);
    setResult(null);
    setError(null);
    setNeedsAttention([]);
    onClose();
  }

  function handleReImport() {
    setFile(null);
    setResult(null);
    setError(null);
    setNeedsAttention([]);
    setTimeout(() => fileRef.current?.click(), 100);
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

  async function loadNeedsAttention() {
    try {
      const rows = await dispatch(fetchSupplierProductsThunk({ supplierId })).unwrap();
      setNeedsAttention(rows.filter((r) => r.match_status === "unmatched" && !r.ignored));
    } catch {
      setNeedsAttention([]);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(INVENTORY.SUPPLIER_PRODUCTS_IMPORT(supplierId), formData, {
        headers: { "Content-Type": undefined },
        timeout: 120_000,
      });
      const data: SupplierCatalogImportResult = res.data?.data ?? res.data;
      setResult(data);
      await loadNeedsAttention();
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || err?.response?.data?.message || err?.message ||
        "Import failed. Please check your file and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isCSV = file?.name.toLowerCase().endsWith(".csv");

  return (
    <Modal
      show={show}
      onClose={handleClose}
      title="Import Supplier Catalog"
      size="lg"
      footer={
        result ? (
          <div className="iscm-footer-btns">
            <button type="button" className="iscm-btn iscm-btn--ghost" onClick={handleReImport}>
              <ArrowRepeat size={14} className="me-1" /> Re-import
            </button>
            <button type="button" className="iscm-btn iscm-btn--primary" onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="iscm-footer-btns">
            <button type="button" className="iscm-btn iscm-btn--ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="button" className="iscm-btn iscm-btn--primary" onClick={handleImport} disabled={!file || loading}>
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        )
      }
    >
      <div className="import-supplier-catalog-modal">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
        />

        <div className="iscm-template-row">
          <span className="iscm-template-label">Need the correct format?</span>
          <button type="button" className="iscm-template-btn" onClick={downloadTemplate}>
            <Download size={13} /> Download sample template
          </button>
        </div>

        <div className="iscm-columns-wrap">
          <p className="iscm-columns-title">Expected columns:</p>
          <div className="iscm-columns-list">
            {SAMPLE_COLUMNS.map((col) => (
              <span key={col} className="iscm-col-chip">{col}</span>
            ))}
          </div>
        </div>

        {!result && (
          <div
            className={`iscm-dropzone ${dragging ? "iscm-dropzone--dragging" : ""} ${file ? "iscm-dropzone--has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !file && fileRef.current?.click()}
          >
            {file ? (
              <div className="iscm-selected-file">
                {isCSV ? (
                  <FiletypeCsv size={28} className="iscm-file-icon iscm-file-icon--csv" />
                ) : (
                  <FileEarmarkExcel size={28} className="iscm-file-icon iscm-file-icon--xlsx" />
                )}
                <div className="iscm-file-info">
                  <span className="iscm-file-name">{file.name}</span>
                  <span className="iscm-file-size">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  type="button"
                  className="iscm-remove-file"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); }}
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <CloudUpload size={36} className="iscm-upload-icon" />
                <p className="iscm-drop-text">
                  Drag &amp; drop your file here, or <span className="iscm-browse-link">browse</span>
                </p>
                <p className="iscm-drop-hint">Supports CSV, XLSX, XLS · Max 10 MB</p>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="iscm-alert iscm-alert--error">
            <ExclamationCircleFill size={18} className="iscm-alert-icon" />
            <div>
              <p className="iscm-alert-title">Import Failed</p>
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="iscm-result">
            <div className="iscm-result-header">
              <CheckCircleFill size={20} className="iscm-result-icon" />
              <span className="iscm-result-title">
                Import complete — {result.matched} matched, {result.unmatched} need attention
              </span>
            </div>

            <div className="iscm-result-stats">
              <div className="iscm-stat">
                <span className="iscm-stat-value">{result.total}</span>
                <span className="iscm-stat-label">Total rows</span>
              </div>
              <div className="iscm-stat iscm-stat--success">
                <span className="iscm-stat-value">{result.matched}</span>
                <span className="iscm-stat-label">Matched</span>
              </div>
              <div className="iscm-stat iscm-stat--warn">
                <span className="iscm-stat-value">{result.unmatched}</span>
                <span className="iscm-stat-label">Unmatched</span>
              </div>
              <div className="iscm-stat">
                <span className="iscm-stat-value">{result.updated}</span>
                <span className="iscm-stat-label">Updated</span>
              </div>
              {result.failed > 0 && (
                <div className="iscm-stat iscm-stat--error">
                  <span className="iscm-stat-value">{result.failed}</span>
                  <span className="iscm-stat-label">Failed</span>
                </div>
              )}
            </div>

            {needsAttention.length > 0 && (
              <div className="iscm-needs-attention">
                <p className="iscm-needs-attention-title">Needs attention ({needsAttention.length})</p>
                <p className="iscm-needs-attention-hint">
                  These items couldn't be matched to an existing product — link them to one, create a new product, or ignore them.
                </p>
                {needsAttention.map((row) => (
                  <ResolveSupplierProductRow
                    key={row.id}
                    supplierId={supplierId}
                    row={row}
                    onResolved={(updated) => setNeedsAttention((prev) => prev.filter((r) => r.id !== updated.id))}
                    onError={setError}
                  />
                ))}
              </div>
            )}

            {result.issues.length > 0 && (
              <div className="iscm-errors-wrap">
                <div className="iscm-errors-head">
                  <p className="iscm-errors-title">Rows that failed to import ({result.issues.length})</p>
                  <button type="button" className="iscm-report-btn" onClick={() => downloadErrorReport(result)}>
                    <Download size={12} /> Download error report (CSV)
                  </button>
                </div>
                <div className="iscm-issues-table-wrap">
                  <table className="iscm-issues-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Product Name</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.issues.map((iss, i) => (
                        <tr key={i}>
                          <td>{iss.row || "—"}</td>
                          <td className="iscm-product-name-col">{iss.name || "—"}</td>
                          <td>{iss.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
