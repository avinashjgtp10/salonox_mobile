import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Dropdown as BsDropdown } from "react-bootstrap";
import {
  ClipboardData, FileEarmarkExcel,
  PencilSquare, PlusLg, Search, Sliders2Vertical, ThreeDotsVertical, Trash, X,
} from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { fetchCategoriesThunk, searchProductsThunk } from "../../../middleware/catalog/products.thunk";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import { selectAllStaff, selectProductCategories, selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import { Pagination } from "../../../components/ui/Pagination";
import { Dropdown } from "../../../components/ui/Dropdown";
import DateRangeFilter, { DEFAULT_DATE_RANGE_FILTER_VALUE } from "../../../components/ui/DateRangeFilter";
import type { DateRangeFilterValue } from "../../../components/ui/DateRangeFilter";
import JiraFilterMenu from "../../../components/ui/JiraFilterMenu";
import type { JiraFilterField } from "../../../components/ui/JiraFilterMenu";
import "../styles/StockLedgerPage.scss";

type TxnType =
  | "opening_stock" | "purchase" | "usage" | "sale" | "return" | "damage"
  | "expired" | "adjustment_in" | "adjustment_out" | "transfer_in" | "transfer_out"
  | "sample" | "lost" | "internal_use";

const TXN_LABELS: Record<TxnType, string> = {
  opening_stock: "Opening Stock",
  purchase: "Purchase",
  usage: "Usage",
  sale: "Sale",
  return: "Return",
  damage: "Damage",
  expired: "Expired",
  adjustment_in: "Adjustment In",
  adjustment_out: "Adjustment Out",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
  sample: "Sample",
  lost: "Lost / Missing",
  internal_use: "Internal Use",
};

const IN_TYPES = new Set<TxnType>(["opening_stock", "purchase", "return", "adjustment_in", "transfer_in"]);

// Badge color is mostly "in = green, out = red", except Sale — a stock-out
// type by nature (drops products.amount, shows under the Out column) but
// still revenue for the salon, so its badge reads green like the In types
// rather than red like a loss (damage/expired/lost/etc).
const badgeVariantFor = (type: TxnType): "success" | "danger" =>
  type === "sale" || IN_TYPES.has(type) ? "success" : "danger";

// Types offered in the manual Stock Adjustment modal — excludes
// purchase/sale/usage, which are always system-generated from an actual
// purchase/sale/consumption flow, never entered by hand here.
const ADJUSTMENT_TXN_TYPES: TxnType[] = [
  "adjustment_in", "adjustment_out", "damage", "expired",
  "sample", "lost", "internal_use", "transfer_in", "transfer_out",
];

interface LedgerRow {
  id: string;
  created_at: string;
  product_id: string;
  product_name: string;
  measure_unit: string | null;
  bottle_size: number | null;
  category: string | null;
  transaction_type: TxnType;
  reference: string | null;
  quantity: number;
  unit_cost: string | null;
  balance_after: number;
  reason: string | null;
  notes: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
}

interface Summary {
  total_products: number;
  total_stock: number;
  stock_in: number;
  stock_out: number;
}

interface ProductOption { id: string; name: string; measure_unit?: string | null }

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const fmtQty = (n: number, unit?: string | null) => `${Math.abs(n).toLocaleString()}${unit ? ` ${unit}` : ""}`;

// Bottle-tracked products (bottle_size set) show quantities as a plain
// derived count, not raw base-unit volume — same CEIL rule and plain-number
// display as Catalog → Products' stock column (a partially-used bottle
// still counts as 1). Used for both movement quantities (In/Out/Added/Used)
// and running balances.
const fmtBalance = (n: number, unit?: string | null, bottleSize?: number | null) => {
  if (bottleSize && bottleSize > 0) {
    return Math.ceil(Math.abs(n) / bottleSize).toLocaleString();
  }
  return fmtQty(n, unit);
};

export default function StockLedgerPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { showError } = useStatusOverlay();

  const staff = useSelector(selectAllStaff) as { id: string; first_name?: string; last_name?: string }[];
  const rawCategories = useSelector(selectProductCategories) as { id: string | number; name: string }[];
  const { items: reduxProducts } = useSelector((s: RootState) => s.products);
  const currentSalon = useSelector(selectCurrentSalon);

  const [productSearch, setProductSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>(DEFAULT_DATE_RANGE_FILTER_VALUE);

  // Multi-select filters, keyed the same way JiraFilterMenu reports them —
  // fires once on "Apply Filters" inside the panel, never per checkbox.
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [txnTypes, setTxnTypes] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>({ total_products: 0, total_stock: 0, stock_in: 0, stock_out: 0 });
  const [loading, setLoading] = useState(true);

  const [detailRow, setDetailRow] = useState<LedgerRow | null>(null);
  const [timelineProductId, setTimelineProductId] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<LedgerRow | null>(null);

  // Staff/Categories only populate the Filters panel's option lists — fetched
  // lazily on first interaction with that panel (see loadFilterOptions below),
  // not on every page load.
  const filterOptionsLoadedRef = useRef(false);
  const loadFilterOptions = useCallback(() => {
    if (filterOptionsLoadedRef.current) return;
    filterOptionsLoadedRef.current = true;
    dispatch(fetchStaffThunk());
    dispatch(fetchCategoriesThunk());
  }, [dispatch]);

  // Full product list and branches are only needed for the Stock Adjustment
  // modal's product/branch pickers — fetched on demand when that modal
  // opens, not on every page load.
  useEffect(() => {
    if (!adjustOpen) return;
    dispatch(searchProductsThunk({ pageSize: 200 }));
    if (currentSalon?.id) dispatch(fetchBranchesThunk(currentSalon.id));
  }, [adjustOpen, dispatch, currentSalon?.id]);

  // Debounced so typing a product name doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(productSearch), 350);
    return () => clearTimeout(t);
  }, [productSearch]);

  useEffect(() => { setPage(1); }, [debouncedSearch, categoryIds, staffIds, txnTypes, dateRange, pageSize]);

  const products: ProductOption[] = useMemo(
    () => (Array.isArray(reduxProducts) ? reduxProducts : []).map((p: any) => ({
      id: String(p.id), name: p.name, measure_unit: p.measure_unit,
    })),
    [reduxProducts],
  );

  const categories = useMemo(
    () => rawCategories.map((c) => ({ id: String(c.id), name: c.name })),
    [rawCategories],
  );

  const staffOptions = useMemo(
    () => staff.map((s) => ({ id: String(s.id), name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Unnamed" })),
    [staff],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post(INVENTORY.STOCK_LEDGER_LIST, {
        search: debouncedSearch || undefined,
        category_id: categoryIds[0] || undefined,
        staff_id: staffIds[0] || undefined,
        transaction_type: txnTypes[0] || undefined,
        from_date: dateRange.startDate || undefined,
        to_date: dateRange.endDate || undefined,
        page,
        limit: pageSize,
      });
      const payload = res.data?.data;
      setRows(payload?.data ?? []);
      setTotal(payload?.total ?? 0);
      setSummary(payload?.summary ?? { total_products: 0, total_stock: 0, stock_in: 0, stock_out: 0 });
    } catch (err: any) {
      showError(err?.response?.data?.message || "Couldn't load stock ledger");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryIds, staffIds, txnTypes, dateRange, page, pageSize, showError]);

  useEffect(() => { load(); }, [load]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "category", label: "Category", options: categories.map((c) => ({ id: c.id, label: c.name })) },
    { key: "staff", label: "Staff", options: staffOptions.map((s) => ({ id: s.id, label: s.name })) },
    { key: "txn_type", label: "Transaction Type", searchable: true, options: Object.entries(TXN_LABELS).map(([id, label]) => ({ id, label })) },
  ], [categories, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    category: categoryIds,
    staff: staffIds,
    txn_type: txnTypes,
  }), [categoryIds, staffIds, txnTypes]);

  // category/staff/transaction_type are scalars server-side, so the newest
  // tick wins — same convention as ProductInventoryPage's filter menu.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setCategoryIds(next.category ?? []);
    setStaffIds(next.staff ?? []);
    setTxnTypes(next.txn_type ?? []);
  };

  const hasActiveFilters = !!debouncedSearch || !!categoryIds.length || !!staffIds.length || !!txnTypes.length
    || !!dateRange.startDate || !!dateRange.endDate;

  const handleDeleteEntry = async () => {
    if (!deleteRow) return;
    try {
      await api.delete(INVENTORY.STOCK_LEDGER_BY_ID(deleteRow.id));
      setDeleteRow(null);
      load();
    } catch (err: any) {
      showError(err?.response?.data?.message || "Couldn't delete stock ledger entry");
    }
  };

  return (
    <div className="sl-page">
      <header className="sl-page__header">
        <div>
          <h1>Stock Ledger</h1>
          <p>Every stock movement, in one place — purchases, usage, sales, adjustments and transfers.</p>
        </div>
        <div className="sl-page__actions">
          <Button variant="outline-dark" iconLeft={<FileEarmarkExcel size={14} />}>
            Export Excel
          </Button>
          <Button variant="outline-dark" iconLeft={<Sliders2Vertical size={14} />} onClick={() => setAdjustOpen(true)}>
            Stock Adjustment
          </Button>
          <Button variant="dark" iconLeft={<PlusLg size={14} />} onClick={() => navigate("/dashboard/inventory/ledger/add-stock")}>
            Add Stock
          </Button>
        </div>
      </header>

      <div className="rp-sra-summary-row">
        <div className="rp-sra-summary-card">
          <div className="rp-sra-summary-val">{summary.total_products}</div>
          <div className="rp-sra-summary-label">Total Products</div>
        </div>
        <div className="rp-sra-summary-card">
          <div className="rp-sra-summary-val">{summary.total_stock.toLocaleString()}</div>
          <div className="rp-sra-summary-label">Total Stock</div>
        </div>
        <div className="rp-sra-summary-card sl-kpi--in">
          <div className="rp-sra-summary-val">+{summary.stock_in.toLocaleString()}</div>
          <div className="rp-sra-summary-label">Stock In</div>
        </div>
        <div className="rp-sra-summary-card sl-kpi--out">
          <div className="rp-sra-summary-val">-{summary.stock_out.toLocaleString()}</div>
          <div className="rp-sra-summary-label">Stock Out</div>
        </div>
      </div>

      <div className="sl-controls">
        <Input
          containerClass="sl-search-box mb-0"
          placeholder="Search product"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          iconLeft={<Search size={14} />}
          iconRight={productSearch ? (
            <button type="button" className="sl-clear-btn" aria-label="Clear" onClick={() => setProductSearch("")}>
              <X size={14} />
            </button>
          ) : undefined}
        />
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <div onMouseDown={loadFilterOptions} onFocus={loadFilterOptions}>
          <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        </div>
      </div>

      <main className="sl-page__content">
        <h2 className="sl-table-header">Stock Ledger</h2>
        <div className="sl-table-wrap">
          <table className="sl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Transaction</th>
                <th>Reference</th>
                <th className="sl-num">In</th>
                <th className="sl-num">Out</th>
                <th className="sl-num">Balance</th>
                <th className="actions-cell sl-actions-col" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j}><Skeleton height={14} /></td>)}</tr>
                ))
              ) : rows.length > 0 ? (
                rows.map((r) => {
                  const isIn = IN_TYPES.has(r.transaction_type);
                  const unit = r.measure_unit;
                  return (
                    <tr key={r.id} className="sl-row" onClick={() => setDetailRow(r)}>
                      <td className="sl-date">{fmtDate(r.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="sl-product-link"
                          onClick={(e) => { e.stopPropagation(); setTimelineProductId(r.product_id); }}
                        >
                          {r.product_name}
                        </button>
                      </td>
                      <td>
                        <Badge variant={badgeVariantFor(r.transaction_type)}>{TXN_LABELS[r.transaction_type]}</Badge>
                      </td>
                      <td className="sl-ref">{r.reference || "—"}</td>
                      <td className="sl-num sl-num--in">{isIn ? fmtBalance(r.quantity, unit, r.bottle_size) : "—"}</td>
                      <td className="sl-num sl-num--out">{!isIn ? fmtBalance(r.quantity, unit, r.bottle_size) : "—"}</td>
                      <td className="sl-num sl-balance">{fmtBalance(r.balance_after, unit, r.bottle_size)}</td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <BsDropdown align="end">
                          <BsDropdown.Toggle
                            as="button"
                            bsPrefix="row-actions-toggle"
                            className="row-actions-toggle"
                            id={`sl-row-actions-${r.id}`}
                          >
                            <ThreeDotsVertical size={16} />
                          </BsDropdown.Toggle>
                          <BsDropdown.Menu className="shadow-sm border-0 rounded-3 py-2" style={{ minWidth: "160px" }}>
                            <BsDropdown.Item
                              onClick={() => navigate(`/dashboard/inventory/ledger/edit/${r.id}`)}
                              className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                            >
                              <PencilSquare size={14} /> Edit
                            </BsDropdown.Item>
                            <BsDropdown.Item
                              onClick={() => setDeleteRow(r)}
                              className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-danger"
                            >
                              <Trash size={14} /> Delete
                            </BsDropdown.Item>
                          </BsDropdown.Menu>
                        </BsDropdown>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="sl-empty-cell">
                    <EmptyState
                      icon={<ClipboardData size={36} />}
                      title={hasActiveFilters ? "No transactions match these filters." : "No stock movements recorded yet."}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {total > 0 && (
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          pageSizeOptions={[10, 25, 50, 100]}
          className="sl-pagination"
        />
      )}

      <TransactionDetailDrawer
        row={detailRow}
        isOpen={!!detailRow}
        onClose={() => setDetailRow(null)}
      />

      {timelineProductId && (
        <StockTimelineModal
          productId={timelineProductId}
          onClose={() => setTimelineProductId(null)}
          onError={showError}
        />
      )}

      {adjustOpen && (
        <StockAdjustmentModal
          products={products}
          onClose={() => setAdjustOpen(false)}
          onSaved={() => { setAdjustOpen(false); load(); }}
          onError={showError}
        />
      )}

      {deleteRow && (
        <Modal
          show
          onClose={() => setDeleteRow(null)}
          title="Delete transaction?"
          footer={
            <div className="d-flex justify-content-end gap-2 w-100">
              <Button variant="outline-dark" onClick={() => setDeleteRow(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteEntry}>Delete</Button>
            </div>
          }
        >
          <p className="text-muted small mb-0">
            Are you sure you want to delete the <strong>{TXN_LABELS[deleteRow.transaction_type]}</strong> entry for{" "}
            <strong>{deleteRow.product_name}</strong> ({deleteRow.reference || "no reference"})? This can't be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

// ── Transaction Detail drawer ─────────────────────────────────────────────────
// Right-side slide-in panel — same overlay+slide structure as
// OrderDetailsDrawer (this app's established pattern for row-click detail
// views), rather than a centered modal.
function TransactionDetailDrawer({ row, isOpen, onClose }: { row: LedgerRow | null; isOpen: boolean; onClose: () => void }) {
  if (!row) return null;
  const isIn = IN_TYPES.has(row.transaction_type);
  const unit = row.measure_unit;
  const previous = row.balance_after - row.quantity;

  return (
    <div className={`sl-detail-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="sl-detail-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="sl-detail-drawer__header">
          <div className="title-section">
            <h3>Stock Transaction Details</h3>
            <span>{row.product_name}</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="sl-detail-drawer__body">
          <div className="sl-detail-grid">
            <div><span>Product</span><strong>{row.product_name}</strong></div>
            <div><span>Transaction</span><strong>{TXN_LABELS[row.transaction_type]}</strong></div>
            <div><span>Reference</span><strong>{row.reference || "—"}</strong></div>
            <div><span>Date</span><strong>{fmtDateTime(row.created_at)}</strong></div>
            {row.supplier_name && (
              <div><span>Supplier</span><strong>{row.supplier_name}</strong></div>
            )}
          </div>

          <hr className="sl-detail-divider" />

          <h6 className="sl-detail-heading">Stock Movement</h6>
          <div className="sl-movement-grid">
            <div><span>Previous Stock</span><strong>{fmtBalance(previous, unit, row.bottle_size)}</strong></div>
            <div><span>{isIn ? "Added" : "Used"}</span><strong className={isIn ? "sl-text-in" : "sl-text-out"}>{isIn ? "+" : "-"}{fmtBalance(row.quantity, unit, row.bottle_size)}</strong></div>
            <div><span>Current Stock</span><strong>{fmtBalance(row.balance_after, unit, row.bottle_size)}</strong></div>
          </div>

          <hr className="sl-detail-divider" />

          <h6 className="sl-detail-heading">Reason</h6>
          <p className="sl-detail-reason">{row.reason || "—"}</p>

          <div className="sl-detail-footer">
            <span>Created By</span>
            <strong>{row.created_by_name || "—"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stock Movement Timeline modal ─────────────────────────────────────────────
function StockTimelineModal({
  productId, onClose, onError,
}: {
  productId: string;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(INVENTORY.STOCK_LEDGER_PRODUCT_TIMELINE(productId))
      .then((res) => { if (!cancelled) setRows(res.data?.data ?? []); })
      .catch((err: any) => {
        if (cancelled) return;
        onError(err?.response?.data?.message || "Couldn't load stock movement timeline");
        setRows([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId, onError]);

  const currentStock = rows[0]?.balance_after ?? 0;
  const productName = rows[0]?.product_name;
  const unit = rows[0]?.measure_unit;
  const bottleSize = rows[0]?.bottle_size;

  return (
    <Modal show onClose={onClose} title="Stock Movement Timeline" size="md">
      <p className="sl-timeline-title">{productName || "Product"}</p>
      <p className="sl-timeline-current">Current Stock: <strong>{fmtBalance(currentStock, unit, bottleSize)}</strong></p>

      {loading ? (
        <div className="sl-timeline">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={48} className="sl-timeline-skeleton" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-muted small">No stock movements recorded for this product yet.</p>
      ) : (
        <div className="sl-timeline">
          {rows.map((r) => {
            const isIn = IN_TYPES.has(r.transaction_type);
            return (
              <div className="sl-timeline-item" key={r.id}>
                <div className="sl-timeline-item__marker">
                  <span className={`sl-dot ${isIn ? "sl-dot--in" : "sl-dot--out"}`} />
                </div>
                <div className="sl-timeline-item__body">
                  <div className="sl-timeline-item__date">{fmtDate(r.created_at)}</div>
                  <div className="sl-timeline-item__type">{TXN_LABELS[r.transaction_type]}</div>
                  <div className={`sl-timeline-item__qty ${isIn ? "sl-text-in" : "sl-text-out"}`}>
                    {isIn ? "+" : "-"}{fmtBalance(r.quantity, unit, r.bottle_size)}
                  </div>
                  <div className="sl-timeline-item__balance">Balance: {fmtBalance(r.balance_after, unit, r.bottle_size)}</div>
                  <div className="sl-timeline-item__ref">{r.reference || "—"} — {r.reason || "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Stock Adjustment modal ─────────────────────────────────────────────────────
// One or more product rows, each with its own product/type/quantity — same
// "one shared header (branch/notes), N independent line items" shape as
// PurchaseModal.tsx. Saved as N sequential POSTs to the existing single-entry
// endpoint (there's no batch endpoint) — sequential, not Promise.all, so a
// mid-batch failure leaves a clear "rows before this one saved" boundary
// rather than a partial set landing in an unpredictable order.
interface AdjustmentLine {
  key: string;
  productId: string;
  txnType: TxnType;
  qty: string;
}

function emptyLine(defaultProductId: string): AdjustmentLine {
  return { key: Math.random().toString(36).slice(2), productId: defaultProductId, txnType: "adjustment_out", qty: "" };
}

function StockAdjustmentModal({
  products, onClose, onSaved, onError,
}: {
  products: ProductOption[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [lines, setLines] = useState<AdjustmentLine[]>([emptyLine(products[0]?.id ?? "")]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);

  const { branches } = useSelector((s: RootState) => s.salon);

  useEffect(() => {
    if (branches?.length && !branchId) {
      setBranchId((branches.find((b: any) => b.is_main)?.id ?? branches[0].id) as string);
    }
  }, [branches, branchId]);

  function patchLine(key: string, patch: Partial<AdjustmentLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const validLines = lines.filter((l) => {
    const qty = parseFloat(l.qty);
    return l.productId && Number.isFinite(qty) && qty > 0;
  });

  const hasIncompleteLine = lines.some((l) => {
    const qty = parseFloat(l.qty);
    return l.productId && !(Number.isFinite(qty) && qty > 0);
  });

  const duplicateProductIds = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    lines.forEach((l) => {
      if (!l.productId) return;
      if (seen.has(l.productId)) dupes.add(l.productId);
      seen.add(l.productId);
    });
    return dupes;
  }, [lines]);

  const canSave = !!branchId && validLines.length > 0 && !hasIncompleteLine && duplicateProductIds.size === 0;

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      for (const line of validLines) {
        await api.post(INVENTORY.STOCK_LEDGER, {
          branch_id: branchId,
          product_id: line.productId,
          transaction_type: line.txnType,
          quantity: parseFloat(line.qty),
          notes: notes || undefined,
        });
      }
      onSaved();
    } catch (err: any) {
      onError(err?.response?.data?.message || "Couldn't save stock adjustment");
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      onClose={onClose}
      title="Stock Adjustment"
      size="lg"
      footer={
        <div className="d-flex justify-content-end gap-2 w-100">
          <Button variant="outline-dark" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="dark" onClick={submit} disabled={saving || !canSave} loading={saving}>
            Save Adjustment{validLines.length > 1 ? `s (${validLines.length})` : ""}
          </Button>
        </div>
      }
    >
      <div className="sl-form-field">
        <label>Products</label>
        <div className="sl-adj-lines">
          <div className="sl-adj-lines__head">
            <span>Product</span>
            <span>Transaction Type</span>
            <span>Quantity</span>
            <span />
          </div>
          {lines.map((line) => {
            const product = products.find((p) => p.id === line.productId);
            const isDuplicate = line.productId && duplicateProductIds.has(line.productId);
            return (
              <div className="sl-adj-lines__row" key={line.key}>
                <div>
                  <Dropdown
                    searchable
                    value={line.productId}
                    options={products}
                    onChange={(id) => patchLine(line.key, { productId: id })}
                  />
                  {isDuplicate && <span className="sl-adj-line-err">Already added above</span>}
                </div>
                <Dropdown
                  searchable={false}
                  value={line.txnType}
                  options={ADJUSTMENT_TXN_TYPES.map((t) => ({ id: t, name: TXN_LABELS[t] }))}
                  onChange={(id) => patchLine(line.key, { txnType: id as TxnType })}
                />
                <input
                  className="sl-input sl-input--sm"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={product?.measure_unit ? `Qty (${product.measure_unit})` : "Qty"}
                  value={line.qty}
                  onChange={(e) => patchLine(line.key, { qty: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                />
                <button
                  type="button"
                  className="sl-adj-remove-line"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  title="Remove product"
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="sl-adj-add-line"
          onClick={() => setLines((prev) => [...prev, emptyLine(products[0]?.id ?? "")])}
        >
          <PlusLg size={13} /> Add Product
        </button>
        {hasIncompleteLine && <span className="sl-adj-line-err d-block mt-2">Every product needs a quantity greater than 0</span>}
      </div>
      <div className="sl-form-field">
        <label>Notes</label>
        <textarea className="sl-input sl-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
