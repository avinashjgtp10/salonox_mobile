import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Sliders,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XLg,
  BoxSeam,
} from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import "../styles/StockOrdersListPage.scss";

interface StockOrder {
  id: string;
  number: string;
  supplier: string;
  status: "Draft" | "Ordered" | "Received" | "Canceled";
  orderedOn: string;
  receivedOn: string;
  totalCost: string;
}

const MOCK_ORDERS: StockOrder[] = Array.from({ length: 28 }, (_, i) => {
  const statuses: StockOrder["status"][] = [
    "Draft",
    "Ordered",
    "Received",
    "Canceled",
  ];
  const suppliers = [
    "Beauty Care Inc",
    "Style Brands",
    "ProHair Ltd",
    "Luxe Beauty",
    "GlowSkin Co",
    "NailArt Pro",
    "ColorMix India",
  ];
  const status = statuses[i % 4];
  return {
    id: `${28 - i}`,
    number: `#SO-${String(28 - i).padStart(4, "0")}`,
    supplier: suppliers[i % suppliers.length],
    status,
    orderedOn: `${(i % 28) + 1} Mar 2026`,
    receivedOn: status === "Received" ? `${(i % 28) + 2} Mar 2026` : "-",
    totalCost: `₹${(Math.floor(Math.random() * 15000) + 1500).toLocaleString()}`,
  };
});

const ITEMS_PER_PAGE = 8;

const StockOrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sorter, setSorter] = useState("Updated (newest first)");
  const [currentPage, setCurrentPage] = useState(1);
  // Toggle: set to false to see the empty state, true to see mock data
  const [hasOrders] = useState(false);

  const filtered = useMemo(() => {
    return MOCK_ORDERS.filter((o) => {
      const matchSearch =
        o.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === "All statuses" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const paginated = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
      ),
    [filtered, currentPage],
  );

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Draft":
        return "badge-draft";
      case "Ordered":
        return "badge-ordered";
      case "Received":
        return "badge-received";
      case "Canceled":
        return "badge-canceled";
      default:
        return "";
    }
  };

  return (
    <div className="stock-orders-page">
      <div className="container-fluid">
        {/* HEADER */}
        <header className="stock-orders-page__header">
          <div className="header-left">
            <h1>
              Stock orders{" "}
              <span className="count-badge">
                {hasOrders ? filtered.length : 0}
              </span>
            </h1>
            <p className="subtext mb-0">
              Add and manage your stock orders. <LearnMoreLink topic="stock-orders">Learn more</LearnMoreLink>
            </p>
          </div>

        </header>

        {/* EMPTY STATE */}
        {!hasOrders && (
          <div className="stock-orders-page__empty-panel">
            <div className="empty-illustration">
              <svg
                viewBox="0 0 80 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="80"
                height="64"
              >
                <ellipse cx="40" cy="32" rx="32" ry="26" fill="#ede9fe" />
                <rect
                  x="20"
                  y="18"
                  width="40"
                  height="30"
                  rx="6"
                  fill="#c4b5fd"
                />
                <rect
                  x="26"
                  y="24"
                  width="28"
                  height="4"
                  rx="2"
                  fill="#7c3aed"
                  opacity="0.5"
                />
                <rect
                  x="26"
                  y="32"
                  width="18"
                  height="4"
                  rx="2"
                  fill="#7c3aed"
                  opacity="0.3"
                />
                <circle cx="56" cy="20" r="8" fill="#8b5cf6" />
                <path
                  d="M52 20h8M56 16v8"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3>No products created yet</h3>
            <p>Add products in minutes and start creating stock orders.</p>
            <button
              className="btn-learn"
              onClick={() => navigate("/dashboard/catalog/products")}
            >
              Learn more
            </button>
          </div>
        )}

        {/* TOOLBAR, TABLE, PAGINATION */}
        {hasOrders && (
          <>
            <div className="stock-orders-page__toolbar">
              <div className="d-flex gap-3 align-items-center flex-grow-1">
                <div className="search-wrapper">
                  <Search className="search-icon" size={16} />
                  <input
                    type="text"
                    placeholder="Search by order number or supplier"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  className={`btn-filter ${isFilterOpen ? "active" : ""}`}
                  onClick={() => setIsFilterOpen(true)}
                >
                  Filters <Sliders size={14} />
                </button>
              </div>

              <div className="dropdown">
                <button
                  className="btn-sorter dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {sorter} <ChevronDown size={13} />
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                  {[
                    "Updated (newest first)",
                    "Updated (oldest first)",
                    "Order date (newest first)",
                    "Order date (oldest first)",
                    "Supplier (A-Z)",
                    "Supplier (Z-A)",
                  ].map((s) => (
                    <li key={s}>
                      <button
                        className="dropdown-item"
                        onClick={() => setSorter(s)}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* TABLE */}
            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>
                      Order number <ChevronDown size={11} className="ms-1" />
                    </th>
                    <th>
                      Supplier <ChevronDown size={11} className="ms-1" />
                    </th>
                    <th>
                      Status <ChevronDown size={11} className="ms-1" />
                    </th>
                    <th>
                      Ordered on <ChevronDown size={11} className="ms-1" />
                    </th>
                    <th>
                      Received on <ChevronDown size={11} className="ms-1" />
                    </th>
                    <th>
                      Total cost <ChevronDown size={11} className="ms-1" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((order) => (
                    <tr key={order.id} className="cursor-pointer">
                      <td className="fw-semibold">{order.number}</td>
                      <td>{order.supplier}</td>
                      <td>
                        <span
                          className={`order-status-badge ${getStatusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td>{order.orderedOn}</td>
                      <td className="text-secondary">{order.receivedOn}</td>
                      <td className="fw-semibold">{order.totalCost}</td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        <div className="mb-2">
                          <BoxSeam
                            size={32}
                            className="text-secondary opacity-50"
                          />
                        </div>
                        <p className="mb-1 fw-medium">No stock orders found</p>
                        <small>Try adjusting your search or filters.</small>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="stock-orders-page__pagination">
              <button
                className={`pag-btn ${currentPage === 1 ? "disabled" : ""}`}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={15} />
              </button>
              <span className="pag-label">
                {currentPage} of {totalPages}
              </span>
              <button
                className={`pag-btn ${currentPage === totalPages ? "disabled" : ""}`}
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* FILTER MODAL */}
      {isFilterOpen && (
        <div className="modal-overlay" onClick={() => setIsFilterOpen(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal__header">
              <h4>Filters</h4>
              <button
                className="close-btn"
                onClick={() => setIsFilterOpen(false)}
              >
                <XLg size={18} />
              </button>
            </div>

            <div className="filter-modal__body">
              <label>Status</label>
              <div className="dropdown w-100">
                <button
                  className="btn btn-outline-secondary w-100 text-start d-flex justify-content-between align-items-center px-3 py-2 rounded-3"
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                >
                  {statusFilter} <ChevronDown size={15} />
                </button>
                {filterDropdownOpen && (
                  <ul className="dropdown-menu w-100 show shadow-sm border mt-1">
                    {[
                      "All statuses",
                      "Draft",
                      "Ordered",
                      "Received",
                      "Canceled",
                    ].map((s) => (
                      <li key={s}>
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

            <div className="filter-modal__footer">
              <button
                className="btn-clear"
                onClick={() => setStatusFilter("All statuses")}
              >
                Clear filters
              </button>
              <button
                className="btn-apply"
                onClick={() => setIsFilterOpen(false)}
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

export default StockOrdersListPage;
