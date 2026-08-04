import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "react-bootstrap";
import { Search, ThreeDotsVertical, PlusLg } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchConsumablesThunk,
  fetchConsumableKpisThunk,
  fetchSuppliersThunk,
} from "../../../middleware/inventory/inventory.thunk";
import { fetchBrandsThunk, fetchCategoriesThunk } from "../../../middleware/catalog/products.thunk";
import { useCurrency } from "../../../hooks/useCurrency";
import { Pagination } from "../../../components/ui";
import Skeleton from "../../../components/ui/Skeleton";
import type { ConsumableListFilters, ConsumableStatus } from "../../../types/inventory.types";
import ConsumableDetailPanel from "../components/ConsumableDetailPanel";
import "../styles/ConsumableInventoryPage.scss";

const DEBOUNCE_MS = 400;

const STATUS_LABEL: Record<ConsumableStatus, string> = {
  healthy: "Healthy",
  low: "Low Stock",
  out_of_stock: "Out of Stock",
};

const SORT_OPTIONS: { value: NonNullable<ConsumableListFilters["sort_by"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "lowest_stock", label: "Lowest Stock" },
  { value: "most_used", label: "Most Used" },
  { value: "a_z", label: "A-Z" },
];

const UNIT_OPTIONS = ["ml", "l", "g", "kg", "pcs"];

const ConsumableInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { formatAmount } = useCurrency();

  const { categories, brands } = useSelector((s: RootState) => s.products);
  const suppliers = useSelector((s: RootState) => s.inventory.suppliers);
  const {
    consumables, consumablesPage, consumablesPageSize, consumablesTotalRecords,
    consumablesLoading, consumableKpis, consumableKpisLoading,
  } = useSelector((s: RootState) => s.inventory);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ConsumableListFilters>({ page: 1, limit: 20, sort_by: "newest" });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchCategoriesThunk());
    dispatch(fetchBrandsThunk());
    dispatch(fetchSuppliersThunk());
    dispatch(fetchConsumableKpisThunk());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchConsumablesThunk(filters));
  }, [dispatch, filters]);

  // Stock changes on this page whenever an appointment elsewhere gets paid
  // (consumable deduction happens server-side, not through any action this
  // page dispatches) — refetch whenever the tab regains focus so numbers
  // don't sit stale if this page was left open in the background while a
  // sale was completed on the Calendar in another tab/window.
  useEffect(() => {
    function onFocus() {
      dispatch(fetchConsumablesThunk(filters));
      dispatch(fetchConsumableKpisThunk());
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dispatch, filters]);

  // Debounced search — same 400ms pattern as ProductsListPage.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const updateFilter = useCallback(<K extends keyof ConsumableListFilters>(key: K, value: ConsumableListFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  }, []);

  const refresh = useCallback(() => {
    dispatch(fetchConsumablesThunk(filters));
    dispatch(fetchConsumableKpisThunk());
  }, [dispatch, filters]);

  return (
    <div className="ci-page">
      <div className="ci-header">
        <div>
          <h1 className="ci-header__title">Consumable Inventory</h1>
          <p className="ci-header__subtitle">Manage all consumable products used during salon services.</p>
        </div>
        <div className="ci-header__actions">
          <button className="ci-btn ci-btn--primary" onClick={() => navigate("/dashboard/catalog/inventory/consumables/add")}>
            <PlusLg size={14} /> Add Consumable
          </button>
          <button className="ci-btn ci-btn--outline" onClick={() => navigate("/dashboard/catalog/inventory/consumables/usage-history")}>
            Usage History
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="rp-sra-summary-row ci-kpi-row">
        {consumableKpisLoading || !consumableKpis ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div className="rp-sra-summary-card" key={i}><Skeleton height={28} width={70} /><Skeleton height={12} width={90} style={{ marginTop: 8 }} /></div>
          ))
        ) : (
          <>
            <div className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{consumableKpis.total_consumables}</div>
              <div className="rp-sra-summary-label">Consumable Products</div>
            </div>
            <div className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{consumableKpis.total_available_stock.toLocaleString()}</div>
              <div className="rp-sra-summary-label">Across all consumables</div>
            </div>
            <div className="rp-sra-summary-card ci-kpi--warn">
              <div className="rp-sra-summary-val">{consumableKpis.low_stock_items}</div>
              <div className="rp-sra-summary-label">Need Refill</div>
            </div>
            <div className="rp-sra-summary-card ci-kpi--danger">
              <div className="rp-sra-summary-val">{consumableKpis.out_of_stock_items}</div>
              <div className="rp-sra-summary-label">Unavailable</div>
            </div>
            <div className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{formatAmount(consumableKpis.inventory_value)}</div>
              <div className="rp-sra-summary-label">Supply Cost</div>
            </div>
            <div className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{consumableKpis.todays_consumption.toLocaleString()}</div>
              <div className="rp-sra-summary-label">Used Today</div>
            </div>
          </>
        )}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="ci-filters">
        <div className="ci-search">
          <Search size={14} />
          <input placeholder="Search product…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <select value={filters.category_id ?? ""} onChange={(e) => updateFilter("category_id", e.target.value)}>
          <option value="">Category</option>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.brand_id ?? ""} onChange={(e) => updateFilter("brand_id", e.target.value)}>
          <option value="">Brand</option>
          {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filters.supplier_id ?? ""} onChange={(e) => updateFilter("supplier_id", e.target.value)}>
          <option value="">Supplier</option>
          {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.status ?? ""} onChange={(e) => updateFilter("status", e.target.value as ConsumableStatus)}>
          <option value="">Status</option>
          <option value="healthy">Healthy</option>
          <option value="low">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <select value={filters.unit ?? ""} onChange={(e) => updateFilter("unit", e.target.value)}>
          <option value="">Unit</option>
          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filters.sort_by ?? "newest"} onChange={(e) => updateFilter("sort_by", e.target.value as any)}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="ci-table-wrap">
        <table className="ci-table">
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Brand</th><th>Supplier</th>
              <th>Unit Size</th><th>Product Qty</th><th>Total Stock</th><th>Remaining Stock</th>
              <th>Used Today</th><th>Used This Month</th><th>Assigned Services</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {consumablesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 13 }).map((__, j) => <td key={j}><Skeleton height={14} /></td>)}</tr>
              ))
            ) : consumables.length === 0 ? (
              <tr><td colSpan={13} className="ci-empty">No consumables found.</td></tr>
            ) : (
              consumables.map((row) => (
                <tr key={row.product_id} onClick={() => setSelectedProductId(row.product_id)}>
                  <td className="ci-table__name">{row.name}</td>
                  <td>{row.category_name || "—"}</td>
                  <td>{row.brand_name || "—"}</td>
                  <td>{row.supplier_name || "—"}</td>
                  <td>{row.unit_size ? `${row.unit_size} ${row.unit}` : "—"}</td>
                  <td>{row.product_qty}</td>
                  <td>{row.total_stock.toLocaleString()} {row.unit}</td>
                  <td>{row.remaining_stock.toLocaleString()} {row.unit}</td>
                  <td>{row.used_today.toLocaleString()} {row.unit}</td>
                  <td>{row.used_this_month.toLocaleString()} {row.unit}</td>
                  <td>{row.assigned_services_count} Service{row.assigned_services_count === 1 ? "" : "s"}</td>
                  <td><span className={`ci-status ci-status--${row.status}`}>{STATUS_LABEL[row.status]}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Dropdown>
                      <Dropdown.Toggle as="button" className="ci-row-actions-btn"><ThreeDotsVertical size={16} /></Dropdown.Toggle>
                      <Dropdown.Menu align="end">
                        <Dropdown.Item onClick={() => setSelectedProductId(row.product_id)}>View</Dropdown.Item>
                        <Dropdown.Item onClick={() => navigate(`/dashboard/catalog/inventory/consumables/edit/${row.product_id}`)}>Edit</Dropdown.Item>
                        <Dropdown.Item onClick={() => setSelectedProductId(row.product_id)}>Adjust Stock</Dropdown.Item>
                        <Dropdown.Item onClick={() => navigate(`/dashboard/catalog/inventory/consumables/usage-history?product_id=${row.product_id}`)}>View Usage</Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={consumablesPage}
        pageSize={consumablesPageSize}
        totalItems={consumablesTotalRecords}
        onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
        onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, limit: size, page: 1 }))}
      />

      {selectedProductId && (
        <ConsumableDetailPanel
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onAdjusted={refresh}
          onEdit={() => navigate(`/dashboard/catalog/inventory/consumables/edit/${selectedProductId}`)}
        />
      )}
    </div>
  );
};

export default ConsumableInventoryPage;
