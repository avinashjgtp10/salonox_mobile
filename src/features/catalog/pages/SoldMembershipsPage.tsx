import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Search, ArrowLeft, CheckCircleFill, XCircleFill,
  ClockHistory, PersonFill, Award, ChevronDown, ChevronUp,
  DashCircle,
} from "react-bootstrap-icons";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchClientMembershipsThunk,
  consumeSessionThunk,
  cancelClientMembershipThunk,
  fetchClientMembershipByIdThunk,
} from "../../../middleware/clientMembership/clientMembership.thunk";
import { clearError } from "../../../store/clientMembershipSlice";
import type { ClientMembership } from "../../../services/api/endpoints/clientMemberships.endpoints";
import "../styles/SoldMembershipsPage.scss";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  active:    "Active",
  exhausted: "Exhausted",
  expired:   "Expired",
  cancelled: "Cancelled",
};

const TIER_MAP: Record<string, string> = {
  "#1a1a2e": "Standard",
  "#b8860b": "Gold",
  "#4a90d9": "Diamond",
  "#16a34a": "Emerald",
  "#8b5cf6": "Platinum",
};

function SessionBar({ used, total }: { used: number; total: number }) {
  if (total === 0) return <span className="smp__unlimited">Unlimited</span>;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const danger = pct >= 80;
  return (
    <div className="smp__bar-wrap">
      <div className="smp__bar">
        <div
          className={`smp__bar-fill${danger ? " smp__bar-fill--danger" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="smp__bar-label">{used}/{total}</span>
    </div>
  );
}

const SoldMembershipsPage: React.FC = () => {
  const navigate   = useNavigate();
  const dispatch   = useDispatch<AppDispatch>();

  const { items, total, loading, submitting, error, selected } = useSelector(
    (s: RootState) => s.clientMemberships
  );

  const [search,     setSearch]     = useState("");
  const [statusFilt, setStatusFilt] = useState("");
  const [page,       setPage]       = useState(1);
  const [detailId,   setDetailId]   = useState<string | null>(null);
  const [consuming,  setConsuming]  = useState<string | null>(null);
  const [errBanner,  setErrBanner]  = useState<string | null>(null);

  const buildQuery = useCallback(() => ({
    search:  search.trim() || undefined,
    status:  statusFilt   || undefined,
    page, limit: PAGE_SIZE,
  }), [search, statusFilt, page]);

  useEffect(() => {
    dispatch(fetchClientMembershipsThunk(buildQuery()));
  }, [dispatch, buildQuery]);

  useEffect(() => { setPage(1); }, [search, statusFilt]);

  useEffect(() => {
    if (error) { setErrBanner(error); dispatch(clearError()); }
  }, [error, dispatch]);

  useEffect(() => {
    if (detailId) dispatch(fetchClientMembershipByIdThunk(detailId));
  }, [detailId, dispatch]);

  const handleConsume = async (id: string) => {
    setConsuming(id);
    const result = await dispatch(consumeSessionThunk({ id, dto: { sessionsToConsume: 1 } }));
    setConsuming(null);
    if (consumeSessionThunk.rejected.match(result)) {
      setErrBanner((result.payload as string) ?? "Failed to consume session");
    } else {
      // Refresh detail if open
      if (detailId === id) dispatch(fetchClientMembershipByIdThunk(id));
      dispatch(fetchClientMembershipsThunk(buildQuery()));
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this membership? This cannot be undone.")) return;
    const result = await dispatch(cancelClientMembershipThunk(id));
    if (cancelClientMembershipThunk.rejected.match(result)) {
      setErrBanner((result.payload as string) ?? "Failed to cancel");
    } else {
      dispatch(fetchClientMembershipsThunk(buildQuery()));
      if (detailId === id) setDetailId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Stats
  const statsActive    = items.filter(i => i.status === "active").length;
  const statsExhausted = items.filter(i => i.status === "exhausted").length;
  const statsCancelled = items.filter(i => i.status === "cancelled").length;

  const detailItem: ClientMembership | null = selected && selected.id === detailId ? selected : null;

  return (
    <div className="smp">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="smp__header">
        <div className="smp__hdr-left">
          <button className="smp__back-btn" onClick={() => navigate("/dashboard/catalog/memberships")}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="smp__title">Sold Memberships</h1>
            <p className="smp__subtitle">Track session usage for all sold membership plans</p>
          </div>
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────── */}
      {errBanner && (
        <div className="smp__error" onClick={() => setErrBanner(null)}>
          {errBanner} <span className="smp__error-close">×</span>
        </div>
      )}

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="smp__stats">
        <div className="smp__stat">
          <span className="smp__stat-icon smp__stat-icon--indigo"><Award size={16} /></span>
          <span className="smp__stat-label">Total sold</span>
          <strong className="smp__stat-val">{total}</strong>
        </div>
        <div className="smp__stat-div" />
        <div className="smp__stat">
          <span className="smp__stat-icon smp__stat-icon--green"><CheckCircleFill size={14} /></span>
          <span className="smp__stat-label">Active</span>
          <strong className="smp__stat-val">{statsActive}</strong>
        </div>
        <div className="smp__stat-div" />
        <div className="smp__stat">
          <span className="smp__stat-icon smp__stat-icon--amber"><DashCircle size={14} /></span>
          <span className="smp__stat-label">Exhausted</span>
          <strong className="smp__stat-val">{statsExhausted}</strong>
        </div>
        <div className="smp__stat-div" />
        <div className="smp__stat">
          <span className="smp__stat-icon smp__stat-icon--red"><XCircleFill size={14} /></span>
          <span className="smp__stat-label">Cancelled</span>
          <strong className="smp__stat-val">{statsCancelled}</strong>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────── */}
      <div className="smp__controls">
        <div className="smp__search">
          <Search size={14} className="smp__search-icon" />
          <input
            placeholder="Search by client or membership name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="smp__sel"
          value={statusFilt}
          onChange={e => setStatusFilt(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="exhausted">Exhausted</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ── Layout: table + detail panel ──────────────────────── */}
      <div className={`smp__layout${detailId ? " smp__layout--split" : ""}`}>

        {/* Table */}
        <div className="smp__table-wrap">
          {loading && (
            <div className="smp__loading">
              <div className="smp__spinner" /> Loading…
            </div>
          )}
          {!loading && (
            <table className="smp__table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Membership</th>
                  <th>Sessions</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Purchased</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map(item => {
                  const color   = item.colour || "#1a1a2e";
                  const tier    = TIER_MAP[color] ?? "Custom";
                  const isOpen  = detailId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={isOpen ? "smp__tr--active" : ""}
                      onClick={() => setDetailId(isOpen ? null : item.id)}
                    >
                      <td>
                        <div className="smp__client-cell">
                          <span className="smp__avatar">
                            <PersonFill size={12} />
                          </span>
                          <div>
                            <span className="smp__client-name">{item.clientName}</span>
                            {item.mobile && <span className="smp__client-sub">{item.mobile}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="smp__mem-cell">
                          <span className="smp__color-dot" style={{ background: color }} />
                          <div>
                            <span className="smp__mem-name">{item.membershipName}</span>
                            <span className="smp__mem-tier"
                              style={{ "--tc": color } as React.CSSProperties}
                            >{tier}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <SessionBar used={item.usedSessions} total={item.totalSessions} />
                      </td>
                      <td>
                        <span className={`smp__remaining${item.remainingSessions === 0 && item.totalSessions > 0 ? " smp__remaining--zero" : ""}`}>
                          {item.totalSessions === 0
                            ? "∞"
                            : item.remainingSessions}
                        </span>
                      </td>
                      <td>
                        <span className={`smp__status smp__status--${item.status}`}>
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="smp__td-muted">
                        {new Date(item.purchasedAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric"
                        })}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="smp__row-actions">
                          {item.status === "active" && (
                            <button
                              className="smp__act-btn smp__act-btn--primary"
                              disabled={consuming === item.id || submitting}
                              onClick={() => handleConsume(item.id)}
                              title="Mark 1 session used"
                            >
                              {consuming === item.id ? "…" : "Use session"}
                            </button>
                          )}
                          {item.status === "active" && (
                            <button
                              className="smp__act-btn smp__act-btn--danger"
                              onClick={() => handleCancel(item.id)}
                              title="Cancel membership"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            className="smp__act-btn"
                            onClick={() => setDetailId(isOpen ? null : item.id)}
                            title="View history"
                          >
                            <ClockHistory size={12} />
                            {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="smp__empty">
                        <Award size={44} className="smp__empty-icon" />
                        <p className="smp__empty-msg">No sold memberships found.</p>
                        <p className="smp__empty-hint">
                          {search || statusFilt
                            ? "Try clearing the search / filter."
                            : "Memberships appear here automatically when a payment is completed."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {detailId && detailItem && (
          <div className="smp__detail">
            <div className="smp__detail-head">
              <div>
                <h3 className="smp__detail-title">{detailItem.membershipName}</h3>
                <p className="smp__detail-sub">{detailItem.clientName}</p>
              </div>
              <button className="smp__detail-close" onClick={() => setDetailId(null)}>×</button>
            </div>

            {/* Session summary */}
            <div className="smp__detail-summary">
              <div className="smp__ds-card">
                <span className="smp__ds-label">Total</span>
                <strong className="smp__ds-val">
                  {detailItem.totalSessions === 0 ? "∞" : detailItem.totalSessions}
                </strong>
              </div>
              <div className="smp__ds-card smp__ds-card--used">
                <span className="smp__ds-label">Used</span>
                <strong className="smp__ds-val">{detailItem.usedSessions}</strong>
              </div>
              <div className="smp__ds-card smp__ds-card--rem">
                <span className="smp__ds-label">Remaining</span>
                <strong className="smp__ds-val">
                  {detailItem.totalSessions === 0 ? "∞" : detailItem.remainingSessions}
                </strong>
              </div>
            </div>

            {/* Progress bar */}
            {detailItem.totalSessions > 0 && (
              <div className="smp__detail-bar">
                <div
                  className="smp__detail-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.round((detailItem.usedSessions / detailItem.totalSessions) * 100))}%`
                  }}
                />
              </div>
            )}

            {/* Usage history */}
            <h4 className="smp__detail-section">Usage history</h4>
            {detailItem.usageLog && detailItem.usageLog.length > 0 ? (
              <ul className="smp__log">
                {detailItem.usageLog.map(entry => (
                  <li key={entry.id} className="smp__log-entry">
                    <span className="smp__log-dot" />
                    <div className="smp__log-body">
                      <span className="smp__log-service">
                        {entry.serviceName || "Session used"}
                        {entry.sessionsConsumed > 1 && ` × ${entry.sessionsConsumed}`}
                      </span>
                      <span className="smp__log-date">
                        {new Date(entry.usedAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      {entry.notes && <span className="smp__log-note">{entry.notes}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="smp__log-empty">No sessions used yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="smp__pagination">
          <span className="smp__page-info">Showing {items.length} of {total}</span>
          <div className="smp__page-btns">
            <button className="smp__page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              ‹ Prev
            </button>
            <span className="smp__page-cur">Page {page} of {totalPages}</span>
            <button className="smp__page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SoldMembershipsPage;
