import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { deleteStaffThunk, activateStaffThunk, deactivateStaffThunk } from "../../../middleware/staff/staff.thunk";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import {
  Search as SearchIcon,
  ToggleOn,
  ChevronDown,
  ArrowDownUp,
  PersonBadge,
  PersonPlus,
  FileEarmarkExcel,
  FiletypeCsv,
  FiletypePdf,
  Pencil,
  Trash,
  ThreeDots,
  ClockHistory,
  TelephoneFill,
  EnvelopeFill,
} from "react-bootstrap-icons";
import "../styles/StaffListPage.scss";

import Dropdown from "../../../components/ui/Dropdown";
import { Button, Input, DownloadButton, Modal, JiraFilterMenu, Pagination } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import StaffImportModal from "../components/StaffImportModal";
import TeamMemberDrawer from "../components/TeamMemberDrawer";
import { exportStaffPDF, exportStaffCSV, exportStaffExcel } from "../utils/staffExport";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";

interface StaffMember {
  id: string;
  staff_code?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  phone?: string;
  status?: string;
  invitation_status?: string;
  job_title?: string;
  avatar_url?: string;
  calendar_color?: string;
  allow_calendar_bookings?: boolean;
  permission_level?: string;
  is_active?: boolean;
  created_at?: string;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#f97316,#fbbf24)",
  "linear-gradient(135deg,#14b8a6,#0ea5e9)",
];

function getGradient(id: string | number) {
  const seed = typeof id === "number" ? id : id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[seed % AVATAR_GRADIENTS.length];
}

const COLOR_KEY_TO_HEX: Record<string, string> = {
  light_blue: "#7dd3fc", blue: "#3b82f6", dark_blue: "#1d4ed8",
  purple: "#a855f7", violet: "#7c3aed", pink: "#f472b6",
  hot_pink: "#ec4899", rose: "#f43f5e", orange: "#f97316",
  yellow: "#eab308", lime: "#84cc16", green: "#22c55e",
  teal: "#14b8a6", cyan: "#06b6d4",
};

function resolveColor(color?: string): string | undefined {
  if (!color) return undefined;
  return COLOR_KEY_TO_HEX[color] ?? color;
}

// Backend sort columns for the "Started at"/"Name" options below — see
// StaffListQuery.sort_by (staff.types.ts) on the backend. "Custom order"
// sends neither param, which is exactly what the old client-side "no-op
// sort" resolved to anyway (the API's own default is created_at DESC).
const SORT_PARAMS: Record<string, { sort_by?: string; sort_order?: "ASC" | "DESC" }> = {
  "Custom order": {},
  "Name (A-Z)": { sort_by: "first_name", sort_order: "ASC" },
  "Name (Z-A)": { sort_by: "first_name", sort_order: "DESC" },
  "Started at (oldest first)": { sort_by: "joined_date", sort_order: "ASC" },
  "Started at (newest first)": { sort_by: "joined_date", sort_order: "DESC" },
};

