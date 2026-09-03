import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Search, PlusLg, ChevronDown,
  PencilSquare, Trash3, FileEarmarkPdf,
  FileEarmarkExcel, FiletypeCsv, CardList,
  Award, CheckCircleFill,
  ThreeDotsVertical, X,
} from "react-bootstrap-icons";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
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
import MembershipDetailsDrawer from "../components/MembershipDetailsDrawer";
import api from "../../../services/api/axios";
import { JiraFilterMenu, Pagination } from "../../../components/ui";
import type { FilterDropdownOption, JiraFilterField } from "../../../components/ui";
import { getMembershipMeta, TYPE_LABEL, APPLIES_TO_LABEL, loyaltyBenefit, walletBenefit } from "../utils/membershipMeta";
import "../styles/MembershipsListPage.scss";

// Starting page size only — the shared Pagination lets the user change it, so
// the live value lives in state (see `pageSize` below) rather than this const.
const DEFAULT_PAGE_SIZE = 10;

// Every field is multi-select, matching the shared JiraFilterMenu's contract
// (Record<string, string[]>) — an empty array means "no restriction". Sent to
// the API comma-joined per field; see splitMulti() in the backend's
// memberships.repository.ts.
interface Filters {
  validFor: string[];
  pricingType: string[];
  appliesTo: string[];
}
const DEFAULT_FILTERS: Filters = {
  validFor: [],
  pricingType: [],
  appliesTo: [],
};

const PRICING_TYPE_OPTIONS: FilterDropdownOption[] = [
  { id: "value", label: "Wallet" },
  { id: "percentage", label: "Discount Balance" },
  { id: "loyalty", label: "Loyalty" },
];

const APPLIES_TO_OPTIONS: FilterDropdownOption[] = [
  { id: "services", label: "Services" },
  { id: "products", label: "Products" },
  { id: "both", label: "Services & Products" },
];

// Expiry options are NOT hardcoded: valid_for is free-form text holding
// whatever duration string each plan was saved with ("1 year", "365 days",
// "3 months", "lifetime", even "367 days"), so a fixed list would silently
// match nothing. Fetched per salon from /memberships/filter-options.

function formatDate(value?: string | Date) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDateDDMMYYYY(d);
}

const MembershipsListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { formatAmount, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);

  const memberships = useSelector(selectMemberships);
  const loading     = useSelector(selectMembershipsLoading);
  const error       = useSelector(selectMembershipsError);
  const total       = useSelector(selectMembershipsTotal);

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
  const [pageSize,   setPageSize]   = useState(DEFAULT_PAGE_SIZE);
  const [validForOptions, setValidForOptions] = useState<string[]>([]);

  // Distinct valid_for values for this salon — see the note above
  // PRICING_TYPE_OPTIONS for why these can't be a fixed list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/v1/memberships/filter-options");
        if (!cancelled) setValidForOptions(res.data?.data?.validFor ?? []);
      } catch {
        if (!cancelled) setValidForOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const [drawerId,   setDrawerId]   = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  // The row kebab menu is rendered via a portal (see render below) so the
  // table's own horizontal scroll container (needed now that there are 10+
  // columns) can't clip it — position is computed from the trigger button's
  // own rect at open time, right-aligned to it via `right` (so we don't need
  // to know the menu's width up front).
  const [kebabPos, setKebabPos] = useState<{ top: number; right: number } | null>(null);
  const kebabPortalRef = useRef<HTMLUListElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
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
      const target = e.target as HTMLElement;
      if (target.closest(".msp__dd-wrap")) return;
      if (kebabPortalRef.current?.contains(target)) return;
      setOpenRowMenuId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openRowMenuId]);

  // Closes the menu on scroll instead of tracking/repositioning it — simpler,
  // and scrolling away from the row it belongs to should dismiss it anyway.
  useEffect(() => {
    if (!openRowMenuId) return;
    const closeOnScroll = () => setOpenRowMenuId(null);
    const wrap = tableWrapRef.current;
    wrap?.addEventListener("scroll", closeOnScroll);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      wrap?.removeEventListener("scroll", closeOnScroll);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openRowMenuId]);

  useEffect(() => { setDeleteInput(""); }, [membershipsToDelete]);

  // ── plans list ────────────────────────────────────────────────────────────
  // Arrays are joined by cleanParams' String(v) in membership.thunk.ts, and an
  // empty one stringifies to "" which that same helper drops — so absent
  // filters never reach the query string.
  const buildQuery = useCallback(() => ({
    search:      debouncedSearch.trim() || undefined,
    validFor:    filters.validFor.length ? filters.validFor.join(",") : undefined,
    pricingType: filters.pricingType.length ? filters.pricingType.join(",") : undefined,
    appliesTo:   filters.appliesTo.length ? filters.appliesTo.join(",") : undefined,
    page, limit: pageSize,
  }), [debouncedSearch, filters, page, pageSize]);

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

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "pricingType", label: "Membership Type", options: PRICING_TYPE_OPTIONS },
    { key: "appliesTo", label: "Applies To", options: APPLIES_TO_OPTIONS },
    {
      key: "validFor",
      label: "Expiry",
      options: validForOptions.map((v) => ({ id: v, label: v === "lifetime" ? "Lifetime" : v })),
      searchable: validForOptions.length > 8,
    },
  ], [validForOptions]);

  // JiraFilterMenu hands back the WHOLE draft on Apply (every field, changed or
  // not) in one call — one state update, one fetch, however many fields were
  // touched before clicking.
  const applyAllFilters = useCallback((next: Record<string, string[]>) => {
    setFilters({
      pricingType: next.pricingType ?? [],
      appliesTo: next.appliesTo ?? [],
      validFor: next.validFor ?? [],
    });
    setPage(1);
  }, []);

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
        {/* Shared filter menu (components/ui) — same two-pane panel and
            single-Apply behaviour as the Consumable Inventory page, replacing
            this page's own one-field drawer. */}
        <JiraFilterMenu
          fields={filterFields}
          selected={filters as unknown as Record<string, string[]>}
          onApply={applyAllFilters}
        />

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
      <div className="msp__table-wrap" ref={tableWrapRef}>
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
                <th>Applies To</th>
                <th>Membership Fee</th>
                <th>Expiry</th>
                <th>Created At</th>
                <th className="msp__td-actions" />
              </tr>
            </thead>
            <tbody>
              {memberships.length > 0 ? memberships.map(m => {
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
                      <span className="msp__name" title={m.name}>{m.name}</span>
                    </td>
                    <td>
                      <span className={`msp__type-badge msp__type-badge--${type}`}>
                        {TYPE_LABEL[type] ?? "Wallet"}
                      </span>
                    </td>
                    {/* The "Wallet"/"Discount" prefix this used to repeat is
                        already the column immediately to the left, and it was
                        most of what pushed this cell to four wrapped lines —
                        so the benefit itself is all that's shown, with the
                        bonus demoted to a muted suffix. Full text stays on
                        the title attribute for anything that still overflows. */}
                    <td className="msp__price">
                      {type === "percentage" ? (
                        <span className="msp__benefit" title={`${m.discountPercent ?? 0}% Discount`}>
                          {m.discountPercent ?? 0}% Discount
                        </span>
                      ) : type === "loyalty" ? (
                        <span className="msp__benefit" title={loyaltyBenefit(m)}>
                          {loyaltyBenefit(m)}
                        </span>
                      ) : (
                        <span className="msp__benefit" title={walletBenefit(m, meta, formatAmount)}>
                          {formatAmount(Number(m.price) || 0)}
                          {Number(meta.bonusCredit) > 0 && (
                            <span className="msp__benefit-sub">
                              +{formatAmount(Number(meta.bonusCredit))} bonus
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="msp__td-muted">{APPLIES_TO_LABEL[m.appliesTo ?? "services"] ?? "Services"}</td>
                    <td className="msp__td-muted">{type === "loyalty" ? "Free" : formatAmount(Number(m.price) || 0)}</td>
                    <td className="msp__td-muted">{type === "loyalty" ? (m.validFor && m.validFor !== "lifetime" ? m.validFor : "Lifetime") : m.validFor}</td>
                    <td className="msp__td-muted">{formatDate(m.createdAt)}</td>
                    <td className="msp__td-actions" onClick={e => e.stopPropagation()}>
                      <div className="msp__dd-wrap">
                        <button
                          className="msp__kebab"
                          title="Actions"
                          onClick={(e) => {
                            const isOpen = openRowMenuId === String(m.id);
                            setOpenRowMenuId(isOpen ? null : String(m.id));
                            if (!isOpen) {
                              const r = e.currentTarget.getBoundingClientRect();
                              setKebabPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
                            }
                          }}
                        >
                          <ThreeDotsVertical size={16} />
                        </button>
                        {openRowMenuId === String(m.id) && kebabPos && createPortal(
                          <ul
                            ref={kebabPortalRef}
                            className="msp__dd-menu msp__dd-menu--portal"
                            style={{ position: "fixed", top: kebabPos.top, right: kebabPos.right, zIndex: 9999 }}
                          >
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
                          </ul>,
                          document.body
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9}>
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
      {/* Shared component (components/ui), same as the Reports pages and
          Consumable Inventory — numbered pages and a page-size selector,
          replacing this page's own Prev/Next-only pager. It renders nothing
          when totalItems is 0, so the previous empty/loading guard is no
          longer needed here. */}
      <Pagination
        currentPage={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

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
