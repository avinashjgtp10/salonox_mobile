import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Search, PlusLg, X, BoxSeam, ClockHistory, ThreeDotsVertical,
  FileEarmarkExcel, FileEarmarkPdf, FiletypeCsv, PencilSquare, Trash,
} from "react-bootstrap-icons";
import { Dropdown } from "react-bootstrap";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { selectCurrentSalon, selectUserProfile } from "../../../store/selectors/slices.selectors";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import type { AppDispatch } from "../../../store/store";
import { deleteProductThunk } from "../../../middleware/catalog/products.thunk";
import Pagination from "../../../components/ui/Pagination";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Skeleton from "../../../components/ui/Skeleton";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import EmptyState from "../../../components/ui/EmptyState";
import {
  exportInventoryPDF,
  exportInventoryExcel,
  exportInventoryCSV,
} from "../utils/productInventoryExport";
import PurchaseModal from "../components/PurchaseModal";
import "../styles/ProductInventoryPage.scss";

// Product Inventory — stock position and stock-in for RETAIL products.
// Consumables have their own page (inventory/consumables); this is the resale
// counterpart, and the backend scopes to product_type retail/both so the two
// never show or write the same rows.

type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock" | "expired" | "expiring_soon";

interface InventoryRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  supplier: string | null;
  measure_unit: string | null;
  bottle_size: number | null;
  amount: number;
  stock: number;
  qty_alert: number | null;
  low_stock: boolean;
  retail_price: number | null;
  supply_price: number | null;
  purchased: number;
  sold: number;
  consumed: number;
  expiry_date: string | null;
  status: InventoryStatus;
  last_updated: string | null;
}

const STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  expired: "Expired",
  expiring_soon: "Expiring Soon",
};

const statusVariant = (s: InventoryStatus): "success" | "warning" | "danger" =>
  s === "in_stock" ? "success"
    : s === "low_stock" || s === "expiring_soon" ? "warning"
    : "danger";

