import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ThreeDotsVertical,
  PencilSquare,
  Trash3,
  X,
} from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchSuppliersThunk, deleteSupplierThunk } from "../../../middleware/inventory/inventory.thunk";
import type { Supplier } from "../../../types/inventory.types";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import "../styles/SuppliersListPage.scss";

const ITEMS_PER_PAGE = 8;

const SuppliersListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { suppliers, loading, error } = useAppSelector((state) => state.inventory);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Delete modal state
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchSuppliersThunk());
  }, [dispatch]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-wrap")) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuId]);

  const filtered = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          (s.first_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (s.last_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (s.email?.toLowerCase().includes(search.toLowerCase()) ?? false),
      ),
    [search, suppliers],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => setCurrentPage(1), [search]);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      await dispatch(deleteSupplierThunk(id));
      setActiveMenuId(null);
    }
  };

  return (
    <div className="suppliers-list-page">
      {/* HEADER */}
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
          onClick={() => navigate("/dashboard/catalog/inventory/suppliers/new")}
        >
          Add
        </button>
      </header>

      {/* SEARCH */}
      <div className="suppliers-list-page__toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search suppliers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      {paginated.length > 0 ? (
        <div className="table-responsive">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Supplier name</th>
                <th>Contact person</th>
                <th>Email</th>
                <th>Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr
                  key={s.id}
                  className={`cursor-pointer ${activeMenuId === s.id ? "row-active" : ""}`}
                  onClick={() =>
                    navigate(`/dashboard/catalog/inventory/suppliers/edit/${s.id}`)
                  }
                >
                  <td className="fw-semibold">{s.name}</td>
                  <td>{s.first_name} {s.last_name}</td>
                  <td className="text-secondary">{s.email || "—"}</td>
                  <td className="text-secondary">{s.mobile_number || s.telephone_number || "—"}</td>
                  <td
                    className="actions-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="dropdown-wrap">
                      <button 
                        type="button"
                        className={`btn-icon ${activeMenuId === s.id ? "is-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === s.id ? null : s.id);
                        }}
                      >
                        <ThreeDotsVertical size={16} />
                      </button>
                      {activeMenuId === s.id && (
                        <div className="actions-dropdown">
                          <button
                            type="button"
                            className="actions-dropdown__item actions-dropdown__item--edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              navigate(`/dashboard/catalog/inventory/suppliers/edit/${s.id}`);
                            }}
                          >
                            <PencilSquare size={15} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="actions-dropdown__item actions-dropdown__item--delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              setDeletingSupplier(s);
                              setDeleteInput("");
                            }}
                          >
                            <Trash3 size={15} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🚚</div>
          <h3>No suppliers yet</h3>
          <p>
            <a
              href="#"
              onClick={() =>
                navigate("/dashboard/catalog/inventory/suppliers/new")
              }
            >
              Click here to add a supplier now.
            </a>
          </p>
        </div>
      )}

      {/* PAGINATION */}
      {filtered.length > 0 && (
        <div className="suppliers-list-page__pagination">
          <button
            className="pag-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span className="pag-label">
            {currentPage} of {totalPages}
          </span>
          <button
            className="pag-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* DELETE SUPPLIER MODAL */}
      {deletingSupplier && (
        <div
          className="supplier-modal-overlay"
          onClick={() => setDeletingSupplier(null)}
        >
          <div
            className="supplier-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="supplier-modal__header">
              <h3>Delete supplier</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setDeletingSupplier(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="supplier-modal__body">
              <p className="modal-description">
                Are you sure you want to delete <strong>{deletingSupplier.name}</strong>? This action cannot be undone.
              </p>
              <div className="modal-field">
                <label>Type DELETE to confirm</label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="supplier-modal__footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDeletingSupplier(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                disabled={deleteInput !== "DELETE" || isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  await dispatch(deleteSupplierThunk(deletingSupplier.id));
                  setIsDeleting(false);
                  setDeletingSupplier(null);
                }}
              >
                {isDeleting ? "Deleting…" : "Delete supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersListPage;
