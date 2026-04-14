import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, Search, Sliders, CardList } from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import {
  fetchMembershipsThunk,
  deleteMembershipThunk,
  exportMembershipsCsvThunk,
  exportMembershipsPdfThunk,
  exportMembershipsExcelThunk,           // ← ADD
} from "../../../middleware/membership/membership.thunk";
import {
  selectMemberships,
  selectMembershipsLoading,
  selectMembershipsError,
  selectMembershipsTotal,
} from "../../../store/selectors/membership.selectors";
import MembershipFilterDrawer from "../components/MembershipFilterDrawer";
import "../styles/MembershipsListPage.scss";

const PAGE_SIZE = 20;

interface Filters {
  sessions:        string;
  payment:         string;
  validFor:        string;
  onlyAllServices: boolean;
}

const DEFAULT_FILTERS: Filters = {
  sessions:        "Any number of sessions",
  payment:         "All",
  validFor:        "Any period",
  onlyAllServices: false,
};

const MembershipsListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const memberships = useSelector(selectMemberships);
  const loading     = useSelector(selectMembershipsLoading);
  const error       = useSelector(selectMembershipsError);
  const total       = useSelector(selectMembershipsTotal);

  const [searchQuery, setSearchQuery]           = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters]                   = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage]                         = useState(1);
  const [exporting, setExporting] = useState<"csv" | "excel" | "pdf" | null>(null); // ← updated type

  const buildQuery = useCallback(() => ({
    search:      searchQuery.trim() || undefined,
    sessionType: filters.sessions !== "Any number of sessions"
                   ? filters.sessions.replace(" sessions", "").toLowerCase()
                   : undefined,
    validFor:    filters.validFor !== "Any period" ? filters.validFor : undefined,
    page,
    limit:       PAGE_SIZE,
  }), [searchQuery, filters, page]);

  useEffect(() => {
    dispatch(fetchMembershipsThunk(buildQuery()));
  }, [dispatch, buildQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this membership?")) return;
    await dispatch(deleteMembershipThunk(id));
    dispatch(fetchMembershipsThunk(buildQuery()));
  };

  const handleExportCsv = async () => {
    setExporting("csv");
    await dispatch(exportMembershipsCsvThunk(buildQuery()));
    setExporting(null);
  };

  const handleExportExcel = async () => {           // ← ADD
    setExporting("excel");
    await dispatch(exportMembershipsExcelThunk(buildQuery()));
    setExporting(null);
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    await dispatch(exportMembershipsPdfThunk(buildQuery()));
    setExporting(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilterCount = [
    filters.sessions !== "Any number of sessions",
    filters.validFor !== "Any period",
    filters.onlyAllServices,
  ].filter(Boolean).length;

  return (
    <div className="memberships-list-page">
      <header className="memberships-list-page__header">
        <div className="header-left">
          <h1>Memberships</h1>
        </div>
        <div className="header-actions">
          <div className="dropdown">
            <button className="btn-options" data-bs-toggle="dropdown">
              Options <ChevronDown size={14} />
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 py-2">
              <li>
                <button className="dropdown-item py-2 px-3 fw-medium">
                  View sold memberships
                </button>
              </li>
              <li>
                <button className="dropdown-item py-2 px-3 fw-medium">
                  Upsell settings
                </button>
              </li>
              <li><hr className="dropdown-divider my-1" /></li>
              <li>
                <button
                  className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2"
                  onClick={handleExportCsv}
                  disabled={exporting !== null}
                >
                  <span>📄</span>
                  {exporting === "csv" ? "Downloading…" : "Download CSV"}
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2"
                  onClick={handleExportExcel}
                  disabled={exporting !== null}
                >
                  <span>📊</span>
                  {exporting === "excel" ? "Downloading…" : "Download Excel"}
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item py-2 px-3 fw-medium d-flex align-items-center gap-2"
                  onClick={handleExportPdf}
                  disabled={exporting !== null}
                >
                  <span>📑</span>
                  {exporting === "pdf" ? "Downloading…" : "Download PDF"}
                </button>
              </li>
            </ul>
          </div>
          <button
            className="btn-add"
            onClick={() => navigate("/dashboard/catalog/memberships/create")}
          >
            Add
          </button>
        </div>
      </header>

      <div className="memberships-list-page__controls">
        <div className="search-box">
          <Search className="search-icon-abs" size={18} />
          <input
            type="text"
            placeholder="Search by membership name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className={`filter-btn ${activeFilterCount > 0 ? "filter-btn--active" : ""}`}
          onClick={() => setShowFilterDrawer(true)}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          <Sliders size={16} />
        </button>
      </div>

      <main className="memberships-list-page__content">
        {loading && (
          <div className="text-center py-5 text-muted">Loading memberships…</div>
        )}
        {!loading && error && (
          <div className="text-center py-5 text-danger">{error}</div>
        )}
        {!loading && !error && (
          <table className="membership-table">
            <thead>
              <tr>
                <th>Membership name</th>
                <th>Valid for</th>
                <th>Sessions</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {memberships.length > 0 ? (
                memberships.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() =>
                      navigate(`/dashboard/catalog/memberships/${m.id}`)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td className="membership-name-cell">
                      <div
                        className="membership-icon"
                        style={{ background: m.colour + "22" }}
                      >
                        <CardList size={20} style={{ color: m.colour }} />
                      </div>
                      <div className="name-info">
                        <span className="name">{m.name}</span>
                        <span className="services">
                          {m.includedServices.length > 0
                            ? m.includedServices.map((s) => s.serviceName).join(", ")
                            : "All services"}
                        </span>
                      </div>
                    </td>
                    <td>{m.validFor}</td>
                    <td>
                      {m.sessionType === "unlimited"
                        ? "Unlimited"
                        : `${m.numberOfSessions ?? "–"} sessions`}
                    </td>
                    <td className="price-cell">
                      ₹{Number(m.price).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => handleDelete(e, m.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    No memberships found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>

      <footer className="memberships-list-page__pagination">
        <span className="page-info">
          {memberships.length} of {total} memberships
        </span>
        <div className="pagination-controls">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Prev
          </button>
          <span className="page-num">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next ›
          </button>
        </div>
      </footer>

      {showFilterDrawer && (
        <MembershipFilterDrawer
          onClose={() => setShowFilterDrawer(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
        />
      )}
    </div>
  );
};

export default MembershipsListPage;