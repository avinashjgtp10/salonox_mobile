import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Shop,
  ThreeDotsVertical,
  PencilSquare,
  Trash,
  X,
} from "react-bootstrap-icons";
import { Dropdown } from "react-bootstrap";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuppliersThunk, deleteSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Supplier } from "../../../types/inventory.types";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import Pagination from "../../../components/ui/Pagination";
import { JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import AddSupplierPage from "./AddSupplierPage";
import "../styles/SuppliersListPage.scss";

interface FilterState {
  city: string;
  state: string;
}

const DEFAULT_FILTERS: FilterState = { city: "", state: "" };

const SuppliersListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { suppliers, loading } = useAppSelector((state) => state.inventory);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

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
        <button
          className="btn-add"
          onClick={openCreatePanel}
        >
          Add
        </button>
      </header>

      <div className="suppliers-list-page__controls">
        <div className="search-box">
          <Search className="search-icon-abs" size={18} />
          <input
            type="text"
            placeholder="Search suppliers by name, contact or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={handleClearSearch}
            >
              <X size={16} />
            </button>
          )}
        </div>
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
                <th className="actions-cell" style={{ width: "56px" }} />
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr
                  key={s.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openEditPanel(s.id)}
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
                      <Dropdown.Menu className="shadow-sm border-0 rounded-3 py-2" style={{ minWidth: "160px" }}>
                        <Dropdown.Item
                          onClick={() => openEditPanel(s.id)}
                          className="py-2 px-3 fw-medium d-flex align-items-center gap-2 text-dark"
                        >
                          <PencilSquare size={14} /> Edit
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
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><Shop size={44} /></div>
            <h3>No suppliers yet</h3>
            <p>
              <a onClick={openCreatePanel}>
                Click here to add a supplier now.
              </a>
            </p>
          </div>
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
    </div>
  );
};

export default SuppliersListPage;
