import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Search, PlusLg, X, Download, ClockHistory, ExclamationTriangle } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { selectCurrentSalon, selectUserProfile } from "../../../store/selectors/slices.selectors";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { Pagination } from "../../../components/ui";
import Dropdown from "../../../components/ui/Dropdown";
import {
  exportInventoryPDF,
  exportInventoryExcel,
  exportInventoryCSV,
} from "../utils/productInventoryExport";
import "../styles/ProductInventoryPage.scss";

// Product Inventory — stock position and stock-in for RETAIL products.
// Consumables have their own page (inventory/consumables); this is the resale
// counterpart, and the backend scopes to product_type retail/both so the two
// never show or write the same rows.

interface InventoryRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  brand: string | null;
  measure_unit: string | null;
  bottle_size: number | null;
  amount: number;
  stock: number;
  qty_alert: number | null;
  low_stock: boolean;
  retail_price: number | null;
  supply_price: number | null;
  last_updated: string | null;
}

interface HistoryRow {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  quantity: number;
  before_stock: number | null;
  after_stock: number | null;
  notes: string | null;
  created_at: string;
  created_by_name: string | null;
}

interface Option { id: string; name: string }

const PAGE_SIZES = [10, 20, 50, 100];

const fmtQty = (n: unknown) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = d.getHours();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
};