export default function StaffListPage() {
  const navigate = useNavigate();

  const dispatch = useDispatch<AppDispatch>();

  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // The list itself is fetched directly (paginated) rather than through the
  // shared `staff` Redux slice — that slice (fetchStaffThunk/selectAllStaff)
  // is used by ~30 other pages as an unpaginated "every staff member" source
  // for dropdowns/reports, so it can't be given page/limit params without
  // silently truncating all of those. See the reusable Pagination component
  // used below (components/ui/Pagination) — same one Suppliers/Orders/
  // Products/Commission/Tip already use.
  const [items, setItems] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  // The input stays controlled by `searchTerm` for instant typing feedback,
  // but the list only refetches off this debounced copy — same reasoning as
  // SuppliersListPage: firing a request on every keystroke would hit the API
  // constantly instead of once the user pauses.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSort, setSelectedSort] = useState("Custom order");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ mode: "single"; id: string } | { mode: "bulk" } | null>(null);
  // Same "type DELETE to confirm" guard as the Clients page — clears
  // automatically whenever the modal opens for a new target or closes, so a
  // leftover "DELETE" from a previous confirmation can never silently arm
  // the button for a different (or re-opened) delete.
  const [deleteInput, setDeleteInput] = useState("");
  useEffect(() => { setDeleteInput(""); }, [deleteConfirm]);

  // Filter state
  const [bookable, setBookable] = useState(false);
  const [nonBookable, setNonBookable] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "archived">("all");

  const sortOptions = [
    "Custom order",
    "Name (A-Z)",
    "Name (Z-A)",
    "Started at (oldest first)",
    "Started at (newest first)",
  ];

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    if (type === "error") showError(msg);
    else showSuccess(msg);
  }, [showSuccess, showError]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Both checkboxes on = same as neither checked (matches "all" either way),
  // so only a single-checked box narrows the server query.
  const allowCalendarBookingsParam =
    bookable === nonBookable ? undefined : bookable;

  const buildListParams = useCallback((page: number, limit: number) => ({
    page,
    limit,
    search: debouncedSearch || undefined,
    is_active: selectedStatus === "all" ? undefined : selectedStatus === "active",
    allow_calendar_bookings: allowCalendarBookingsParam,
    ...SORT_PARAMS[selectedSort],
  }), [debouncedSearch, selectedStatus, allowCalendarBookingsParam, selectedSort]);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(STAFF.BASE, { params: buildListParams(currentPage, pageSize) });
      const data = res.data?.data;
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(data?.pagination?.total ?? 0);
    } catch (error: any) {
      console.error("Error fetching staff", error);
      showToast(`Failed to load staff members: ${error?.message || "Unknown error"}`, "error");
    } finally {
      setLoading(false);
    }
  }, [buildListParams, currentPage, pageSize, showToast]);

  // Tracks whether we're past the initial mount, so the effect below doesn't
  // also fire (redundantly) on first render — same pattern as
  // SuppliersListPage/OrdersListPage.
  const isMountedRef = useRef(false);
  useEffect(() => {
    fetchStaff();
    const t = setTimeout(() => { isMountedRef.current = true; }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when page/pageSize/search/filters/sort change (skip initial
  // mount, already handled above). When search/filters/sort change while not
  // already on page 1, reset to page 1 without firing a second (stale-page)
  // fetch in the same tick — the page-1 reset alone triggers this effect
  // again with the corrected page.
  const filtersKey = JSON.stringify({ debouncedSearch, selectedStatus, allowCalendarBookingsParam, selectedSort });
  const prevFiltersKeyRef = useRef(filtersKey);
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, filtersKey]);

  // Close dropdowns on outside click
  useEffect(() => {
    // The sort menu isn't listed here any more — Dropdown closes itself on
    // blur, so it needs no outside-click wiring of its own.
    const handler = () => {
      setOptionsOpen(false);
      setActionMenuId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Drives the empty-state copy ("No results found" vs "No staff members
  // yet") — JiraFilterMenu shows its own applied-count badge on the trigger.
  const totalFilterBadge =
    (bookable ? 1 : 0) + (nonBookable ? 1 : 0) + (selectedStatus !== "all" ? 1 : 0);

  const filterFields: JiraFilterField[] = useMemo(() => [
    // The two booleans were always a two-checkbox group — this is the same
    // thing, just expressed as one multi-select field.
    { key: "type", label: "Type", options: [
      { id: "bookable", label: "Bookable" },
      { id: "non_bookable", label: "Non-bookable" },
    ] },
    { key: "status", label: "Status", options: [
      { id: "active", label: "Active" },
      { id: "archived", label: "Inactive" },
    ] },
  ], []);

  const filterMenuSelected = useMemo(() => ({
    type: [...(bookable ? ["bookable"] : []), ...(nonBookable ? ["non_bookable"] : [])],
    // "all" is the absence of a status filter, so it maps to an empty array
    // rather than being an option of its own.
    status: selectedStatus === "all" ? [] : [selectedStatus],
  }), [bookable, nonBookable, selectedStatus]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setBookable(!!next.type?.includes("bookable"));
    setNonBookable(!!next.type?.includes("non_bookable"));
    const status = next.status?.length ? next.status[next.status.length - 1] : "all";
    setSelectedStatus(status as "all" | "active" | "archived");
  };

  // Selects/deselects the current page only — with the list now
  // server-paginated there's no complete "every filtered result" array
  // sitting in memory to select across, same as other paginated list pages
  // in this app.
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? items.map((m) => m.id) : []);
  };

  const handleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteStaff = async (id: string) => {
    setDeletingId(id);
    try {
      await dispatch(deleteStaffThunk(id)).unwrap();
      showSuccess("Staff deleted successfully");
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      // Refetch to sync with server (handles edge cases where backend may have cascade effects)
      fetchStaff();
    } catch (err: any) {
      showToast(err || "Failed to delete staff member", "error");
    } finally {
      setDeletingId(null);
      setActionMenuId(null);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.mode === "single") {
      handleDeleteStaff(deleteConfirm.id);
    } else {
      selectedIds.forEach((id) => handleDeleteStaff(id));
    }
    setDeleteConfirm(null);
  };

  const handleToggleStatus = async (member: StaffMember) => {
    const isActive = member.is_active ?? true;
    try {
      if (isActive) {
        await dispatch(deactivateStaffThunk(member.id)).unwrap();
      } else {
        await dispatch(activateStaffThunk(member.id)).unwrap();
      }
      showToast(`${member.first_name} ${isActive ? "deactivated" : "activated"} successfully`);
    } catch {
      showToast("Failed to update status", "error");
    }
    setActionMenuId(null);
  };

  // Pulls every staff member matching the current search/filters/sort — not
  // just the page on screen — for CSV/Excel/PDF export. Same page-looping
  // approach as SuppliersListPage/OrdersListPage/ProductsListPage's export,
  // since the list itself is now server-paginated.
  const fetchAllStaffForExport = useCallback(async (): Promise<StaffMember[]> => {
    const all: StaffMember[] = [];
    let page = 1;
    const limit = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await api.get(STAFF.BASE, { params: buildListParams(page, limit) });
      const chunk: StaffMember[] = res.data?.data?.items ?? [];
      all.push(...chunk);
      if (chunk.length < limit) break;
      page += 1;
    }
    return all;
  }, [buildListParams]);

  return (
    <div className="staff-list-page">
      {overlay}

      {/* ===== HEADER ===== */}
      <div className="slp-header">
        <div className="slp-header__left">
          <div className="slp-title-row">
            <h2 className="slp-title">Staff members</h2>
            <span className="slp-count-badge">{total}</span>
          </div>
          <p className="slp-subtitle">
            Manage your staff, their roles and access levels.
            <LearnMoreLink topic="staff-list" className="slp-learn-more">Learn more</LearnMoreLink>
          </p>
        </div>
        <div className="slp-header__right">
          <div className="options-dropdown" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline-dark"
              onClick={() => setOptionsOpen(!optionsOpen)}
              iconRight={<ChevronDown size={13} className={`chevron ${optionsOpen ? "open" : ""}`} />}
            >
              Options
            </Button>
            {optionsOpen && (
              <div className="slp-options-menu">

                <div className="slp-option-item" onClick={() => setOptionsOpen(false)}>
                  <span>⚙️</span> Staff settings
                </div>
                <div className="slp-option-divider" />
                <div className="slp-option-label">Import</div>
                <div
                  className="slp-option-item"
                  onClick={() => { setShowImport(true); setOptionsOpen(false); }}
                >
                  <FiletypeCsv size={14} /> Import from CSV / Excel
                </div>
                <div className="slp-option-divider" />
                <div className="slp-option-label">Export</div>
                <DownloadButton
                  filename="staff.csv"
                  fetcher={async () => {
                    const all = await fetchAllStaffForExport();
                    setOptionsOpen(false);
                    return exportStaffCSV(all);
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FiletypeCsv size={14} />}
                  className="slp-option-item w-100 text-start"
                >
                  Export CSV
                </DownloadButton>
                <DownloadButton
                  filename="staff.xlsx"
                  fetcher={async () => {
                    const all = await fetchAllStaffForExport();
                    setOptionsOpen(false);
                    return exportStaffExcel(all);
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FileEarmarkExcel size={14} />}
                  className="slp-option-item w-100 text-start"
                >
                  Export Excel
                </DownloadButton>
                <DownloadButton
                  filename="staff.pdf"
                  mimeType="application/pdf"
                  fetcher={async () => {
                    const all = await fetchAllStaffForExport();
                    setOptionsOpen(false);
                    return exportStaffPDF(all);
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FiletypePdf size={14} />}
                  className="slp-option-item w-100 text-start"
                >
                  Export PDF
                </DownloadButton>
              </div>
            )}
          </div>
          <Button
            variant="dark"
            pill
            className="slp-add-btn"
            onClick={() => navigate("/dashboard/team/add")}
            iconLeft={<PersonPlus size={16} />}
          >
            Add member
          </Button>
        </div>
      </div>

      {/* ===== SEARCH + FILTER + SORT ===== */}
      <div className="slp-toolbar">
        <div className="slp-toolbar__left">
          <div className="slp-search-wrap">
            <Input
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-0"
              containerClass="mb-0"
              iconLeft={<SearchIcon size={15} />}
            />
          </div>
          <JiraFilterMenu
            fields={filterFields}
            selected={filterMenuSelected}
            onApply={handleFiltersApply}
            triggerLabel="Filters"
          />
        </div>
        {/* Reusable Dropdown in place of the hand-rolled trigger + menu this
            used to render. The sort/chevron glyphs stay as siblings rather
            than children — the component's trigger is an <input>, which can't
            contain markup — positioned over it by .slp-sort-wrap. */}
        <div className="slp-sort-wrap" onClick={(e) => e.stopPropagation()}>
          <ArrowDownUp size={13} className="slp-sort-icon" aria-hidden />
          <Dropdown
            className="slp-sort-btn"
            searchable={false}
            value={selectedSort}
            options={sortOptions.map((opt) => ({ id: opt, name: opt }))}
            onChange={setSelectedSort}
          />
          <ChevronDown size={13} className="slp-sort-caret" aria-hidden />
        </div>
      </div>

      {/* ===== BULK ACTION BAR ===== */}
      {selectedIds.length > 0 && (
        <div className="slp-bulk-bar">
          <div className="slp-bulk-left">
            <input
              type="checkbox"
              className="slp-checkbox"
              checked={selectedIds.length === items.length && items.length > 0}
              onChange={handleSelectAll}
            />
            <span className="slp-bulk-count">
              {selectedIds.length === items.length ? "All on page selected" : `${selectedIds.length} selected`}
            </span>
            <button className="slp-deselect-btn" onClick={() => setSelectedIds([])}>
              Deselect
            </button>
          </div>
          <div className="slp-bulk-actions">
            <button
              className="slp-bulk-btn slp-bulk-btn--danger"
              onClick={() => setDeleteConfirm({ mode: "bulk" })}
            >
              <Trash size={13} /> Delete selected
            </button>
          </div>
        </div>
      )}

      {/* ===== STAFF TABLE / CARDS ===== */}
      {loading ? (
        <div className="slp-skeleton-wrap">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="slp-skeleton-row">
              <div className="slp-skeleton-check" />
              <div className="slp-skeleton-avatar" />
              <div className="slp-skeleton-info">
                <div className="slp-skeleton-line slp-skeleton-line--name" />
                <div className="slp-skeleton-line slp-skeleton-line--sub" />
              </div>
              <div className="slp-skeleton-line slp-skeleton-line--contact" />
              <div className="slp-skeleton-line slp-skeleton-line--tag" />
              <div className="slp-skeleton-line slp-skeleton-line--tag" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="slp-empty">
          <div className="slp-empty__icon-wrap">
            <PersonBadge size={36} />
          </div>
          <h3 className="slp-empty__title">
            {searchTerm || totalFilterBadge > 0 ? "No results found" : "No staff members yet"}
          </h3>
          <p className="slp-empty__desc">
            {searchTerm || totalFilterBadge > 0
              ? "Try adjusting your search or filters."
              : "Add your first staff member to get started."}
          </p>
          {!searchTerm && totalFilterBadge === 0 && (
            <button
              className="slp-empty__btn"
              onClick={() => navigate("/dashboard/team/add")}
            >
              <PersonPlus size={15} /> Add staff member
            </button>
          )}
        </div>
      ) : (
        <div className="slp-table-card">
          {/* Table Header */}
          <div className="slp-table-header">
            <div className="slp-col-check">
              <input
                type="checkbox"
                className="slp-checkbox"
                checked={selectedIds.length === items.length && items.length > 0}
                onChange={handleSelectAll}
              />
            </div>
            <div className="slp-col-member">Staff member</div>
            <div className="slp-col-code">Staff code</div>
            <div className="slp-col-contact">Contact</div>
            <div className="slp-col-role">Role</div>
            <div className="slp-col-status">Status</div>
            <div className="slp-col-actions" />
          </div>

          {/* Table Rows */}
          {items.map((member) => {
            const isChecked = selectedIds.includes(member.id);
            const isActive = member.is_active ?? true;
            const initials = `${(member.first_name?.[0] || "").toUpperCase()}${(member.last_name?.[0] || "").toUpperCase()}` || "??";
            const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();

            return (
              <div
                key={member.id}
                className={`slp-table-row ${isChecked ? "slp-table-row--selected" : ""} ${deletingId === member.id ? "slp-table-row--deleting" : ""}`}
                onClick={() => {
                  if (!member.id) return;
                  setSelectedMemberId(member.id);
                  setIsDrawerOpen(true);
                }}
              >
                <div className="slp-col-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="slp-checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    onClick={(e) => handleCheck(e, member.id)}
                  />
                </div>

                <div className="slp-col-member">
                  <div
                    className="slp-avatar"
                    style={{ "--avatar-bg": member.calendar_color ? resolveColor(member.calendar_color) : getGradient(member.id) } as React.CSSProperties}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={fullName || "Staff member"} className="slp-avatar-img" />
                    ) : (
                      <span className="slp-avatar-initials">{initials}</span>
                    )}
                  </div>
                  <div className="slp-member-info">
                    <div className="slp-member-name">{fullName || "Unknown"}</div>
                    <div className="slp-member-email">
                      <EnvelopeFill size={10} className="me-1" />
                      {member.email || "—"}
                    </div>
                  </div>
                </div>

                <div className="slp-col-code"><span className="slp-staff-code">{member.staff_code || "—"}</span></div>

                <div className="slp-col-contact">
                  {(member.phone_number || member.phone) ? (
                    <div className="slp-contact-phone">
                      <TelephoneFill size={11} className="me-1" />
                      {member.phone_number || member.phone}
                    </div>
                  ) : (
                    <span className="slp-no-data">—</span>
                  )}
                </div>

                <div className="slp-col-role">
                  {(() => {
                    const m = member as any;
                    const jobTitle = m.job_title || m.jobTitle;
                    const permKey = m.permission_level || m.permissionLevel || m.access_level || m.role;
                    const isManager = String(permKey || "").toLowerCase() === "manager";
                    if (jobTitle) return <span className="slp-role-tag">{jobTitle}</span>;
                    if (isManager) return <span className="slp-role-tag slp-role-tag--perm">Manager</span>;
                    return <span className="slp-role-tag slp-role-tag--default">Staff</span>;
                  })()}
                </div>

                <div className="slp-col-status">
                  <span className={`slp-status-badge ${isActive ? "slp-status-badge--active" : "slp-status-badge--inactive"}`}>
                    <span className="slp-status-dot" />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="slp-col-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="slp-action-wrap">
                    <button
                      className="slp-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuId(actionMenuId === member.id ? null : member.id);
                      }}
                      title="More actions"
                    >
                      <ThreeDots size={16} />
                    </button>
                    {actionMenuId === member.id && (
                      <div className="slp-action-menu">
                        <button
                          className="slp-action-item"
                          onClick={() => { member.id && navigate(`/dashboard/team/${member.id}`); setActionMenuId(null); }}
                        >
                          <Pencil size={13} /> Edit profile
                        </button>
                        <button
                          className="slp-action-item"
                          onClick={() => { member.id && navigate(`/dashboard/team/history/${member.id}`); setActionMenuId(null); }}
                        >
                          <ClockHistory size={13} /> View history
                        </button>
                        <button
                          className="slp-action-item"
                          onClick={() => handleToggleStatus(member)}
                        >
                          <ToggleOn size={13} /> {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <div className="slp-action-divider" />
                        <button
                          className="slp-action-item slp-action-item--danger"
                          onClick={() => { setDeleteConfirm({ mode: "single", id: member.id }); setActionMenuId(null); }}
                          disabled={deletingId === member.id}
                        >
                          <Trash size={13} /> {deletingId === member.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== IMPORT MODAL ===== */}
      <StaffImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchStaff}
      />

      {/* ===== TEAM MEMBER DETAILS DRAWER ===== */}
      <TeamMemberDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        memberId={selectedMemberId}
        onUpdated={fetchStaff}
      />

      {/* ===== DELETE CONFIRMATION ===== */}
      <Modal
        show={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={deleteConfirm?.mode === "bulk" ? "Delete staff members?" : "Delete staff member?"}
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE"}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          {deleteConfirm?.mode === "bulk"
            ? `Are you sure you want to delete ${selectedIds.length} selected staff member${selectedIds.length === 1 ? "" : "s"}? This operation can't be undone.`
            : "Are you sure you want to delete this staff member? This operation can't be undone."}
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>

      {/* ===== FOOTER / PAGINATION ===== */}
      {/* Shared components/ui/Pagination — same component Suppliers/Orders/
          Products/Commission/Tip already use (see SCRUM-2615's own
          requirement to reuse it here instead of this page's old hand-rolled
          prev/next/page-number markup). It renders its own "no rows"
          no-op internally (totalItems === 0), so the !loading guard here is
          just to avoid it flashing during the initial fetch. */}
      {!loading && (
        <Pagination
          className="slp-footer"
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      )}
    </div>
  );
}
