import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import {  selectAllStaff, selectStaffLoading } from "../../../store/selectors/slices.selectors";
import { fetchStaffThunk, deleteStaffThunk, activateStaffThunk, deactivateStaffThunk } from "../../../middleware/staff/staff.thunk";
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
  TelephoneFill,
  EnvelopeFill,
} from "react-bootstrap-icons";
import "../styles/StaffListPage.scss";

import Dropdown from "../../../components/ui/Dropdown";
import { Button, Input, DownloadButton, Modal, JiraFilterMenu } from "../../../components/ui";
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

export default function StaffListPage() {
  const navigate = useNavigate();

  const dispatch = useDispatch<AppDispatch>();
  const staff = useSelector(selectAllStaff) as unknown as StaffMember[];
  const loadingState = useSelector(selectStaffLoading);
  // Using loading boolean depending on structure (usually boolean, but sometimes object)
  const loading = typeof loadingState === "boolean" ? loadingState : (loadingState as any)?.fetch || false;
  
  const PAGE_SIZE_OPTIONS = [10, 12, 20, 25, 50];
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
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

  const fetchStaff = useCallback(async () => {
    try {
      await dispatch(fetchStaffThunk()).unwrap();
    } catch (error: any) {
      console.error("Error fetching staff", error);
      showToast(`Failed to load staff members: ${error || "Unknown error"}`, "error");
    }
  }, [dispatch, showToast]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filtered.map((m) => m.id) : []);
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

  const filtered = staff.filter((s) => {
    const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone_number || s.phone || "").includes(searchTerm);
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && (s.is_active !== false)) ||
      (selectedStatus === "archived" && s.is_active === false);
    const matchesBookable =
      !bookable && !nonBookable
        ? true
        : (bookable && s.allow_calendar_bookings) ||
        (nonBookable && !s.allow_calendar_bookings);
    return matchesSearch && matchesStatus && matchesBookable;
  });

  const sorted = [...filtered].sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
    if (selectedSort === "Name (A-Z)") return nameA.localeCompare(nameB);
    if (selectedSort === "Name (Z-A)") return nameB.localeCompare(nameA);
    if (selectedSort === "Started at (oldest first)" || selectedSort === "Started at (newest first)") {
      const startedA = new Date((a as any).joined_date || a.created_at || 0).getTime();
      const startedB = new Date((b as any).joined_date || b.created_at || 0).getTime();
      return selectedSort === "Started at (oldest first)" ? startedA - startedB : startedB - startedA;
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pagedSorted = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize]
  );

  // Reset to page 1 when search / filter / sort / page size changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedSort, bookable, nonBookable, selectedStatus, pageSize]);

  const rangeFrom = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeTo = Math.min(currentPage * pageSize, sorted.length);

  return (
    <div className="staff-list-page">
      {overlay}

      {/* ===== HEADER ===== */}
      <div className="slp-header">
        <div className="slp-header__left">
          <div className="slp-title-row">
            <h2 className="slp-title">Staff members</h2>
            <span className="slp-count-badge">{sorted.length}</span>
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
                    const blob = exportStaffCSV(sorted);
                    setOptionsOpen(false);
                    return blob;
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
                    const blob = await exportStaffExcel(sorted);
                    setOptionsOpen(false);
                    return blob;
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
                    const blob = exportStaffPDF(sorted);
                    setOptionsOpen(false);
                    return blob;
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
              checked={selectedIds.length === sorted.length && sorted.length > 0}
              onChange={handleSelectAll}
            />
            <span className="slp-bulk-count">
              {selectedIds.length === sorted.length ? "All selected" : `${selectedIds.length} selected`}
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
      ) : sorted.length === 0 ? (
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
                checked={selectedIds.length === sorted.length && sorted.length > 0}
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
          {pagedSorted.map((member) => {
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
      {!loading && sorted.length > 0 && (
        <div className="slp-footer">
          <div className="slp-footer-size">
            <span>Rows per page:</span>
            <div className="slp-footer-size-wrap">
              <Dropdown
                searchable={false}
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS.map((sz) => ({ id: String(sz), name: String(sz) }))}
                onChange={(id) => setPageSize(Number(id))}
              />
              <ChevronDown size={12} className="slp-footer-size-icon" />
            </div>
          </div>

          <span className="slp-footer-results">
            Showing <strong>{rangeFrom}–{rangeTo}</strong> of <strong>{sorted.length}</strong> staff members
          </span>

          <div className="slp-pagination">
            <button
              className="slp-page-btn"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "…" ? (
                  <span key={`e-${idx}`} className="slp-page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`slp-page-btn${currentPage === p ? " slp-page-btn--active" : ""}`}
                    onClick={() => setCurrentPage(p as number)}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              className="slp-page-btn"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
