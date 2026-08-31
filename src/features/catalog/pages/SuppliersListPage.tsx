import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Shop,
  ThreeDotsVertical,
  PencilSquare,
  Trash,
  PlusLg,
  CashCoin,
  X,
} from "react-bootstrap-icons";
import { Dropdown } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuppliersThunk, deleteSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Supplier, SupplierWithBalance, SupplierPaymentStatus } from "../../../types/inventory.types";
import { useCurrency } from "../../../hooks/useCurrency";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import Pagination from "../../../components/ui/Pagination";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import EmptyState from "../../../components/ui/EmptyState";
import AddSupplierPage from "./AddSupplierPage";
import CreatePayoutModal from "../components/CreatePayoutModal";
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

interface FilterState {
  city: string;
  state: string;
}

const DEFAULT_FILTERS: FilterState = { city: "", state: "" };

const SuppliersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { suppliers, loading } = useAppSelector((state) => state.inventory);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Payout modal state — undefined supplierId means the modal shows its own
  // supplier picker (top-level "Create Payout" entry point).
  const [payoutSupplierId, setPayoutSupplierId] = useState<string | undefined>(undefined);
  const [payoutOpen, setPayoutOpen] = useState(false);

  // Delete modal state
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliersThunk());
  }, [dispatch]);

  // Suppliers load in full (no server-side pagination for this list), so
  // City/State options and filtering are derived client-side from whatever's
  // already in the store — same reasoning ProductsListPage's Category/Brand
  // quick-filters use their own loaded lists rather than a dedicated endpoint.
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => { if (s.city?.trim()) set.add(s.city.trim()); });
    return Array.from(set).sort();
  }, [suppliers]);

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => { if (s.state?.trim()) set.add(s.state.trim()); });
    return Array.from(set).sort();
  }, [suppliers]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "city", label: "City", searchable: true, options: cityOptions.map((c) => ({ id: c, label: c })) },
    { key: "state", label: "State", searchable: true, options: stateOptions.map((s) => ({ id: s, label: s })) },
  ], [cityOptions, stateOptions]);

  const filterMenuSelected = useMemo(() => ({
    city: appliedFilters.city ? [appliedFilters.city] : [],
    state: appliedFilters.state ? [appliedFilters.state] : [],
  }), [appliedFilters]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    const one = (v?: string[]) => (v?.length ? v[v.length - 1] : "");
    setAppliedFilters({ city: one(next.city), state: one(next.state) });
    setCurrentPage(1);
  };

  const filtered = useMemo(
    () =>
      suppliers.filter((s) => {
        const q = search.toLowerCase();
        const matchesSearch = !q ||
          s.name.toLowerCase().includes(q) ||
          (s.first_name?.toLowerCase().includes(q) ?? false) ||
          (s.last_name?.toLowerCase().includes(q) ?? false) ||
          (s.email?.toLowerCase().includes(q) ?? false);
        const matchesCity = !appliedFilters.city || s.city === appliedFilters.city;
        const matchesState = !appliedFilters.state || s.state === appliedFilters.state;
        return matchesSearch && matchesCity && matchesState;
      }),
    [search, suppliers, appliedFilters],
  );

  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleClearSearch = () => setSearch("");

  const openCreatePanel = () => {
    setSelectedSupplierId(null);
    setPanelMode("create");
  };

  const openEditPanel = (id: string) => {
    setSelectedSupplierId(id);
    setPanelMode("edit");
  };

  const closePanel = () => {
    setPanelMode(null);
    setSelectedSupplierId(null);
  };

  const openPayout = (supplierId?: string) => {
    setPayoutSupplierId(supplierId);
    setPayoutOpen(true);
  };

  const closePayout = () => {
    setPayoutOpen(false);
    setPayoutSupplierId(undefined);
  };

  return (
    <div className="suppliers-list-page">
      <header className="suppliers-list-page__header">
        <div>
          <h1>
            Suppliers
            <span className="count-badge">{filtered.length}</span>
          </h1>
          <p>
            Add and manage details of your suppliers. <LearnMoreLink topic="suppliers">Learn more</LearnMoreLink>
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-dark" iconLeft={<CashCoin size={14} />} onClick={() => openPayout()}>
            Create Payout
          </Button>
          <Button variant="dark" iconLeft={<PlusLg size={14} />} onClick={openCreatePanel}>
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
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
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
                <th>Contact person</th>
                <th>Email</th>
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
                  <td><Skeleton width="50%" height={12} /></td>
                  <td><Skeleton width="60%" height={12} /></td>
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
        ) : paginated.length > 0 ? (
          <table className="supplier-table">
            <thead>
              <tr>
                <th>Supplier name</th>
                <th>Contact person</th>
                <th>Email</th>
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
              {paginated.map((s) => {
                const sb = s as SupplierWithBalance;
                const status: SupplierPaymentStatus = sb.status ?? "paid";
                return (
                <tr
                  key={s.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/dashboard/catalog/inventory/suppliers/${s.id}`)}
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
                  <td>{[s.first_name, s.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td>{s.email || "—"}</td>
                  <td>{s.mobile_number || s.telephone_number || "—"}</td>
                  <td>{formatAmount(sb.total_purchase_amount ?? 0)}</td>
                  <td>{sb.pending_order_count ?? 0}</td>
                  <td>{formatAmount(sb.due_amount ?? 0)}</td>
                  <td>{fmtDate(sb.due_date)}</td>
                  <td>
                    <span className={`supplier-status-badge supplier-status-badge--${status}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <Dropdown align="end">
                      <Dropdown.Toggle
                        as="button"
                        bsPrefix="row-actions-toggle"
                        className="row-actions-toggle"
                        id={`supplier-row-actions-${s.id}`}
                      >
                        <ThreeDotsVertical size={16} />
                      </Dropdown.Toggle>
                      {/* strategy "fixed" — the table now scrolls horizontally
                          (see SuppliersListPage.scss), and the default
                          "absolute" popper strategy would get clipped by that
                          scroll container instead of floating above it. */}
                      <Dropdown.Menu
                        className="shadow-sm border-0 rounded-3 py-2"
                        style={{ minWidth: "160px" }}
                        popperConfig={{ strategy: "fixed" }}
                      >
                        <Dropdown.Item
                          onClick={() => openEditPanel(s.id)}
                          className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                        >
                          <PencilSquare size={14} /> Edit
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => openPayout(s.id)}
                          className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                        >
                          <CashCoin size={14} /> Payout
                        </Dropdown.Item>
                        <Dropdown.Item
                          onClick={() => { setDeletingSupplier(s); setDeleteInput(""); }}
                          className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-danger"
                        >
                          <Trash size={14} /> Delete
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
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
              <Button variant="dark" size="sm" iconLeft={<PlusLg size={13} />} onClick={openCreatePanel}>
                Add Supplier
              </Button>
            }
          />
        )}
      </main>

      {filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filtered.length}
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

      {panelMode && (
        <div className="supplier-panel-overlay" onClick={closePanel}>
          <div className="supplier-panel" onClick={(e) => e.stopPropagation()}>
            <AddSupplierPage
              panelMode
              supplierId={panelMode === "edit" ? selectedSupplierId ?? undefined : undefined}
              onClose={closePanel}
              onSaved={() => dispatch(fetchSuppliersThunk())}
            />
          </div>
        </div>
      )}

      <CreatePayoutModal
        show={payoutOpen}
        onClose={closePayout}
        supplierId={payoutSupplierId}
        onSuccess={() => dispatch(fetchSuppliersThunk())}
      />
    </div>
  );
};

export default SuppliersListPage;
