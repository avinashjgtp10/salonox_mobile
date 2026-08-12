import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, PlusLg, X, ThreeDotsVertical } from "react-bootstrap-icons";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchConsumablesDashboardThunk,
  fetchSuppliersThunk,
} from "../../../middleware/inventory/inventory.thunk";
import { fetchBrandsThunk, fetchCategoriesThunk, updateProductThunk } from "../../../middleware/catalog/products.thunk";
import { fetchServicesThunk } from "../../../middleware/services/services.thunk";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import Dropdown from "../../../components/ui/Dropdown";
import type { FilterDropdownOption, JiraFilterField } from "../../../components/ui";
import Skeleton from "../../../components/ui/Skeleton";
import type { ConsumableListFilters, ConsumableStatus } from "../../../types/inventory.types";
import ConsumableDetailPanel from "../components/ConsumableDetailPanel";
import AssignedServicesPopup from "../components/AssignedServicesPopup";
import "../styles/ConsumableInventoryPage.scss";

interface RowActionItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

// "⋮" row-actions menu, local to this page — a plain absolutely-positioned
// dropdown (even react-bootstrap's Dropdown with popperConfig strategy:
// "fixed") gets clipped or mispositioned here: the table wrapper needs
// overflow-x:auto for horizontal scroll (which clips it), and "fixed" itself
// stops being relative to the viewport the moment any ancestor up the page's
// layout has a transform (which one does, elsewhere in the app). Rendering
// into a portal on document.body and positioning from the trigger's own
// getBoundingClientRect() sidesteps both problems regardless of what's above
// it in the DOM.
const RowActionsMenu: React.FC<{ items: RowActionItem[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    // capture:true — scroll events don't bubble, but a capture-phase
    // listener on window still sees scroll on any descendant container
    // (e.g. the table's own overflow-x scrollbar), so a stale-positioned
    // menu closes instead of drifting away from its trigger.
    const onScroll = () => setOpen(false);
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <>
      <button type="button" ref={btnRef} className="ci-row-actions-btn" onClick={toggle}>
        <ThreeDotsVertical size={16} />
      </button>
      {open && coords && createPortal(
        <div ref={menuRef} className="ci-row-actions-menu" style={{ top: coords.top, right: coords.right }}>
          {items.map((item, i) => (
            <button
              type="button"
              key={i}
              className={`ci-row-actions-menu__item${item.danger ? " ci-row-actions-menu__item--danger" : ""}`}
              onClick={() => { item.onClick(); setOpen(false); }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

const DEBOUNCE_MS = 400;
const FOCUS_REFRESH_MIN_INTERVAL_MS = 15000;

const STATUS_LABEL: Record<ConsumableStatus, string> = {
  healthy: "Healthy",
  low: "Low Stock",
  out_of_stock: "Out of Stock",
  deactivated: "Deactivated",
};
const STATUS_DOT: Record<ConsumableStatus, string> = {
  healthy: "🟢",
  low: "🟠",
  out_of_stock: "🔴",
  deactivated: "⚫",
};

const SORT_OPTIONS: { value: NonNullable<ConsumableListFilters["sort_by"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "lowest_stock", label: "Lowest Stock" },
  { value: "most_used", label: "Most Used" },
  { value: "a_z", label: "A-Z" },
];

const UNIT_OPTIONS = ["ml", "l", "g", "kg", "pcs"];

const STATUS_OPTIONS: FilterDropdownOption[] = [
  { id: "healthy", label: "Healthy" },
  { id: "low", label: "Low Stock" },
  { id: "out_of_stock", label: "Out of Stock" },
  { id: "deactivated", label: "Deactivated" },
];
const UNIT_FILTER_OPTIONS: FilterDropdownOption[] = UNIT_OPTIONS.map((u) => ({ id: u, label: u }));
const PRODUCT_TYPE_OPTIONS: FilterDropdownOption[] = [
  { id: "consumable", label: "Consumable" },
  { id: "both", label: "Both" },
];

const ConsumableInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { categories, brands } = useSelector((s: RootState) => s.products);
  const suppliers = useSelector((s: RootState) => s.inventory.suppliers);
  const servicesList = useSelector((s: RootState) => (s as any).services?.items ?? []);
  const {
    consumables, consumablesPage, consumablesPageSize, consumablesTotalRecords,
    consumablesLoading, consumableKpis, consumableKpisLoading,
  } = useSelector((s: RootState) => s.inventory);

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ConsumableListFilters>({ page: 1, limit: 20, sort_by: "newest" });
  // `openAdjust` distinguishes the "Adjust Stock" row action from plain
  // View Details — both open the same panel, but the former should land
  // straight on the Stock Adjustment modal.
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; openAdjust: boolean } | null>(null);
  const [assignedServicesFor, setAssignedServicesFor] = useState<{ id: string; name: string } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Categories/brands/suppliers/services are shared reference data used
  // across Products, Services, and here — if another page already loaded
  // them into Redux this session, re-fetching on every visit to THIS page
  // is pure waste. Only dispatch for whichever of these actually came back
  // empty.
  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategoriesThunk());
    if (brands.length === 0) dispatch(fetchBrandsThunk());
    if (suppliers.length === 0) dispatch(fetchSuppliersThunk());
    if (servicesList.length === 0) dispatch(fetchServicesThunk({ limit: 200, isActive: true } as any));
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastFetchedAtRef = useRef(0);

  // Single combined request for both the table rows and the KPI cards —
  // see consumable-inventory.service.ts::getDashboard(). Previously two
  // separate HTTP calls (fetchConsumablesThunk + fetchConsumableKpisThunk)
  // fired together on every mount/filter/search/page change.
  useEffect(() => {
    dispatch(fetchConsumablesDashboardThunk(filters));
    lastFetchedAtRef.current = Date.now();
  }, [dispatch, filters]);

  // Stock changes on this page whenever an appointment elsewhere gets paid
  // (consumable deduction happens server-side, not through any action this
  // page dispatches) — refetch when you actually come back to this TAB after
  // it sat hidden for a while, so numbers don't stay stale if a sale was
  // completed on the Calendar in another tab/window while this one was in
  // the background.
  //
  // Deliberately `document.visibilitychange` (fires only when this tab's
  // own visibility flips — switching tabs, minimizing) rather than
  // `window.addEventListener("focus", ...)`, which fires on every OS-level
  // window focus change: clicking into an undocked DevTools window and
  // back, alt-tabbing to another app and back, even while this tab was
  // never actually hidden. That's what was making the whole page
  // (KPI cards + table) flash back to loading skeletons on ordinary clicks
  // while testing with DevTools open. The 15s floor stays as a second guard
  // against firing again immediately after the initial load.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetchedAtRef.current < FOCUS_REFRESH_MIN_INTERVAL_MS) return;
      dispatch(fetchConsumablesDashboardThunk(filters));
      lastFetchedAtRef.current = Date.now();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [dispatch, filters]);

  // Debounced search — same 400ms pattern as ProductsListPage. This effect
  // also fires on mount (searchInput starts as ""), which used to
  // unconditionally build a NEW filters object 400ms later even when
  // nothing had actually changed (search was already undefined, page was
  // already 1) — a new object reference still re-triggers the
  // [dispatch, filters] fetch effect below, firing a second, redundant
  // /consumables request on every page load. Returning `prev` unchanged
  // when there's really nothing to update keeps the reference stable.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => {
        const nextSearch = searchInput || undefined;
        if (prev.search === nextSearch && prev.page === 1) return prev;
        return { ...prev, search: nextSearch, page: 1 };
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const updateFilter = useCallback(<K extends keyof ConsumableListFilters>(key: K, value: ConsumableListFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  }, []);

  // The single Filter menu's own Apply Filters button hands back the WHOLE
  // draft (every field, changed or not) in one call — one state update, one
  // fetch, covering however many fields the user touched before clicking
  // Apply, per the "single API call only when the user clicks Apply
  // Filters" requirement.
  const applyAllFilters = useCallback((next: Record<string, string[]>) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      category_id: next.category_id?.length ? next.category_id : undefined,
      brand_id: next.brand_id?.length ? next.brand_id : undefined,
      supplier_id: next.supplier_id?.length ? next.supplier_id : undefined,
      unit: next.unit?.length ? next.unit : undefined,
      service_id: next.service_id?.length ? next.service_id : undefined,
      status: next.status?.length ? (next.status as ConsumableStatus[]) : undefined,
      product_type: next.product_type?.length ? (next.product_type as ("consumable" | "both")[]) : undefined,
    }));
  }, []);

  const removeChip = useCallback(
    <K extends keyof Pick<ConsumableListFilters, "category_id" | "brand_id" | "supplier_id" | "unit" | "service_id" | "status" | "product_type">>(
      key: K, id: string,
    ) => {
      setFilters((prev) => {
        const remaining = ((prev[key] as string[] | undefined) ?? []).filter((v) => v !== id);
        return { ...prev, [key]: remaining.length ? (remaining as ConsumableListFilters[K]) : undefined, page: 1 };
      });
    },
    [],
  );

  // Clears the search box too — this rebuilds `filters` from scratch, so
  // `search` is dropped either way; leaving searchInput alone left the box
  // still showing its text next to an unfiltered table, and the debounce
  // effect below only reacts to searchInput changes so it never reconciled.
  const clearAllFilters = useCallback(() => {
    setSearchInput("");
    setFilters((prev) => ({
      page: 1, limit: prev.limit, sort_by: prev.sort_by,
      category_id: undefined, brand_id: undefined, supplier_id: undefined,
      unit: undefined, service_id: undefined, status: undefined, product_type: undefined,
    }));
  }, []);

  const categoryOptions: FilterDropdownOption[] = useMemo(
    () => categories.map((c: any) => ({ id: c.id, label: c.name })), [categories],
  );
  const brandOptions: FilterDropdownOption[] = useMemo(
    () => brands.map((b: any) => ({ id: b.id, label: b.name })), [brands],
  );
  const supplierOptions: FilterDropdownOption[] = useMemo(
    () => suppliers.map((s: any) => ({ id: s.id, label: s.name })), [suppliers],
  );
  const serviceOptions: FilterDropdownOption[] = useMemo(
    () => servicesList.map((s: any) => ({ id: s.id, label: s.name })), [servicesList],
  );

  // Chip row after Apply — needs a label lookup per filter since ids alone
  // aren't readable. Built once from the same option lists the dropdowns use.
  const chipLabelMaps = useMemo(() => {
    const toMap = (opts: FilterDropdownOption[]) => new Map(opts.map((o) => [o.id, o.label]));
    return {
      category_id: toMap(categoryOptions),
      brand_id: toMap(brandOptions),
      supplier_id: toMap(supplierOptions),
      service_id: toMap(serviceOptions),
      unit: toMap(UNIT_FILTER_OPTIONS),
      status: toMap(STATUS_OPTIONS),
      product_type: toMap(PRODUCT_TYPE_OPTIONS),
    };
  }, [categoryOptions, brandOptions, supplierOptions, serviceOptions]);

  const activeChips = useMemo(() => {
    const chipKeys = ["category_id", "brand_id", "supplier_id", "unit", "service_id", "status", "product_type"] as const;
    return chipKeys.flatMap((key) =>
      ((filters[key] as string[] | undefined) ?? []).map((id) => ({
        key, id, label: chipLabelMaps[key].get(id) ?? id,
      })),
    );
  }, [filters, chipLabelMaps]);

  // Single "Filter" menu's field list — one entry per name shown in its
  // left pane, in the order given in the spec.
  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "category_id", label: "Category", options: categoryOptions, searchable: true },
    { key: "brand_id", label: "Brand", options: brandOptions, searchable: true },
    { key: "supplier_id", label: "Supplier", options: supplierOptions, searchable: true },
    { key: "service_id", label: "Assigned Service", options: serviceOptions, searchable: true },
    { key: "status", label: "Stock Status", options: STATUS_OPTIONS },
    { key: "unit", label: "Base Unit", options: UNIT_FILTER_OPTIONS },
    { key: "product_type", label: "Product Type", options: PRODUCT_TYPE_OPTIONS },
  ], [categoryOptions, brandOptions, supplierOptions, serviceOptions]);

  const filterMenuSelected = useMemo(() => ({
    category_id: filters.category_id ?? [],
    brand_id: filters.brand_id ?? [],
    supplier_id: filters.supplier_id ?? [],
    service_id: filters.service_id ?? [],
    status: filters.status ?? [],
    unit: filters.unit ?? [],
    product_type: filters.product_type ?? [],
  }), [filters]);

  const refresh = useCallback(() => {
    dispatch(fetchConsumablesDashboardThunk(filters));
    lastFetchedAtRef.current = Date.now();
  }, [dispatch, filters]);

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await dispatch(updateProductThunk({ id: deactivateTarget.id, data: { is_active: false } })).unwrap();
      setDeactivateTarget(null);
      refresh();
    } finally {
      setDeactivating(false);
    }
  }

  // No confirmation step — reactivating is non-destructive (unlike
  // Deactivate, which hides the product from every picker/list), so there's
  // nothing risky enough here to warrant an extra click.
  async function handleReactivate(productId: string) {
    await dispatch(updateProductThunk({ id: productId, data: { is_active: true } })).unwrap();
    refresh();
  }

  return (
    <div className="ci-page">
      <div className="ci-header">
        <div>
          <h1 className="ci-header__title">Consumable Inventory</h1>
          <p className="ci-header__subtitle">
            Manage all consumable products used during salon services. Track stock, unit conversion, service
            assignment, and usage status.
          </p>
        </div>
        <div className="ci-header__actions">
          {/* Labels are deliberately short; title/aria-label carry the full
              wording so the buttons still read unambiguously to screen readers
              and on hover. */}
          <button
            className="ci-btn ci-btn--primary"
            title="Add Consumable"
            aria-label="Add Consumable"
            onClick={() => navigate("/dashboard/catalog/inventory/consumables/add")}
          >
            <PlusLg size={14} /> Add
          </button>
          <button
            className="ci-btn ci-btn--outline"
            title="Usage History"
            aria-label="Usage History"
            onClick={() => navigate("/dashboard/catalog/inventory/consumables/usage-history")}
          >
            Usage
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="rp-sra-summary-row ci-kpi-row">
        {consumableKpisLoading || !consumableKpis ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div className="rp-sra-summary-card" key={i}><Skeleton height={28} width={70} /><Skeleton height={12} width={90} style={{ marginTop: 8 }} /></div>
          ))
        ) : (
          <>
            <div className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{consumableKpis.total_consumables}</div>
              <div className="rp-sra-summary-label">Total Consumable Products</div>
            </div>
            <div className="rp-sra-summary-card ci-kpi--warn">
              <div className="rp-sra-summary-val">{consumableKpis.low_stock_items}</div>
              <div className="rp-sra-summary-label">Low Stock</div>
            </div>
            <div className="rp-sra-summary-card ci-kpi--danger">
              <div className="rp-sra-summary-val">{consumableKpis.out_of_stock_items}</div>
              <div className="rp-sra-summary-label">Out of Stock</div>
            </div>
            <div className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{consumableKpis.assigned_services}</div>
              <div className="rp-sra-summary-label">Assigned Services</div>
            </div>
          </>
        )}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="ci-filters">
        <div className="ci-search">
          <Search size={14} />
          <input placeholder="Search consumable products…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <JiraFilterMenu
          fields={filterFields}
          selected={filterMenuSelected}
          onApply={applyAllFilters}
        />
        <Dropdown
          searchable={false}
          value={filters.sort_by ?? "newest"}
          options={SORT_OPTIONS.map((o) => ({ id: o.value, name: o.label }))}
          onChange={(id) => updateFilter("sort_by", id as any)}
        />
      </div>

      {activeChips.length > 0 && (
        <div className="ci-chip-row">
          {activeChips.map((chip) => (
            <span className="ci-chip" key={`${chip.key}-${chip.id}`}>
              {chip.label}
              <button type="button" onClick={() => removeChip(chip.key, chip.id)} aria-label={`Remove ${chip.label}`}>
                <X size={11} />
              </button>
            </span>
          ))}
          <button type="button" className="ci-chip-row__clear" onClick={clearAllFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="ci-table-wrap">
        <table className="ci-table">
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Supplier</th><th>Stock</th><th>Unit</th>
              <th>Available Stock</th><th>Used (Month)</th><th>Assigned Services</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {consumablesLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 10 }).map((__, j) => <td key={j}><Skeleton height={14} /></td>)}</tr>
              ))
            ) : consumables.length === 0 ? (
              <tr><td colSpan={10} className="ci-empty">No consumables found.</td></tr>
            ) : (
              consumables.map((row) => (
                <tr
                  key={row.product_id}
                  className={row.status === "deactivated" ? "ci-table-row--deactivated" : undefined}
                  onClick={() => setSelectedProduct({ id: row.product_id, openAdjust: false })}
                >
                  <td className="ci-table__name">
                    <span className="ci-table__name-text" title={row.name}>{row.name}</span>
                    {row.brand_name && <span className="ci-table__brand">{row.brand_name}</span>}
                  </td>
                  {/* title only when there's a real value — otherwise hovering
                      an empty cell shows a pointless "—" tooltip. */}
                  <td>
                    <span className="ci-table__truncate" title={row.category_name || undefined}>
                      {row.category_name || "—"}
                    </span>
                  </td>
                  <td>
                    <span className="ci-table__truncate" title={row.supplier_name || undefined}>
                      {row.supplier_name || "—"}
                    </span>
                  </td>
                  {/* Stock = package/bottle count (1, 2, 3…); Unit = the
                      configured package size itself (e.g. "100 ml" per
                      Bottle) — never the multiplied total across all stock. */}
                  <td>{row.product_qty.toLocaleString()}</td>
                  <td>{row.unit_size ? `${row.unit_size.toLocaleString()} ${row.unit}` : "—"}</td>
                  <td>{row.remaining_stock.toLocaleString()} {row.unit}</td>
                  <td>{row.used_this_month.toLocaleString()} {row.unit}</td>
                  <td>
                    {row.assigned_services_count > 0 ? (
                      <button
                        type="button"
                        className="ci-assigned-link"
                        onClick={(e) => { e.stopPropagation(); setAssignedServicesFor({ id: row.product_id, name: row.name }); }}
                      >
                        {row.assigned_services_count} Service{row.assigned_services_count === 1 ? "" : "s"}
                      </button>
                    ) : (
                      <span>0 Services</span>
                    )}
                  </td>
                  <td><span className={`ci-status ci-status--${row.status}`}>{STATUS_DOT[row.status]} {STATUS_LABEL[row.status]}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {/* Portaled to document.body and positioned from the
                        trigger's own screen coordinates — see the
                        RowActionsMenu component above for why a plain
                        react-bootstrap Dropdown (even with strategy:"fixed")
                        isn't reliable inside this horizontally-scrollable
                        table. */}
                    <RowActionsMenu
                      items={[
                        { label: "View Details", onClick: () => setSelectedProduct({ id: row.product_id, openAdjust: false }) },
                        { label: "Edit Product", onClick: () => navigate(`/dashboard/catalog/inventory/consumables/edit/${row.product_id}`) },
                        { label: "Adjust Stock", onClick: () => setSelectedProduct({ id: row.product_id, openAdjust: true }) },
                        row.status === "deactivated"
                          ? { label: "Reactivate", onClick: () => handleReactivate(row.product_id) }
                          : { label: "Deactivate", danger: true, onClick: () => setDeactivateTarget({ id: row.product_id, name: row.name }) },
                      ]}
                    />
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

      {selectedProduct && (
        <ConsumableDetailPanel
          productId={selectedProduct.id}
          openAdjustOnMount={selectedProduct.openAdjust}
          onClose={() => setSelectedProduct(null)}
          onAdjusted={refresh}
          onEdit={() => navigate(`/dashboard/catalog/inventory/consumables/edit/${selectedProduct.id}`)}
        />
      )}

      {assignedServicesFor && (
        <AssignedServicesPopup
          productId={assignedServicesFor.id}
          productName={assignedServicesFor.name}
          onClose={() => setAssignedServicesFor(null)}
        />
      )}

      {deactivateTarget && (
        <div className="ci-confirm-overlay" onClick={() => !deactivating && setDeactivateTarget(null)}>
          <div className="ci-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Deactivate Consumable?</h3>
            <p><strong>{deactivateTarget.name}</strong> will be hidden from Consumable Inventory, Products, and service recipe pickers. Its stock/usage history is kept.</p>
            <div className="ci-confirm-modal__actions">
              <button type="button" className="ci-btn ci-btn--outline" disabled={deactivating} onClick={() => setDeactivateTarget(null)}>Cancel</button>
              <button type="button" className="ci-btn ci-btn--danger" disabled={deactivating} onClick={confirmDeactivate}>
                {deactivating ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumableInventoryPage;
