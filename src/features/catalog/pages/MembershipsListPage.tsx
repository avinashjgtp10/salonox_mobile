import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Search, PlusLg, Sliders, ChevronDown,
  PencilSquare, Trash3, FileEarmarkPdf,
  FileEarmarkExcel, FiletypeCsv, CardList,
  Award, CheckCircleFill,
  ThreeDotsVertical, X,
} from "react-bootstrap-icons";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import type { AppDispatch } from "../../../store/store";
import type { Membership } from "../../../services/api/endpoints/memberships.endpoints";
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
import { fetchCategoriesThunk } from "../../../middleware/services/categories.thunk";
import { selectAllCategories } from "../../../store/selectors/slices.selectors";
import MembershipFilterDrawer from "../components/MembershipFilterDrawer";
import MembershipDetailsDrawer from "../components/MembershipDetailsDrawer";
import "../styles/MembershipsListPage.scss";

const PAGE_SIZE = 20;

interface Filters {
  validFor: string;
}
const DEFAULT_FILTERS: Filters = {
  validFor: "Any period",
};

interface MembershipMeta {
  bonusCredit?: number;
}
const getMembershipMeta = (m: Membership): MembershipMeta => {
  try { return JSON.parse(m.description ?? "{}"); } catch { return {}; }
};

const TYPE_LABEL: Record<string, string> = {
  value: "Wallet", percentage: "Discount Balance", loyalty: "Loyalty",
};

const MembershipsListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { formatAmount, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);

  const memberships = useSelector(selectMemberships);
  const loading     = useSelector(selectMembershipsLoading);
  const error       = useSelector(selectMembershipsError);
  const total       = useSelector(selectMembershipsTotal);
  const categories  = useSelector(selectAllCategories) as { id: string | number; name: string }[];
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(String(c.id), c.name));
    return map;
  }, [categories]);

  useEffect(() => { dispatch(fetchCategoriesThunk()); }, [dispatch]);

  const [search,     setSearch]     = useState("");
  // The input stays controlled by `search` for instant typing feedback, but
  // the list only refetches off this debounced copy — without it, every
  // keystroke fired its own fetchMembershipsThunk (each one flipping
  // `loading` true/false), which redrew the whole table on every character.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  const [filters,    setFilters]    = useState<Filters>(DEFAULT_FILTERS);
  const [page,       setPage]       = useState(1);
  const [optOpen,    setOptOpen]    = useState(false);
  const [exporting,  setExporting]  = useState<"csv" | "excel" | "pdf" | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [drawerId,   setDrawerId]   = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [selectedMemberships, setSelectedMemberships] = useState<string[]>([]);
  const [membershipsToDelete, setMembershipsToDelete] = useState<string[]>([]);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting,  setIsDeleting]  = useState(false);

  const optDropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!optOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (optDropRef.current && !optDropRef.current.contains(e.target as Node)) {
        setOptOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [optOpen]);

  useEffect(() => {
    if (!openRowMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".msp__dd-wrap")) {
        setOpenRowMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openRowMenuId]);

  useEffect(() => { setDeleteInput(""); }, [membershipsToDelete]);

  // ── plans list ────────────────────────────────────────────────────────────
  const buildQuery = useCallback(() => ({
    search:      debouncedSearch.trim() || undefined,
    validFor: filters.validFor !== "Any period" ? filters.validFor : undefined,
    page, limit: PAGE_SIZE,
  }), [debouncedSearch, filters, page]);

  useEffect(() => {
    dispatch(fetchMembershipsThunk(buildQuery()));
    setSelectedMemberships([]);
  }, [dispatch, buildQuery]);
  useEffect(() => { setPage(1); }, [debouncedSearch, filters]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMemberships(e.target.checked ? memberships.map(m => String(m.id)) : []);
  };

  const handleSelectMembership = (id: string) => {
    setSelectedMemberships(prev =>
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]);
  };

  const openDeleteModal = (ids: string[]) => {
    setOpenRowMenuId(null);
    setMembershipsToDelete(ids);
  };

  const handleConfirmDelete = async () => {
    if (!membershipsToDelete.length) return;
    setIsDeleting(true);
    try {
      await Promise.all(membershipsToDelete.map(id => dispatch(deleteMembershipThunk(id))));
      setSelectedMemberships(prev => prev.filter(id => !membershipsToDelete.includes(id)));
      dispatch(fetchMembershipsThunk(buildQuery()));
    } finally {
      setIsDeleting(false);
      setMembershipsToDelete([]);
    }
  };

  const handleExport = async (type: "csv" | "excel" | "pdf") => {
    setExporting(type); setOptOpen(false);
    if (type === "csv")   await dispatch(exportMembershipsCsvThunk(buildQuery()));
    if (type === "excel") await dispatch(exportMembershipsExcelThunk(buildQuery()));
    if (type === "pdf")   await dispatch(exportMembershipsPdfThunk(buildQuery()));
    setExporting(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount = filters.validFor !== "Any period" ? 1 : 0;

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
          <div className="msp__dd-wrap" ref={optDropRef}>
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
          <span className="msp__stat-icon msp__stat-icon--amber"><CurrencyIcon size={15} /></span>
          <span className="msp__stat-label">Plan revenue</span>
          <strong className="msp__stat-val">{formatAmount(stats.revenue)}</strong>
        </div>
        <div className="msp__stat-div" />
        <div className="msp__stat">
          <span className="msp__stat-icon msp__stat-icon--violet"><CardList size={15} /></span>
          <span className="msp__stat-label">Avg. price</span>
          <strong className="msp__stat-val">{formatAmount(stats.avg)}</strong>
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
          onClick={() => {
            setOptOpen(false);
            setFilterOpen(true);
          }}
        >
          <Sliders size={14} />
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>

        {selectedMemberships.length > 0 && (
          <div className="msp__bulk-bar">
            <span className="msp__bulk-count">
              {selectedMemberships.length === memberships.length
                ? "All memberships selected"
                : `${selectedMemberships.length} membership${selectedMemberships.length !== 1 ? "s" : ""} selected`}
            </span>
            <button className="msp__bulk-clear" onClick={() => setSelectedMemberships([])} aria-label="Clear selection">
              <X size={16} />
            </button>
            <button className="msp__bulk-delete" onClick={() => openDeleteModal(selectedMemberships)}>
              <Trash3 size={13} /> Delete
            </button>
          </div>
        )}
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
                <th className="msp__td-checkbox">
                  <input
                    type="checkbox"
                    checked={memberships.length > 0 && memberships.every(m => selectedMemberships.includes(String(m.id)))}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Membership Name</th>
                <th>Membership Type</th>
                <th>Benefit</th>
                <th>Validity</th>
                <th className="msp__td-actions" />
              </tr>
            </thead>
            <tbody>
              {memberships.length > 0 ? memberships.map(m => {
                const color = m.colour || "#1a1a2e";
                const meta  = getMembershipMeta(m);
                const type  = m.pricingType ?? "value";
                return (
                  <tr key={m.id} onClick={() => { setDrawerId(String(m.id)); setDrawerOpen(true); }}>
                    <td className="msp__td-checkbox" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedMemberships.includes(String(m.id))}
                        onChange={() => handleSelectMembership(String(m.id))}
                      />
                    </td>
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
                      <span className={`msp__type-badge msp__type-badge--${type}`}>
                        {TYPE_LABEL[type] ?? "Wallet"}
                      </span>
                    </td>
                    <td className="msp__price">
                      <div>
                        {type === "percentage"
                          ? `${m.discountPercent ?? 0}% Off · ${formatAmount(Number(m.discountBalance) || 0)} balance`
                          : type === "loyalty"
                            ? (m.loyaltyTiers?.length
                                ? m.loyaltyTiers.map(t => `${t.thresholdValue} visits → ${t.discountPercent}%`).join(" · ")
                                : "No tiers configured")
                            : `${formatAmount((Number(m.price) || 0) + (Number(meta.bonusCredit) || 0))} Wallet`}
                      </div>
                      {!!m.categoryIds?.length && (
                        <div className="msp__td-muted" style={{ fontSize: 11 }}>
                          {m.categoryIds.map((id) => categoryNameById.get(id) ?? id).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="msp__td-muted">{type === "loyalty" ? "—" : m.validFor}</td>
                    <td className="msp__td-actions" onClick={e => e.stopPropagation()}>
                      <div className="msp__dd-wrap">
                        <button
                          className="msp__kebab"
                          title="Actions"
                          onClick={() => setOpenRowMenuId(openRowMenuId === String(m.id) ? null : String(m.id))}
                        >
                          <ThreeDotsVertical size={16} />
                        </button>
                        {openRowMenuId === String(m.id) && (
                          <ul className="msp__dd-menu msp__dd-menu--right">
                            <li>
                              <button
                                className="msp__dd-item"
                                onClick={() => { setOpenRowMenuId(null); navigate(`/dashboard/catalog/memberships/edit/${m.id}`); }}
                              >
                                <PencilSquare size={14} /> Edit
                              </button>
                            </li>
                            <li>
                              <button
                                className="msp__dd-item msp__dd-item--danger"
                                onClick={() => openDeleteModal([String(m.id)])}
                              >
                                <Trash3 size={13} /> Delete
                              </button>
                            </li>
                          </ul>
                        )}
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

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      <Modal
        show={membershipsToDelete.length > 0}
        onClose={() => setMembershipsToDelete([])}
        title={membershipsToDelete.length > 1 ? "Delete memberships?" : "Delete membership?"}
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE" || isDeleting}
              loading={isDeleting}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => setMembershipsToDelete([])}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          Are you sure you want to delete{" "}
          {membershipsToDelete.length > 1
            ? `these ${membershipsToDelete.length} memberships`
            : <strong>{memberships.find(m => String(m.id) === membershipsToDelete[0])?.name ?? "this membership"}</strong>}?
          This operation can't be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>

    </div>
  );
};

export default MembershipsListPage;
