import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Dropdown } from "react-bootstrap";
import {
  Search,
  Shop,
  ThreeDotsVertical,
  PencilSquare,
  Trash,
  PlusLg,
  CashCoin,
  X,
  FileEarmarkPdf,
  FileEarmarkExcel,
  FiletypeCsv,
} from "react-bootstrap-icons";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuppliersThunk, fetchSupplierFilterOptionsThunk, deleteSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Supplier, SupplierWithBalance, SupplierPaymentStatus } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import api from "../../../services/api/axios";
import { INVENTORY } from "../../../services/api/endpoints/inventory.endpoints";
import { downloadBlob } from "../../../utils/downloadBlob";
import { exportSuppliersPDF, exportSuppliersCSV, exportSuppliersExcel } from "../utils/supplierExport";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import Pagination from "../../../components/ui/Pagination";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import CreatePayoutModal from "../components/CreatePayoutModal";
import SupplierPendingDetailsModal from "../components/SupplierPendingDetailsModal";
import "../styles/SuppliersListPage.scss";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const STATUS_LABEL: Record<SupplierPaymentStatus, string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
};

interface RowActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

// "⋮" row-actions menu — portaled and hand-positioned rather than
// react-bootstrap's Dropdown/Popper. The table wrapper needs overflow-x:auto
// for horizontal scroll (which clips an in-place absolute dropdown), and
// Popper's "fixed" strategy stops being relative to the true viewport the
// moment any ancestor higher up the page has a transform (one does,
// elsewhere in the app) — that's what made the menu open in the wrong spot
// on first click. Same fix already used for ConsumableInventoryPage's
// RowActionsMenu and CashMgmtRowActionsMenu; this one follows
// CashMgmtRowActionsMenu's choice to reposition (not close) on scroll/
// resize, so the menu stays open and tracks its row instead of vanishing.
const SupplierRowActionsMenu: React.FC<{ items: RowActionItem[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const toggle = () => {
    if (!open) updateCoords();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onReposition = () => updateCoords();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    // capture:true — scroll doesn't bubble, but a capture-phase listener on
    // window still sees scroll on any descendant container (the table's own
    // overflow-x, or the page's own scroll region), keeping the menu glued
    // to its trigger instead of drifting away while scrolling.
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  return (
    <>
      <button type="button" ref={btnRef} className="row-actions-toggle" onClick={toggle}>
        <ThreeDotsVertical size={16} />
      </button>
      {open && coords && createPortal(
        <div ref={menuRef} className="supplier-row-actions-menu" style={{ top: coords.top, right: coords.right }}>
          {items.map((item, i) => (
            <button
              type="button"
              key={i}
              className={`supplier-row-actions-menu__item${item.danger ? " supplier-row-actions-menu__item--danger" : ""}`}
              onClick={() => { item.onClick(); setOpen(false); }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
};

interface FilterState {
  city: string;
  state: string;
}

const DEFAULT_FILTERS: FilterState = { city: "", state: "" };

const SuppliersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount } = useCurrency();
  const {
    suppliers, suppliersTotal, supplierCities, supplierStates, loading,
  } = useAppSelector((state) => state.inventory);
  const currentSalonId = useAppSelector((state) => state.salon?.currentSalon?.id);

  const [search, setSearch] = useState("");
  // The input stays controlled by `search` for instant typing feedback, but
  // the list only refetches off this debounced copy — the list is now a
  // real server round-trip (POST, paginated), not a client-side filter over
  // an already-loaded array, so firing it on every keystroke would hit the
  // API constantly.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Payout modal state — undefined supplierId means the modal shows its own
  // supplier picker (top-level "Create Payout" entry point).
  const [payoutSupplierId, setPayoutSupplierId] = useState<string | undefined>(undefined);
  const [payoutOpen, setPayoutOpen] = useState(false);

  // Delete modal state
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Pending Amount modal — opened from the Due Amount cell, not the row
  // itself (which still navigates to the full Supplier Detail page).
  const [pendingDetailsSupplierId, setPendingDetailsSupplierId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Re-fetch the currently-viewed page/pageSize/search/filters combination —
  // used after any action that mutates the list (delete, payout) so it lands
  // back on the same view instead of resetting to page 1.
  const refetchCurrentPage = useCallback(() => {
    dispatch(fetchSuppliersThunk({
      page: currentPage,
      page_limit: pageSize,
      search: debouncedSearch || undefined,
      city: appliedFilters.city || undefined,
      state: appliedFilters.state || undefined,
    }));
  }, [dispatch, currentPage, pageSize, debouncedSearch, appliedFilters]);

  // Tracks whether we're past the initial mount, so the effect below doesn't
  // also fire (redundantly) on first render — mirrors ServicesListPage.tsx.
  const isMountedRef = useRef(false);

  // Initial fetch on mount — skipped when the store already has data from a
  // previous visit AND this mount wasn't triggered by a successful Add/Edit
  // save. AddSupplierPage navigates back with location.state.refresh only
  // after a save; a plain Close navigates back with no state at all, so
  // returning from Close reuses what's already in the store instead of
  // calling the API again.
  useEffect(() => {
    const justSaved = (location.state as { refresh?: boolean } | null)?.refresh;
    // eslint-disable-next-line no-console
    console.log("[SuppliersListPage] mount effect", {
      suppliersLength: suppliers.length,
      supplierCitiesLength: supplierCities.length,
      supplierStatesLength: supplierStates.length,
      justSaved,
      locationState: location.state,
      pathname: location.pathname,
    });
    if (suppliers.length === 0 || justSaved) {
      dispatch(fetchSuppliersThunk({ page: 1, page_limit: pageSize }));
    }
    // Same "don't refetch what's already loaded" reasoning as the list
    // above — this was previously unconditional, so even a plain Close
    // (no data change at all) still re-hit the locations endpoint on every
    // return to this page.
    if (supplierCities.length === 0 && supplierStates.length === 0) {
      dispatch(fetchSupplierFilterOptionsThunk());
    }
    const t = setTimeout(() => { isMountedRef.current = true; }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when page/pageSize/search/filters change (skip initial mount,
  // already handled above). When search/filters change while not already on
  // page 1, reset to page 1 without firing a second (stale-page) fetch in
  // the same tick — the page-1 reset alone triggers this effect again with
  // the corrected page, so fetching here too would fire twice, the first
  // time against the wrong (pre-reset) page number.
  const filtersKey = JSON.stringify({ debouncedSearch, appliedFilters });
  const prevFiltersKeyRef = useRef(filtersKey);
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    refetchCurrentPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, debouncedSearch, appliedFilters, filtersKey]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "city", label: "City", searchable: true, options: supplierCities.map((c) => ({ id: c, label: c })) },
    { key: "state", label: "State", searchable: true, options: supplierStates.map((s) => ({ id: s, label: s })) },
  ], [supplierCities, supplierStates]);

  const filterMenuSelected = useMemo(() => ({
    city: appliedFilters.city ? [appliedFilters.city] : [],
    state: appliedFilters.state ? [appliedFilters.state] : [],
  }), [appliedFilters]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    const one = (v?: string[]) => (v?.length ? v[v.length - 1] : "");
    setAppliedFilters({ city: one(next.city), state: one(next.state) });
  };

  const handleClearSearch = () => setSearch("");

  const goToAddSupplier = () => navigate("/dashboard/inventory/suppliers/new");
  const goToEditSupplier = (id: string) => navigate(`/dashboard/inventory/suppliers/${id}/edit`);

  const openPayout = (supplierId?: string) => {
    setPayoutSupplierId(supplierId);
    setPayoutOpen(true);
  };

  const closePayout = () => {
    setPayoutOpen(false);
    setPayoutSupplierId(undefined);
  };

  const [isExporting, setIsExporting] = useState(false);

  // Pulls every supplier matching the current search/filters, not just the
  // page currently on screen — same page-looping approach as
  // ProductsListPage's export, since SUPPLIERS_LIST is server-paginated.
  const fetchAllSuppliersForExport = useCallback(async (): Promise<SupplierWithBalance[]> => {
    const all: SupplierWithBalance[] = [];
    let page = 1;
    const page_limit = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await api.post(INVENTORY.SUPPLIERS_LIST, {
        salon_id: currentSalonId,
        page,
        page_limit,
        search: debouncedSearch || undefined,
        city: appliedFilters.city || undefined,
        state: appliedFilters.state || undefined,
      });
      const chunk: SupplierWithBalance[] = res.data?.data?.data ?? [];
      all.push(...chunk);
      if (chunk.length < page_limit) break;
      page += 1;
    }
    return all;
  }, [currentSalonId, debouncedSearch, appliedFilters]);

  const handleExport = useCallback(async (format: "pdf" | "csv" | "excel") => {
    setIsExporting(true);
    try {
      const all = await fetchAllSuppliersForExport();
      if (format === "pdf") {
        downloadBlob(exportSuppliersPDF(all, formatAmount), "suppliers.pdf", "application/pdf");
      } else if (format === "csv") {
        downloadBlob(exportSuppliersCSV(all, formatAmount), "suppliers.csv", "text/csv;charset=utf-8;");
      } else {
        const blob = await exportSuppliersExcel(all, formatAmount);
        downloadBlob(blob, "suppliers.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Supplier ${format.toUpperCase()} export failed:`, err);
    } finally {
      setIsExporting(false);
    }
  }, [fetchAllSuppliersForExport, formatAmount]);

  return (
    <div className="suppliers-list-page">
      <header className="suppliers-list-page__header">
        <div>
          <h1>
            Suppliers
            <span className="count-badge">{suppliersTotal}</span>
          </h1>
          <p>
            Add and manage details of your suppliers. <LearnMoreLink topic="suppliers">Learn more</LearnMoreLink>
          </p>
        </div>
        <div className="d-flex gap-2">
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="btn-options bg-white border-subtle d-flex align-items-center fw-medium"
              id="suppliers-options-dropdown"
              disabled={isExporting}
            >
              Options
            </Dropdown.Toggle>
            <Dropdown.Menu
              align="end"
              className="shadow-sm border-0 rounded-3 py-2"
              style={{ minWidth: "220px" }}
            >
              <Dropdown.Header className="px-3 py-1 text-muted fw-bold" style={{ fontSize: "12px", textTransform: "uppercase" }}>
                Export
              </Dropdown.Header>
              <Dropdown.Item onClick={() => handleExport("pdf")} disabled={isExporting} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkPdf size={16} /> Export All Data as PDF
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport("excel")} disabled={isExporting} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FileEarmarkExcel size={16} /> Export All Data as Excel
              </Dropdown.Item>
              <Dropdown.Item onClick={() => handleExport("csv")} disabled={isExporting} className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark">
                <FiletypeCsv size={16} /> Export All Data as CSV
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <Button variant="outline-dark" iconLeft={<CashCoin size={14} />} onClick={() => openPayout()}>
            Create Payout
          </Button>
          <Button variant="dark" iconLeft={<PlusLg size={14} />} onClick={goToAddSupplier}>
            Add
          </Button>
        </div>
      </header>

      <div className="suppliers-list-page__controls">
        <Input
          containerClass="search-box mb-0"
          type="text"
          placeholder="Search suppliers by name, contact or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={16} />}
          iconRight={search ? (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={handleClearSearch}
            >
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

      <main className="suppliers-list-page__content">
        {loading ? (
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Supplier name</th>
                <th>Phone</th>
                <th>Total Amount</th>
                <th>Pending Orders</th>
                <th>Due Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Skeleton width={36} height={36} borderRadius={6} />
                      <Skeleton width="60%" height={13} />
                    </div>
                  </td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="30%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="40%" height={12} /></td>
                  <td className="actions-cell" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : suppliers.length > 0 ? (
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Supplier name</th>
                <th>Phone</th>
                <th>Total Amount</th>
                <th>Pending Orders</th>
                <th>Due Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const sb = s as SupplierWithBalance;
                const status: SupplierPaymentStatus = sb.status ?? "paid";
                return (
                <tr
                  key={s.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/dashboard/inventory/suppliers/${s.id}`)}
                >
                  <td className="supplier-name-cell">
                    <div className="supplier-icon"><Shop size={18} /></div>
                    <div className="name-info">
                      <span className="name">{s.name}</span>
                      {(s.first_name || s.last_name) && (
                        <span className="contact">{[s.first_name, s.last_name].filter(Boolean).join(" ")}</span>
                      )}
                    </div>
                  </td>
                  <td>{s.mobile_number || s.telephone_number || "—"}</td>
                  <td>{formatAmount(sb.total_purchase_amount ?? 0)}</td>
                  <td>{sb.pending_order_count ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="supplier-due-amount-btn"
                      onClick={(e) => { e.stopPropagation(); setPendingDetailsSupplierId(s.id); }}
                    >
                      {formatAmount(sb.due_amount ?? 0)}
                    </button>
                  </td>
                  <td>{fmtDate(sb.due_date)}</td>
                  <td>
                    <span className={`supplier-status-badge supplier-status-badge--${status}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <SupplierRowActionsMenu
                      items={[
                        { label: "Edit", icon: <PencilSquare size={14} />, onClick: () => goToEditSupplier(s.id) },
                        { label: "Payout", icon: <CashCoin size={14} />, onClick: () => openPayout(s.id) },
                        {
                          label: "Delete",
                          icon: <Trash size={14} />,
                          onClick: () => { setDeletingSupplier(s); setDeleteInput(""); },
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        ) : (
          <EmptyState
            className="suppliers-empty-card"
            icon={<Shop size={40} />}
            title="No suppliers yet"
            description="Click here to add a supplier now."
            action={
              <Button variant="dark" size="sm" iconLeft={<PlusLg size={13} />} onClick={goToAddSupplier}>
                Add Supplier
              </Button>
            }
          />
        )}
      </main>

      {suppliersTotal > 0 && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={suppliersTotal}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
          className="suppliers-pagination"
        />
      )}

      {/* ================= DELETE MODAL ================= */}
      <Modal
        show={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        title="Delete supplier?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE" || isDeleting}
              loading={isDeleting}
              onClick={async () => {
                if (!deletingSupplier) return;
                setIsDeleting(true);
                await dispatch(deleteSupplierThunk(deletingSupplier.id));
                setIsDeleting(false);
                setDeletingSupplier(null);
                setDeleteInput("");
                // Corrects suppliersTotal and backfills this page from the
                // server — the slice's own local .filter() on delete just
                // shrinks the in-memory array, which would otherwise leave
                // the page short a row and the pagination count stale.
                refetchCurrentPage();
              }}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => { setDeletingSupplier(null); setDeleteInput(""); }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          Are you sure you want to delete <strong>{deletingSupplier?.name}</strong>? This operation can't be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>

      <CreatePayoutModal
        show={payoutOpen}
        onClose={closePayout}
        supplierId={payoutSupplierId}
        onSuccess={refetchCurrentPage}
      />

      <SupplierPendingDetailsModal
        show={!!pendingDetailsSupplierId}
        onClose={() => setPendingDetailsSupplierId(undefined)}
        supplierId={pendingDetailsSupplierId}
      />
    </div>
  );
};

export default SuppliersListPage;
