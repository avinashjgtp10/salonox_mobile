import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Sliders,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XLg,
} from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import "../styles/StocktakesListPage.scss";

// Types
interface Stocktake {
  id: string;
  name: string;
  status: "In progress" | "Paused" | "Review" | "Completed" | "Canceled";
  startedOn: string;
  completedOn: string;
}

const mockStocktakes: Stocktake[] = Array.from({ length: 45 }, (_, i) => ({
  id: `${45 - i}`,
  name: `Stocktake #${45 - i}`,
  status: ["In progress", "Paused", "Review", "Completed", "Canceled"][
    i % 5
  ] as any,
  startedOn: "20 Mar 2026",
  completedOn: i % 5 === 3 || i % 5 === 4 ? "21 Mar 2026" : "-",
}));

const StocktakesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All statuses");

  // Sorter
  const [sorter, setSorter] = useState("Updated (newest first)");

  // Filter status dropdown inside modal
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Derived state for filtering and pagination
  const filteredStocktakes = useMemo(() => {
    return mockStocktakes.filter((stocktake) => {
      const matchesSearch = stocktake.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "All statuses" || stocktake.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStocktakes.length / itemsPerPage),
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const paginatedStocktakes = useMemo(() => {
    return filteredStocktakes.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    );
  }, [filteredStocktakes, currentPage]);

  // Status map
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
        return "badge-default";
    }
  };

  return (
    <div className="stocktakes-page">
      <div className="container-fluid py-4 px-4">
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h1 className="fw-bold mb-1 fs-3">
              Stocktakes{" "}
              <span className="fs-6 fw-normal text-muted badge rounded-pill bg-light border ms-2">
                {filteredStocktakes.length}
              </span>
            </h1>
            <p className="text-muted mb-0">
              Count and record the amount and value of stock your business
              holds.{" "}
              <a href="#" className="text-primary text-decoration-none">
                Learn more
              </a>
            </p>
          </div>
          <button
            className="btn btn-dark rounded-pill px-4 py-2 fw-medium shadow-sm"
            onClick={() =>
              navigate("/dashboard/catalog/inventory/stocktakes/new")
            }
          >
            Add
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex gap-3 align-items-center flex-grow-1">
            <div className="position-relative search-input-wrapper">
              <Search
                className="position-absolute text-muted"
                style={{ left: 16, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                className="form-control ps-5 rounded-pill"
                placeholder="Search by stocktake name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              className={`btn btn-outline-secondary rounded-pill d-flex align-items-center gap-2 ${isFilterModalOpen ? "active" : ""}`}
              onClick={() => setIsFilterModalOpen(true)}
            >
              Filters <Sliders size={14} />
            </button>
          </div>

          <div>
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary rounded-pill d-flex align-items-center gap-2"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {sorter} <ChevronDown size={14} />
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Stocktake name (A-Z)")}
                  >
                    Stocktake name (A-Z)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Stocktake name (Z-A)")}
                  >
                    Stocktake name (Z-A)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Location (Ascending)")}
                  >
                    Location (Ascending)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Location (Descending)")}
                  >
                    Location (Descending)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Status (Ascending)")}
                  >
                    Status (Ascending)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Status (Descending)")}
                  >
                    Status (Descending)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Performed by (Ascending)")}
                  >
                    Performed by (Ascending)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Performed by (Descending)")}
                  >
                    Performed by (Descending)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Start date (oldest first)")}
                  >
                    Start date (oldest first)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Start date (newest first)")}
                  >
                    Start date (newest first)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("End date (oldest first)")}
                  >
                    End date (oldest first)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("End date (newest first)")}
                  >
                    End date (newest first)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Updated (oldest first)")}
                  >
                    Updated (oldest first)
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setSorter("Updated (newest first)")}
                  >
                    Updated (newest first)
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-responsive">
          <table className="table table-hover align-middle custom-table">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>
                  Stocktake name{" "}
                  <ChevronDown size={12} className="ms-1 cursor-pointer" />
                </th>
                <th style={{ width: "20%" }}>
                  Status{" "}
                  <ChevronDown size={12} className="ms-1 cursor-pointer" />
                </th>
                <th style={{ width: "20%" }}>
                  Started on{" "}
                  <ChevronDown size={12} className="ms-1 cursor-pointer" />
                </th>
                <th style={{ width: "20%" }}>
                  Completed on{" "}
                  <ChevronDown size={12} className="ms-1 cursor-pointer" />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedStocktakes.map((stocktake, idx) => (
                <tr key={idx} className="cursor-pointer">
                  <td className="fw-medium text-dark">{stocktake.name}</td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(stocktake.status)}`}
                    >
                      {stocktake.status}
                    </span>
                  </td>
                  <td className="text-dark">{stocktake.startedOn}</td>
                  <td className="text-secondary">{stocktake.completedOn}</td>
                </tr>
              ))}
              {paginatedStocktakes.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">
                    <p className="mb-0 fs-5 mb-2">No stocktakes found</p>
                    <small>Try adjusting your search or filters.</small>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="d-flex justify-content-center align-items-center mt-5 mb-3 gap-3">
          <button
            className={`btn ${currentPage === 1 ? "btn-light text-muted" : "btn-outline-secondary"} rounded-circle p-2`}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-muted fs-6">
            {currentPage} of {totalPages}
          </span>
          <button
            className={`btn ${currentPage === totalPages ? "btn-light text-muted" : "btn-outline-secondary"} rounded-circle p-2`}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* FILTER MODAL OVERLAY */}
      {isFilterModalOpen && (
        <div
          className="modal-backdrop-custom d-flex justify-content-center align-items-center"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="filter-modal bg-white rounded-4 shadow-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0">Filters</h4>
              <button
                className="btn-close-custom"
                onClick={() => setIsFilterModalOpen(false)}
              >
                <XLg size={20} />
              </button>
            </div>

            <div className="mb-5 position-relative">
              <label className="form-label fw-medium text-dark mb-2">
                Status
              </label>

              <div className="dropdown w-100">
                <button
                  className="btn btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center px-3 py-2 rounded-3"
                  type="button"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                >
                  {statusFilter}
                  <ChevronDown size={16} />
                </button>
                {filterDropdownOpen && (
                  <ul className="dropdown-menu w-100 show shadow-sm border mt-1">
                    {[
                      "All statuses",
                      "In progress",
                      "Paused",
                      "Review",
                      "Completed",
                      "Canceled",
                    ].map((s, i) => (
                      <li key={i}>
                        <button
                          className={`dropdown-item py-2 ${statusFilter === s ? "active bg-light text-dark fw-medium" : ""}`}
                          onClick={() => {
                            setStatusFilter(s);
                            setFilterDropdownOpen(false);
                          }}
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="d-flex justify-content-between gap-3 mt-4 pt-4 border-top">
              <button
                className="btn btn-light fw-medium px-4 py-2 rounded-pill flex-grow-1"
                onClick={() => setStatusFilter("All statuses")}
              >
                Clear filters
              </button>
              <button
                className="btn btn-dark fw-medium px-4 py-2 rounded-pill flex-grow-1"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StocktakesListPage;
