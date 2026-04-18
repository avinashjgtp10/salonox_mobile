import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ChevronDown, ArrowRepeat, Search, FileEarmarkText, FiletypeXlsx } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";

// UI Components
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import "../styles/MembershipsPage.scss";

import type { AppDispatch, RootState } from "../../../store/store";
import { fetchMembershipsThunk, exportMembershipsCsvThunk, exportMembershipsExcelThunk } from "../../../middleware/membership/membership.thunk";
import type { Membership } from "../../../services/api/endpoints/memberships.endpoints";

const ROWS_PER_PAGE = 10;

export default function MembershipsPage() {
  const dispatch    = useDispatch<AppDispatch>();
  const navigate    = useNavigate();

  // ── Redux ────────────────────────────────────────────────────────────────
  const memberships = useSelector((s: RootState) => s.memberships.items as Membership[]);
  const total       = useSelector((s: RootState) => s.memberships.total);
  const isLoading   = useSelector((s: RootState) => s.memberships.loading);

  // ── State ────────────────────────────────────────────────────────────────
  const [showOptions, setShowOptions] = useState(false);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const optionsRef = useRef<HTMLDivElement>(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMembershipsThunk());
  }, [dispatch]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filtered + paginated ─────────────────────────────────────────────────
  const filtered = memberships.filter((m) => {
    const q = searchTerm.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  return (
    <div className="memberships-page container-fluid">
      {/* ── HEADER ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1">Memberships sold</h3>
          <p className="text-muted small mb-0">
            View and filter memberships purchased by your clients.{" "}
            <a href="#" className="text-primary text-decoration-none">Learn more</a>
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <div className="position-relative" ref={optionsRef}>
            <Button
              variant="outline-dark"
              pill
              onClick={() => setShowOptions(!showOptions)}
              iconRight={
                <ChevronDown
                  size={14}
                  className={`ms-1 transition-all ${showOptions ? "rotate-180" : ""}`}
                />
              }
            >
              Options
            </Button>

            {showOptions && (
              <div
                className="membership-options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden"
                style={{ minWidth: "200px" }}
              >
                <div className="px-3 py-2 small fw-bold text-muted border-bottom">Export</div>
                <Button
                  variant="ghost"
                  fullWidth
                  className="text-start p-2 rounded-0 d-flex align-items-center"
                  onClick={() => { dispatch(exportMembershipsCsvThunk()); setShowOptions(false); }}
                >
                  <FileEarmarkText size={15} className="text-primary me-2" />
                  CSV
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  className="text-start p-2 rounded-0 d-flex align-items-center"
                  onClick={() => { dispatch(exportMembershipsExcelThunk()); setShowOptions(false); }}
                >
                  <FiletypeXlsx size={15} className="text-success me-2" />
                  Excel
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="dark"
            pill
            className="px-4 fw-bold"
            onClick={() => navigate("/dashboard/catalog/memberships")}
          >
            Set up memberships
          </Button>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="mb-4" style={{ maxWidth: "380px" }}>
        <div className="memberships-search">
          <Search size={14} className="memberships-search__icon" />
          <input
            type="text"
            placeholder="Search memberships…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="memberships-search__input"
          />
        </div>
      </div>

      {/* ── TABLE or EMPTY STATE ── */}
      {isLoading ? (
        <Card
          className="text-center py-5 border-0 rounded-4 shadow-sm d-flex flex-column align-items-center justify-content-center"
          style={{ minHeight: "300px" }}
        >
          <div className="spinner-border text-muted" role="status" />
          <p className="text-muted small mt-3 mb-0">Loading memberships…</p>
        </Card>
      ) : paginated.length > 0 ? (
        <>
          <div className="memberships-table-wrapper rounded-4 shadow-sm border bg-white overflow-hidden mb-4">
            <table className="memberships-table w-100">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sessions</th>
                  <th>Valid For</th>
                  <th>Online Sales</th>
                  <th className="text-end">Price</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((m) => (
                  <tr key={m.id} className="memberships-table-row">
                    <td>
                      <div className="fw-bold small d-flex align-items-center gap-2">
                        <span
                          className="memberships-color-dot"
                          style={{ background: m.colour || "#6b717e" }}
                        />
                        {m.name}
                      </div>
                      {m.description && (
                        <div className="text-muted" style={{ fontSize: "12px" }}>{m.description}</div>
                      )}
                    </td>
                    <td className="small text-muted">
                      {m.sessionType === "unlimited" ? "Unlimited" : `${m.numberOfSessions ?? "—"} sessions`}
                    </td>
                    <td className="small text-muted">{m.validFor}</td>
                    <td className="small">
                      <span className={`memberships-status-badge ${m.enableOnlineSales ? "badge-active" : "badge-inactive"}`}>
                        {m.enableOnlineSales ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="text-end fw-bold small">
                      ₹{Number(m.price || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex align-items-center justify-content-between">
            <div className="small text-muted">
              Viewing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} memberships
            </div>
            {totalPages > 1 && (
              <div className="d-flex gap-1">
                <button
                  className="memberships-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`memberships-page-btn${currentPage === page ? " active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >{page}</button>
                ))}
                <button
                  className="memberships-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >Next →</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <Card
          className="text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-5 d-flex flex-column align-items-center justify-content-center flex-grow-1"
          style={{ minHeight: "400px" }}
        >
          <div className="mb-4">
            <div
              className="d-flex align-items-center justify-content-center mx-auto empty-state-icon"
              style={{ width: "60px", height: "60px", borderRadius: "15px", background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)" }}
            >
              <ArrowRepeat size={30} className="text-white" />
            </div>
          </div>
          <h4 className="fw-bold mb-2 text-dark h5">
            {searchTerm ? "No memberships found" : "No memberships created yet"}
          </h4>
          <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: "400px" }}>
            {searchTerm
              ? "Try a different search term."
              : "Add memberships in minutes and start selling them online and via your store."}
          </p>
          {!searchTerm && (
            <Button
              variant="outline-dark"
              pill
              className="px-4 fw-bold"
              onClick={() => navigate("/dashboard/catalog/memberships")}
            >
              Set up now
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