const fmtDateShort = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

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
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
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
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryRow | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleClearSearch = () => setSearch("");

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteProductThunk(deleteTarget.id)).unwrap();
      showSuccess(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      setDeleteInput("");
      load();
    } catch (err: any) {
      showError(typeof err === "string" ? err : "Couldn't delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "category", label: "Category", searchable: true, options: categories.map((c) => ({ id: String(c.id), label: String(c.name) })) },
    { key: "brand", label: "Brand", searchable: true, options: brands.map((b) => ({ id: String(b.id), label: String(b.name) })) },
    // A single-option field standing in for the old "Low stock only" toggle —
    // ticked or not, which is exactly what the boolean meant.
    { key: "stock", label: "Stock", options: [{ id: "low", label: "Low stock only" }] },
  ], [categories, brands]);

  const filterMenuSelected = useMemo(() => ({
    category: categoryId ? [categoryId] : [],
    brand: brandId ? [brandId] : [],
    stock: lowOnly ? ["low"] : [],
  }), [categoryId, brandId, lowOnly]);

  // category_id/brand_id are scalars server-side, so the newest tick wins.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    const one = (v?: string[]) => (v?.length ? v[v.length - 1] : "");
    setCategoryId(one(next.category));
    setBrandId(one(next.brand));
    setLowOnly(!!next.stock?.length);
    setPage(1);
  };

  return (
    <div className="pinv-page">
      {overlay}

      <header className="pinv-page__header">
        <div>
          <h1>
            Product Inventory
            <span className="pinv-count">{total}</span>
          </h1>
          <p>Track retail stock and record new deliveries. Consumables are managed on their own page.</p>
        </div>
        <div className="header-actions">
          <Button variant="dark" iconLeft={<PlusLg size={14} />} onClick={() => setPurchaseOpen(true)}>
            Purchase
          </Button>
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="btn-options bg-white border-subtle d-flex align-items-center fw-medium"
              id="pinv-options-dropdown"
            >
              Options
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" className="shadow-sm border-0 rounded-3 py-2" style={{ minWidth: "220px" }}>
              <Dropdown.Item onClick={() => setHistoryFor("all")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <ClockHistory size={16} /> Stock history
              </Dropdown.Item>
              <Dropdown.Divider className="my-2" />
              <Dropdown.Header className="px-3 py-1 text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>
                Export
              </Dropdown.Header>
              <Dropdown.Item onClick={() => runExport("pdf")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkPdf size={16} /> Download PDF
              </Dropdown.Item>
              <Dropdown.Item onClick={() => runExport("excel")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkExcel size={16} /> Download Excel
              </Dropdown.Item>
              <Dropdown.Item onClick={() => runExport("csv")} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FiletypeCsv size={16} /> Download CSV
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </header>

      <div className="pinv-page__controls">
        <Input
          containerClass="search-box mb-0"
          type="text"
          placeholder="Search by name, SKU or barcode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
          iconRight={search ? (
            <button type="button" className="search-clear-btn" aria-label="Clear search" onClick={handleClearSearch}>
              <X size={16} />
            </button>
          ) : undefined}
        />
        <JiraFilterMenu
          fields={filterFields}
          selected={filterMenuSelected}
          onApply={handleFiltersApply}
          triggerLabel="Filters"
        />
      </div>

      <main className="pinv-page__content">
        {loading ? (
          <table className="product-table">
            <thead>
              <tr>
                <th className="pinv-col-product">Product</th>
                <th className="pinv-col-barcode">Barcode</th>
                <th>Category</th>
                <th>Supplier</th>
                <th className="pinv-num">Purchased</th>
                <th className="pinv-num">Sold</th>
                <th className="pinv-num">Consumed</th>
                <th className="pinv-num">Available</th>
                <th className="pinv-num">Purchase Price</th>
                <th className="pinv-num">Selling Price</th>
                <th>Expiry</th>
                <th>Status</th>
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Skeleton width={36} height={36} borderRadius={6} />
                      <div style={{ flex: 1 }}>
                        <Skeleton width="70%" height={13} style={{ marginBottom: 5 }} />
                        <Skeleton width="40%" height={11} />
                      </div>
                    </div>
                  </td>
                  <td><Skeleton width="60%" height={12} /></td>
                  <td><Skeleton width="60%" height={12} /></td>
                  <td><Skeleton width="60%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td className="actions-cell" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="product-table">
            <thead>
              <tr>
                <th className="pinv-col-product">Product</th>
                <th className="pinv-col-barcode">Barcode</th>
                <th>Category</th>
                <th>Supplier</th>
                <th className="pinv-num">Purchased</th>
                <th className="pinv-num">Sold</th>
                <th className="pinv-num">Consumed</th>
                <th className="pinv-num">Available</th>
                <th className="pinv-num">Purchase Price</th>
                <th className="pinv-num">Selling Price</th>
                <th>Expiry</th>
                <th>Status</th>
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id} className={r.low_stock ? "pinv-row--low" : ""}>
                    <td className="product-name-cell pinv-product-cell" title={r.name}>
                      <div className="product-icon"><BoxSeam size={20} /></div>
                      <div className="name-info">
                        <span className="name pinv-name">{r.name}</span>
                        {r.sku && <span className="sku pinv-sub">SKU: {r.sku}</span>}
                      </div>
                    </td>
                    <td className="pinv-barcode-cell" title={r.barcode ?? undefined}>{r.barcode || "—"}</td>
                    <td>{r.category || "—"}</td>
                    <td>{r.supplier || "—"}</td>
                    <td className="pinv-num">{fmtQty(r.purchased)}</td>
                    <td className="pinv-num">{fmtQty(r.sold)}</td>
                    <td className="pinv-num">{fmtQty(r.consumed)}</td>
                    <td className="pinv-num">
                      <span className={`pinv-stock${r.low_stock ? " pinv-stock--low" : ""}`}>
                        {fmtQty(r.stock)}
                      </span>
                      {r.measure_unit && <span className="pinv-unit"> {r.measure_unit}</span>}
                    </td>
                    <td className="pinv-num">{r.supply_price != null ? fmtQty(r.supply_price) : "—"}</td>
                    <td className="pinv-num">{r.retail_price != null ? fmtQty(r.retail_price) : "—"}</td>
                    <td className="pinv-date">{fmtDateShort(r.expiry_date)}</td>
                    <td>
                      <Badge variant={statusVariant(r.status)}>{STATUS_LABELS[r.status]}</Badge>
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          as="button"
                          bsPrefix="row-actions-toggle"
                          className="row-actions-toggle"
                          id={`pinv-row-actions-${r.id}`}
                        >
                          <ThreeDotsVertical size={16} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-2" style={{ minWidth: "170px" }}>
                          <Dropdown.Item
                            onClick={() => setStockInFor(r)}
                            className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                          >
                            <PlusLg size={14} /> Add Stock
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => setHistoryFor(r)}
                            className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                          >
                            <ClockHistory size={14} /> History
                          </Dropdown.Item>
                          <Dropdown.Divider className="my-2" />
                          <Dropdown.Item
                            onClick={() => navigate(`/dashboard/catalog/products/edit/${r.id}`)}
                            className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                          >
                            <PencilSquare size={14} /> Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => { setDeleteTarget(r); setDeleteInput(""); }}
                            className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-danger"
                          >
                            <Trash size={14} /> Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="pinv-empty-cell">
                    <EmptyState
                      icon={<BoxSeam size={36} />}
                      title={(search || categoryId || brandId || lowOnly) ? "No products match these filters." : "No retail products yet."}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>

      {total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZES}
          className="pinv-pagination"
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

      {purchaseOpen && (
        <PurchaseModal
          onClose={() => setPurchaseOpen(false)}
          onError={showError}
          onSaved={({ purchaseNumber, updatedProducts }) => {
            setPurchaseOpen(false);
            showSuccess(`Purchase ${purchaseNumber ?? ""} recorded`.trim());
            // Patch in place from the save response — no second GET, per the
            // single-API-call design (see PurchaseModal/inventory.endpoints.ts).
            // Anything not currently on this page/filter simply isn't patched;
            // it'll show the new figures whenever the user navigates to it.
            const byId = new Map((updatedProducts as InventoryRow[]).map((r) => [r.id, r]));
            setRows((prev) => prev.map((r) => byId.get(r.id) ?? r));
          }}
        />
      )}

      {deleteTarget && (
        <Modal
          show
          onClose={() => setDeleteTarget(null)}
          title="Delete product?"
          footer={
            <div className="d-flex flex-column gap-2 w-100">
              <Button
                variant="danger"
                fullWidth
                disabled={deleteInput !== "DELETE" || isDeleting}
                loading={isDeleting}
                onClick={handleDeleteProduct}
              >
                Delete
              </Button>
              <Button variant="outline-dark" fullWidth onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
            </div>
          }
        >
          <p className="text-muted small mb-4">
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This operation can't be undone.
          </p>
          <Input
            label="Type DELETE to confirm"
            placeholder="DELETE"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
          />
        </Modal>
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
    <Modal
      show
      onClose={onClose}
      title="Add Stock"
      footer={
        <div className="d-flex justify-content-end gap-2 w-100">
          <Button variant="outline-dark" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="dark" onClick={submit} disabled={saving || !!error} loading={saving}>
            Add Stock
          </Button>
        </div>
      }
    >
      <p className="pinv-sub mb-3">{product.name}</p>
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
    </Modal>
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
    <Modal
      show
      onClose={onClose}
      title="Inventory History"
      size="lg"
    >
      <p className="pinv-sub mb-3">{product ? product.name : "All stock additions"}</p>
      <div className="pinv-history-table-wrap">
        <table className="pinv-table--compact">
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
        <div className="pinv-history-pager">
          <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div>
            <Button variant="outline-dark" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline-dark" size="sm" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
