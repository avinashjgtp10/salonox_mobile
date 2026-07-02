import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Search, PlusLg, Sliders, ChevronDown,
  PencilSquare, Trash3, FileEarmarkPdf,
  FileEarmarkExcel, FiletypeCsv, CardList,
  Award, CurrencyRupee, CheckCircleFill,
} from "react-bootstrap-icons";
import type { AppDispatch } from "../../../store/store";
import {
  fetchMembershipsThunk,
  deleteMembershipThunk,
  exportMembershipsCsvThunk,
  exportMembershipsPdfThunk,
  exportMembershipsExcelThunk,
} from "../../../middleware/membership/membership.thunk";
import {
  selectMemberships,
  selectMembershipsLoading,
  selectMembershipsError,
  selectMembershipsTotal,
} from "../../../store/selectors/membership.selectors";
import MembershipFilterDrawer from "../components/MembershipFilterDrawer";
import MembershipDetailsDrawer from "../components/MembershipDetailsDrawer";
import "../styles/MembershipsListPage.scss";

const PAGE_SIZE = 20;

interface Filters {
  sessions: string;
  payment: string;
  validFor: string;
  onlyAllServices: boolean;
}
const DEFAULT_FILTERS: Filters = {
  sessions: "Any number of sessions",
  payment: "All",
  validFor: "Any period",
  onlyAllServices: false,
};

const TIER_MAP: Record<string, string> = {
  "#1a1a2e": "Standard",
  "#b8860b": "Gold",
  "#4a90d9": "Diamond",
  "#16a34a": "Emerald",
  "#8b5cf6": "Platinum",
};

const STATUS_LABEL: Record<string, string> = {
  active:    "Active",
  expired:   "Expired",
  exhausted: "Exhausted",
  cancelled: "Cancelled",
};

const MembershipsListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const memberships = useSelector(selectMemberships);
  const loading     = useSelector(selectMembershipsLoading);
  const error       = useSelector(selectMembershipsError);
  const total       = useSelector(selectMembershipsTotal);

  const [search,     setSearch]     = useState("");
  const [filters,    setFilters]    = useState<Filters>(DEFAULT_FILTERS);
  const [page,       setPage]       = useState(1);
  const [optOpen,    setOptOpen]    = useState(false);
  const [exporting,  setExporting]  = useState<"csv" | "excel" | "pdf" | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [drawerId,   setDrawerId]   = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── plans list ────────────────────────────────────────────────────────────
  const buildQuery = useCallback(() => ({
    search:      search.trim() || undefined,
    sessionType: filters.sessions !== "Any number of sessions"
      ? filters.sessions.replace(" sessions", "").toLowerCase() : undefined,
    validFor: filters.validFor !== "Any period" ? filters.validFor : undefined,
    page, limit: PAGE_SIZE,
  }), [search, filters, page]);

  useEffect(() => { dispatch(fetchMembershipsThunk(buildQuery())); }, [dispatch, buildQuery]);
  useEffect(() => { setPage(1); }, [search, filters]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this membership?")) return;
    await dispatch(deleteMembershipThunk(id));
    dispatch(fetchMembershipsThunk(buildQuery()));
  };

  const handleExport = async (type: "csv" | "excel" | "pdf") => {
    setExporting(type); setOptOpen(false);
    if (type === "csv")   await dispatch(exportMembershipsCsvThunk(buildQuery()));
    if (type === "excel") await dispatch(exportMembershipsExcelThunk(buildQuery()));
    if (type === "pdf")   await dispatch(exportMembershipsPdfThunk(buildQuery()));
    setExporting(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount = [
    filters.sessions !== "Any number of sessions",
    filters.validFor !== "Any period",
    filters.onlyAllServices,
  ].filter(Boolean).length;

  const stats = useMemo(() => ({
    revenue: memberships.reduce((s, m) => s + (Number(m.price) || 0), 0),
    avg:     memberships.length ? Math.round(memberships.reduce((s, m) => s + (Number(m.price) || 0), 0) / memberships.length) : 0,
  }), [memberships]);


  return (
    <div className="msp">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="msp__header">
        <div>
          <h1 className="msp__title">Memberships</h1>
          <p className="msp__subtitle">Create and manage membership plans for your clients</p>
        </div>
        <div className="msp__hdr-actions">
          <div className="msp__dd-wrap">
            <button className="msp__btn msp__btn--outline" onClick={() => setOptOpen(v => !v)}>
              Options <ChevronDown size={13} />
            </button>
            {optOpen && (
              <ul className="msp__dd-menu msp__dd-menu--right">
                <li>
                  <button className="msp__dd-item" onClick={() => { setOptOpen(false); navigate("/dashboard/catalog/memberships/sold"); }}>
                    View sold memberships
                  </button>
                </li>
                <hr className="msp__dd-divider" />
                <li>
                  <button className="msp__dd-item" onClick={() => handleExport("csv")} disabled={exporting !== null}>
                    <FiletypeCsv size={15} /> {exporting === "csv" ? "Exporting…" : "Download CSV"}
                  </button>
                </li>
                <li>
                  <button className="msp__dd-item" onClick={() => handleExport("excel")} disabled={exporting !== null}>
                    <FileEarmarkExcel size={15} /> {exporting === "excel" ? "Exporting…" : "Download Excel"}
                  </button>
                </li>
                <li>
                  <button className="msp__dd-item" onClick={() => handleExport("pdf")} disabled={exporting !== null}>
                    <FileEarmarkPdf size={15} /> {exporting === "pdf" ? "Exporting…" : "Download PDF"}
                  </button>
                </li>
              </ul>
            )}
          </div>
          <div className="msp__add-wrap">
            <button
              className="msp__btn msp__btn--dark"
              onClick={() => navigate("/dashboard/catalog/memberships/create")}
            >
              <PlusLg size={15} /> Add membership
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="msp__stats">
        <div className="msp__stat">
          <span className="msp__stat-icon msp__stat-icon--indigo"><Award size={16} /></span>
          <span className="msp__stat-label">Total plans</span>
          <strong className="msp__stat-val">{total}</strong>
        </div>
        <div className="msp__stat-div" />
        <div className="msp__stat">
          <span className="msp__stat-icon msp__stat-icon--green"><CheckCircleFill size={14} /></span>
          <span className="msp__stat-label">Loaded</span>
          <strong className="msp__stat-val">{memberships.length}</strong>
        </div>
        <div className="msp__stat-div" />
        <div className="msp__stat">
          <span className="msp__stat-icon msp__stat-icon--amber"><CurrencyRupee size={15} /></span>
          <span className="msp__stat-label">Plan revenue</span>
          <strong className="msp__stat-val">₹{stats.revenue.toLocaleString("en-IN")}</strong>
        </div>
        <div className="msp__stat-div" />
        <div className="msp__stat">
          <span className="msp__stat-icon msp__stat-icon--violet"><CardList size={15} /></span>
          <span className="msp__stat-label">Avg. price</span>
          <strong className="msp__stat-val">₹{stats.avg.toLocaleString("en-IN")}</strong>
        </div>
      </div>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className="msp__controls">
        <div className="msp__search">
          <Search size={15} className="msp__search-icon" />
          <input
            placeholder="Search by membership name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`msp__btn msp__btn--outline${activeFilterCount > 0 ? " msp__btn--active" : ""}`}
          onClick={() => setFilterOpen(true)}
        >
          <Sliders size={14} />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="msp__table-wrap">
        {loading && (
          <div className="msp__loading">
            <div className="msp__spinner" /> Loading memberships…
          </div>
        )}
        {!loading && error && (
          <div className="msp__empty-state">
            <p className="msp__empty-msg" style={{ color: "#ef4444" }}>{error}</p>
          </div>
        )}
        {!loading && !error && (
          <table className="msp__table">
            <thead>
              <tr>
                <th>Membership name</th>
                <th>Tier</th>
                <th>Valid for</th>
                <th>Visit Limit</th>
                <th>Price</th>
                <th className="msp__td-actions" />
              </tr>
            </thead>
            <tbody>
              {memberships.length > 0 ? memberships.map(m => {
                const color = m.colour || "#1a1a2e";
                const tier  = TIER_MAP[color] ?? "Custom";
                return (
                  <tr key={m.id} onClick={() => { setDrawerId(String(m.id)); setDrawerOpen(true); }}>
                    <td>
                      <div className="msp__name-cell">
                        <span className="msp__color-dot" style={{ background: color }} />
                        <div>
                          <span className="msp__name">{m.name}</span>
                          <span className="msp__services">
                            {m.includedServices?.length
                              ? m.includedServices.map(s => s.serviceName).join(", ")
                              : "All services"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="msp__tier-badge" style={{ "--tc": color } as React.CSSProperties}>
                        {tier}
                      </span>
                    </td>
                    <td className="msp__td-muted">{m.validFor}</td>
                    <td className="msp__td-muted">
                      {m.sessionType === "unlimited" ? "No cap" : `${m.numberOfSessions ?? "–"} visits`}
                    </td>
                    <td className="msp__price">{(() => {
                        let bonus = 0;
                        try { bonus = Number(JSON.parse(m.description ?? "{}").bonusCredit) || 0; } catch {}
                        const wallet = Number(m.price) + bonus;
                        return <>₹{wallet.toLocaleString("en-IN")}</>;
                      })()}</td>
                    <td className="msp__td-actions" onClick={e => e.stopPropagation()}>
                      <div className="msp__row-actions">
                        <button
                          className="msp__act-btn"
                          title="Edit"
                          onClick={() => navigate(`/dashboard/catalog/memberships/edit/${m.id}`)}
                        >
                          <PencilSquare size={14} /> Edit
                        </button>
                        <button
                          className="msp__act-btn msp__act-btn--danger"
                          title="Delete"
                          onClick={e => handleDelete(e, m.id)}
                        >
                          <Trash3 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6}>
                    <div className="msp__empty-state">
                      <Award size={48} className="msp__empty-icon" />
                      <p className="msp__empty-msg">No memberships found.</p>
                      <p className="msp__empty-hint">
                        {search ? "Try a different search term." : "Create your first membership to get started."}
                      </p>
                      {!search && (
                        <button
                          className="msp__btn msp__btn--dark"
                          onClick={() => navigate("/dashboard/catalog/memberships/create")}
                        >
                          <PlusLg size={14} /> Add membership
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && memberships.length > 0 && (
        <div className="msp__pagination">
          <span className="msp__page-info">Showing {memberships.length} of {total} memberships</span>
          <div className="msp__page-btns">
            <button className="msp__page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span className="msp__page-cur">Page {page} of {totalPages}</span>
            <button className="msp__page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        </div>
      )}

      {filterOpen && (
        <MembershipFilterDrawer
          onClose={() => setFilterOpen(false)}
          onApply={f => { setFilters(f); setPage(1); setFilterOpen(false); }}
          initialFilters={filters}
        />
      )}

      <MembershipDetailsDrawer
        membershipId={drawerId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

    </div>
  );
};

export default MembershipsListPage;
