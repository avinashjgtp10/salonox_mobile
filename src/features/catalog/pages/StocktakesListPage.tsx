import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Sliders,
  ChevronLeft,
  ChevronRight,
  XLg,
  Plus,
  ThreeDotsVertical,
  Pencil,
  Trash,
} from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchStocktakesThunk, deleteStocktakeThunk } from "../../../middleware/inventory/inventory.thunk";
import { fetchBranchesThunk } from "../../../middleware/salon/salon.thunk";
import StocktakeDetailsDrawer from "../components/StocktakeDetailsDrawer";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import Dropdown from "../../../components/ui/Dropdown";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "../styles/StocktakesListPage.scss";

// Types - Keeping these but mapping from state if needed

const StocktakesListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentSalon, branches } = useSelector((state: RootState) => state.salon);
  const { stocktakes, loading } = useSelector((state: RootState) => state.inventory);

  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [sorter, setSorter] = useState("Start date (newest first)");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal / Menu state
  const [selectedStocktakeId, setSelectedStocktakeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [stocktakeToDelete, setStocktakeToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentSalon?.id) {
      dispatch(fetchBranchesThunk(currentSalon.id));
    }
  }, [dispatch, currentSalon?.id]);

  useEffect(() => {
    const activeBranchId = branches.find(b => b.id !== currentSalon?.id)?.id || branches[0]?.id;
    if (activeBranchId) {
      dispatch(fetchStocktakesThunk({ branchId: activeBranchId }));
    }
  }, [dispatch, branches, currentSalon?.id]);

  // Derived state for filtering and pagination
  const filteredStocktakes = useMemo(() => {
    let result = stocktakes.filter((stocktake) => {
      const name = (stocktake.name || `Stocktake #${stocktake.id.slice(0, 4)}`).toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All statuses" || stocktake.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sorter) {
        case "Stocktake name (A-Z)":
          return (a.name || "").localeCompare(b.name || "");
        case "Stocktake name (Z-A)":
          return (b.name || "").localeCompare(a.name || "");
        case "Status (Ascending)":
          return a.status.localeCompare(b.status);
        case "Status (Descending)":
          return b.status.localeCompare(a.status);
        case "Start date (newest first)":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "End date (newest first)":
          const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
          const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
          return dateB - dateA;
        default:
          return 0;
      }
    });

    return result;
  }, [stocktakes, searchTerm, statusFilter, sorter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStocktakes.length / itemsPerPage),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sorter]);

  const paginatedStocktakes = useMemo(() => {
    return filteredStocktakes.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredStocktakes, currentPage]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Review":
        return "badge-review";
      case "In progress":
        return "badge-in-progress";
      case "Paused":
        return "badge-paused";
      case "Completed":
        return "badge-completed";
      case "Canceled":
        return "badge-canceled";
      default:
        return "";
    }
  };

  return (
    <div className="stocktakes-page">
      {overlay}
      {/* HEADER */}
      <header className="stocktakes-page__header">
        <div className="title-area">
          <h1>
            Stocktakes
            <span className="count-badge">
              {filteredStocktakes.length} total
            </span>
          </h1>
          <p>
            Count and record the amount and value of stock your business holds.{" "}
            <LearnMoreLink topic="stocktakes">Learn more</LearnMoreLink>
          </p>
        </div>
        <button
          className="btn-add"
          onClick={() =>
            navigate("/dashboard/catalog/inventory/stocktakes/new")
          }
        >
          <Plus size={20} /> Add stocktake
        </button>
      </header>

      {/* TOOLBAR */}
      <div className="stocktakes-page__toolbar">
        <div className="search-filter-group">
          <div className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by stocktake name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className={`btn-filter ${isFilterModalOpen ? "active" : ""}`}
            onClick={() => setIsFilterModalOpen(true)}
          >
            <Sliders size={18} /> Filters
          </button>
        </div>

        <div className="dropdown">
          <button
            className="btn-sort"
            type="button"
            data-bs-toggle="dropdown"
          >
            {sorter}
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0">
            {[
              "Stocktake name (A-Z)",
              "Stocktake name (Z-A)",
              "Status (Ascending)",
              "Status (Descending)",
              "Start date (newest first)",
              "End date (newest first)",
            ].map((option) => (
              <li key={option}>
                <button
                  className="dropdown-item py-2 px-3 fw-medium"
                  onClick={() => setSorter(option)}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CONTENT (TABLE) */}
      <div className="stocktakes-page__content">
        <table className="stocktake-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Stocktake name</th>
              <th style={{ width: "15%" }}>Status</th>
              <th style={{ width: "20%" }}>Started on</th>
              <th style={{ width: "20%" }}>Completed on</th>
              <th style={{ width: "10%" }} className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStocktakes.map((stocktake) => (
              <tr
                key={stocktake.id}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedStocktakeId(stocktake.id);
                  setIsDrawerOpen(true);
                }}
              >
                <td className="name-cell">{stocktake.name || `Stocktake #${stocktake.id.slice(0, 4)}`}</td>
                <td>
                  <span className={`status-pill ${getStatusClass(stocktake.status)}`}>
                    {stocktake.status}
                  </span>
                </td>
                <td className="date-cell">{formatDateDDMMYYYY(new Date(stocktake.created_at))}</td>
                <td className="date-cell">{stocktake.completed_at ? formatDateDDMMYYYY(new Date(stocktake.completed_at)) : "-"}</td>
                <td className="text-end" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown position-relative">
                    <button
                      className="btn-ellipsis"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === stocktake.id ? null : stocktake.id);
                      }}
                    >
                      <ThreeDotsVertical size={20} />
                    </button>

                    {openMenuId === stocktake.id && (
                      <div className="custom-dropdown-menu show shadow-lg animated-in">
                        <button
                          className="dropdown-item"
                          onClick={() => navigate(`/dashboard/catalog/inventory/stocktakes/edit/${stocktake.id}`)}
                        >
                          <Pencil size={14} className="me-2" /> Edit
                        </button>
                        <hr className="my-1" />
                        <button
                          className="dropdown-item text-danger"
                          onClick={() => {
                            setStocktakeToDelete(stocktake);
                            setOpenMenuId(null);
                          }}
                        >
                          <Trash size={14} className="me-2" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && paginatedStocktakes.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-5 text-muted">
                  <div className="py-4">
                    <XLg size={48} className="mb-3 opacity-25" />
                    <p className="mb-0 fs-5 fw-bold text-dark">
                      No stocktakes found
                    </p>
                    <p className="small">Try adjusting your search or filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="stocktakes-page__pagination">
            <button
              className="nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {stocktakeToDelete && (
        <div className="delete-modal-overlay" onClick={() => setStocktakeToDelete(null)}>
          <div className="delete-modal-content animated-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center p-4">
              <div className="icon-trash-circle mb-3"><Trash size={32} /></div>
              <h2 className="mb-2">Delete stocktake?</h2>
              <p className="text-muted">
                Are you sure you want to delete <strong>{stocktakeToDelete.name || "this stocktake"}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <footer>
              <button
                className="btn-cancel"
                onClick={() => setStocktakeToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn-delete"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await dispatch(deleteStocktakeThunk(stocktakeToDelete.id)).unwrap();
                    showSuccess("Stocktake deleted successfully");
                    setStocktakeToDelete(null);
                  } catch (err: any) {
                    showError(err || "Failed to delete stocktake");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </footer>
          </div>
        </div>
      )}
      {isFilterModalOpen && (
        <div className="filter-modal-overlay" onClick={() => setIsFilterModalOpen(false)}>
          <div className="filter-modal-content" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Filters</h2>
              <button className="close-btn" onClick={() => setIsFilterModalOpen(false)}>
                <XLg size={20} />
              </button>
            </header>

            <div className="form-group">
              <label>Status</label>
              <Dropdown
                className="form-select border-0 bg-light rounded-3 py-2 px-3 shadow-none"
                style={{ appearance: "none", background: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" fill=\"gray\" class=\"bi bi-chevron-down\" viewBox=\"0 0 16 16\"><path fill-rule=\"evenodd\" d=\"M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z\"/></svg>') no-repeat right 12px center", backgroundSize: "16px" }}
                searchable={false}
                value={statusFilter}
                options={[
                  "All statuses",
                  "In progress",
                  "Paused",
                  "Review",
                  "Completed",
                  "Canceled",
                ].map((s) => ({ id: s, name: s }))}
                onChange={setStatusFilter}
              />
            </div>

            <footer>
              <button
                className="btn-clear"
                onClick={() => {
                  setStatusFilter("All statuses");
                }}
              >
                Clear all
              </button>
              <button className="btn-apply" onClick={() => setIsFilterModalOpen(false)}>
                Apply filters
              </button>
            </footer>
          </div>
        </div>
      )}

      <StocktakeDetailsDrawer
        stocktakeId={selectedStocktakeId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};

export default StocktakesListPage;