export default function ProductInventoryPage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const userProfile = useSelector(selectUserProfile);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [stockInFor, setStockInFor] = useState<InventoryRow | null>(null);
  const [historyFor, setHistoryFor] = useState<InventoryRow | "all" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Debounced so typing a product name doesn't fire a request per keystroke
  // against a 5,000-row table.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Any filter change invalidates the current page number — staying on page 7
  // of a result set that now has 2 pages shows an empty table.
  useEffect(() => { setPage(1); }, [debouncedSearch, categoryId, brandId, lowOnly, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(INVENTORY.PRODUCT_INVENTORY, {
        params: {
          search: debouncedSearch || undefined,
          category_id: categoryId || undefined,
          brand_id: brandId || undefined,
          stock_status: lowOnly ? "low" : undefined,
          page,
          limit: pageSize,
        },
      });
      setRows(res.data?.data?.data ?? []);
      setTotal(res.data?.data?.total ?? 0);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Couldn't load product inventory");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId, brandId, lowOnly, page, pageSize, showError]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get(INVENTORY.PRODUCT_INVENTORY_FILTER_OPTIONS)
      .then((res) => {
        setCategories(res.data?.data?.categories ?? []);
        setBrands(res.data?.data?.brands ?? []);
      })
      .catch(() => { /* filters just stay empty — the list itself still works */ });
  }, []);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (debouncedSearch) parts.push(`Search: "${debouncedSearch}"`);
    if (categoryId) parts.push(`Category: ${categories.find((c) => c.id === categoryId)?.name ?? categoryId}`);
    if (brandId) parts.push(`Brand: ${brands.find((b) => b.id === brandId)?.name ?? brandId}`);
    if (lowOnly) parts.push("Low stock only");
    return parts.length ? parts.join("  |  ") : "All retail products";
  }, [debouncedSearch, categoryId, brandId, lowOnly, categories, brands]);

  // Exports cover the whole filtered result set, not just the visible page —
  // an export that silently stopped at 20 rows would be worse than no export.
  const fetchAllForExport = useCallback(async (): Promise<InventoryRow[]> => {
    const res = await api.get(INVENTORY.PRODUCT_INVENTORY, {
      params: {
        search: debouncedSearch || undefined,
        category_id: categoryId || undefined,
        brand_id: brandId || undefined,
        stock_status: lowOnly ? "low" : undefined,
        page: 1,
        limit: 200,
      },
    });
    return res.data?.data?.data ?? [];
  }, [debouncedSearch, categoryId, brandId, lowOnly]);

  const runExport = useCallback(async (kind: "pdf" | "excel" | "csv") => {
    setExportOpen(false);
    try {
      const all = await fetchAllForExport();
      if (all.length === 0) { showError("Nothing to export for the current filters"); return; }
      if (kind === "pdf") {
        exportInventoryPDF(all, { salon: currentSalon, user: userProfile, filterSummary });
      } else if (kind === "excel") {
        exportInventoryExcel(all);
      } else {
        exportInventoryCSV(all);
      }
      showSuccess(`Exported ${all.length} product(s)`);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Export failed");
    }
  }, [fetchAllForExport, currentSalon, userProfile, filterSummary, showSuccess, showError]);

  const clearFilters = () => {
    setSearch(""); setCategoryId(""); setBrandId(""); setLowOnly(false);
  };
  const hasFilters = !!(search || categoryId || brandId || lowOnly);

  return (
    <div className="pinv-page">
      {overlay}

      <div className="pinv-header">
        <div>
          <h1 className="pinv-title">
            Product Inventory
            {!loading && <span className="pinv-count">{total}</span>}
          </h1>
          <p className="pinv-subtitle">
            Track retail stock and record new deliveries. Consumables are managed on their own page.
          </p>
        </div>
        <div className="pinv-header-actions">
          <button className="pinv-btn pinv-btn--ghost" onClick={() => setHistoryFor("all")}>
            <ClockHistory size={14} /> History
          </button>
          <div className="pinv-export-wrap" ref={exportRef}>
            <button className="pinv-btn pinv-btn--primary" onClick={() => setExportOpen((o) => !o)}>
              <Download size={14} /> Export
            </button>
            {exportOpen && (
              <div className="pinv-export-menu">
                <button onClick={() => runExport("pdf")}>PDF (.pdf)</button>
                <button onClick={() => runExport("excel")}>Excel (.xlsx)</button>
                <button onClick={() => runExport("csv")}>CSV (.csv)</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pinv-filters">
        <div className="pinv-search">
          <Search size={14} />
          <input
            placeholder="Search by name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="pinv-search__clear" onClick={() => setSearch("")}><X size={14} /></button>}
        </div>

        <Dropdown
          className="pinv-select"
          placeholder="All categories"
          value={categoryId}
          options={[{ id: "", name: "All categories" }, ...categories]}
          onChange={setCategoryId}
        />
        <Dropdown
          className="pinv-select"
          placeholder="All brands"
          value={brandId}
          options={[{ id: "", name: "All brands" }, ...brands]}
          onChange={setBrandId}
        />

        <button
          className={`pinv-chip${lowOnly ? " pinv-chip--on" : ""}`}
          onClick={() => setLowOnly((v) => !v)}
        >
          <ExclamationTriangle size={12} /> Low stock only
        </button>

        {hasFilters && (
          <button className="pinv-clear" onClick={clearFilters}>Clear</button>
        )}
      </div>

      <div className="pinv-table-wrap">
        <table className="pinv-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Brand</th>
              <th className="pinv-num">In Stock</th>
              <th className="pinv-num">Reorder At</th>
              <th>Last Updated</th>
              <th className="pinv-actions-col">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="pinv-skel-row">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j}><span className="pinv-skel" /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="pinv-empty">
                  {hasFilters ? "No products match these filters." : "No retail products yet."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className={r.low_stock ? "pinv-row--low" : ""}>
                  <td>
                    <div className="pinv-name">{r.name}</div>
                    {r.sku && <div className="pinv-sub">SKU: {r.sku}</div>}
                  </td>
                  <td>{r.category || "—"}</td>
                  <td>{r.brand || "—"}</td>
                  <td className="pinv-num">
                    <span className={`pinv-stock${r.low_stock ? " pinv-stock--low" : ""}`}>
                      {fmtQty(r.stock)}
                    </span>
                    {r.measure_unit && <span className="pinv-unit"> {r.measure_unit}</span>}
                    {r.low_stock && <div className="pinv-low-tag">Low stock</div>}
                  </td>
                  <td className="pinv-num">{r.qty_alert ? fmtQty(r.qty_alert) : "—"}</td>
                  <td className="pinv-date">{fmtDateTime(r.last_updated)}</td>
                  <td className="pinv-actions-col">
                    <button className="pinv-btn pinv-btn--sm" onClick={() => setStockInFor(r)}>
                      <PlusLg size={12} /> Add Stock
                    </button>
                    <button className="pinv-link" onClick={() => setHistoryFor(r)}>History</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZES}
        />
      )}

      {stockInFor && (
        <StockInModal
          product={stockInFor}
          onClose={() => setStockInFor(null)}
          onDone={(added, after) => {
            setStockInFor(null);
            showSuccess(`Added ${fmtQty(added)} to ${stockInFor.name}. New stock: ${fmtQty(after)}`);
            load();
          }}
          onError={showError}
        />
      )}

      {historyFor && (
        <HistoryModal
          product={historyFor === "all" ? null : historyFor}
          onClose={() => setHistoryFor(null)}
          onError={showError}
        />
      )}
    </div>
  );
}

// ── Stock-in ──────────────────────────────────────────────────────────────────
function StockInModal({
  product, onClose, onDone, onError,
}: {
  product: InventoryRow;
  onClose: () => void;
  onDone: (added: number, after: number) => void;
  onError: (msg: string) => void;
}) {
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const parsed = parseFloat(qty);
  // Derived rather than set on submit, so the message appears as the user
  // types instead of only after they press Add.
  const error =
    qty.trim() === ""
      ? (touched ? "Enter a quantity" : null)
      : !Number.isFinite(parsed)
        ? "Enter a valid number"
        : parsed <= 0
          ? "Quantity must be greater than zero"
          : null;

  const projected = error || !Number.isFinite(parsed) ? null : product.stock + parsed;

  const submit = async () => {
    setTouched(true);
    if (error || !Number.isFinite(parsed) || parsed <= 0) return;
    setSaving(true);
    try {
      const res = await api.post(INVENTORY.PRODUCT_INVENTORY_STOCK_IN(product.id), {
        quantity: parsed,
        notes: notes.trim() || null,
      });
      onDone(parsed, res.data?.data?.after ?? product.stock + parsed);
    } catch (err: any) {
      onError(err?.response?.data?.message || "Couldn't add stock");
      setSaving(false);
    }
  };

  return (
    <div className="pinv-modal-backdrop" onClick={onClose}>
      <div className="pinv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pinv-modal__head">
          <div>
            <h2>Add Stock</h2>
            <p>{product.name}</p>
          </div>
          <button className="pinv-modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="pinv-modal__body">
          <div className="pinv-current">
            <span>Current stock</span>
            <strong>{fmtQty(product.stock)}{product.measure_unit ? ` ${product.measure_unit}` : ""}</strong>
          </div>

          <label className="pinv-label">
            Quantity to add <span className="pinv-req">*</span>
          </label>
          <input
            className={`pinv-input${error ? " pinv-input--err" : ""}`}
            type="number"
            min="0"
            step="any"
            autoFocus
            placeholder="e.g. 12"
            value={qty}
            onChange={(e) => { setQty(e.target.value); setTouched(true); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            onWheel={(e) => e.currentTarget.blur()}
          />
          {error
            ? <span className="pinv-err">{error}</span>
            : projected != null && (
              <span className="pinv-hint">New stock will be <strong>{fmtQty(projected)}</strong></span>
            )}

          <label className="pinv-label">Note <span className="pinv-optional">(optional)</span></label>
          <input
            className="pinv-input"
            placeholder="e.g. Invoice #4821, delivery from supplier"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
        </div>

        <div className="pinv-modal__foot">
          <button className="pinv-btn pinv-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="pinv-btn pinv-btn--primary" onClick={submit} disabled={saving || !!error}>
            {saving ? "Adding…" : "Add Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────
function HistoryModal({
  product, onClose, onError,
}: {
  product: InventoryRow | null;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(INVENTORY.PRODUCT_INVENTORY_HISTORY, {
      params: { product_id: product?.id, page, limit: pageSize },
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data?.data?.data ?? []);
        setTotal(res.data?.data?.total ?? 0);
      })
      .catch((err: any) => {
        if (cancelled) return;
        onError(err?.response?.data?.message || "Couldn't load inventory history");
        setRows([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [product?.id, page, onError]);

  return (
    <div className="pinv-modal-backdrop" onClick={onClose}>
      <div className="pinv-modal pinv-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="pinv-modal__head">
          <div>
            <h2>Inventory History</h2>
            <p>{product ? product.name : "All stock additions"}</p>
          </div>
          <button className="pinv-modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="pinv-modal__body pinv-modal__body--table">
          <table className="pinv-table pinv-table--compact">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                {!product && <th>Product</th>}
                <th className="pinv-num">Added</th>
                <th className="pinv-num">Before</th>
                <th className="pinv-num">After</th>
                <th>By</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={product ? 6 : 7} className="pinv-empty">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={product ? 6 : 7} className="pinv-empty">No stock additions recorded yet.</td></tr>
              ) : (
                rows.map((h) => (
                  <tr key={h.id}>
                    <td className="pinv-date">{fmtDateTime(h.created_at)}</td>
                    {!product && <td>{h.product_name}</td>}
                    <td className="pinv-num pinv-added">+{fmtQty(h.quantity)}</td>
                    <td className="pinv-num">{h.before_stock == null ? "—" : fmtQty(h.before_stock)}</td>
                    <td className="pinv-num">{h.after_stock == null ? "—" : fmtQty(h.after_stock)}</td>
                    <td>{h.created_by_name || "—"}</td>
                    <td className="pinv-note">{h.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="pinv-modal__foot pinv-modal__foot--pager">
            <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
            <div>
              <button className="pinv-btn pinv-btn--ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="pinv-btn pinv-btn--ghost" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
