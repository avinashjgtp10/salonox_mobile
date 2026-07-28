import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import {  selectAllStaff, selectStaffLoading } from "../../../store/selectors/slices.selectors";
import { fetchStaffThunk, deleteStaffThunk, activateStaffThunk, deactivateStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  Search as SearchIcon,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowDownUp,
  X,
  PersonBadge,
  PersonPlus,
  Calendar2Check,
  ToggleOn,
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
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { Button, Input, DownloadButton, Modal } from "../../../components/ui";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import StaffImportModal from "../components/StaffImportModal";
import TeamMemberDrawer from "../components/TeamMemberDrawer";
import { exportStaffPDF } from "../utils/staffExport";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  phone?: string;
  status?: string;
  invitation_status?: string;
  job_title?: string;
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

const PERMISSION_LABELS: Record<string, string> = {
  no_access: "No Access",
  basic:     "Basic",
  low:       "Low",
  medium:    "Medium",
  high:      "High",
  manager:   "Manager",
};

export default function StaffListPage() {
  const navigate = useNavigate();

  const dispatch = useDispatch<AppDispatch>();
  const staff = useSelector(selectAllStaff) as unknown as StaffMember[];
  const loadingState = useSelector(selectStaffLoading);
  // Using loading boolean depending on structure (usually boolean, but sometimes object)
  const loading = typeof loadingState === "boolean" ? loadingState : (loadingState as any)?.fetch || false;
  
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
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

    // Poll every 30 s to detect invitation acceptance without hammering the server
    const pollInterval = setInterval(fetchStaff, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchStaff]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setOptionsOpen(false);
      setSortOpen(false);
      setActionMenuId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const totalFilterBadge =
    (bookable ? 1 : 0) +
    (nonBookable ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0);

  const clearFilters = () => {
    setBookable(false);
    setNonBookable(false);
    setSelectedStatus("all");
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

  // CSV/Excel exports hit the backend directly rather than exporting the
  // already-loaded `staff` array, so the current search/status filters have
  // to be forwarded explicitly or the server just returns every record.
  const exportQueryParams = () => ({
    search: searchTerm.trim() || undefined,
    is_active: selectedStatus === "all" ? undefined : selectedStatus === "active",
  });

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pagedSorted = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage, PAGE_SIZE]
  );

  // Reset to page 1 when search / filter / sort changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedSort, bookable, nonBookable, selectedStatus]);

  const rangeFrom = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(currentPage * PAGE_SIZE, sorted.length);

  return (
    <div className="staff-list-page">
      {overlay}

      {/* ===== FILTER DRAWER ===== */}
      {showFilter && (
        <div className="sl-filter-overlay" onClick={() => setShowFilter(false)}>
          <div className="sl-filter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sl-filter-header">
              <button className="sl-close-btn" onClick={() => setShowFilter(false)}>
                <X size={16} />
              </button>
              <h4>All filters</h4>
            </div>
            <div className="sl-filter-body">
              <FilterSection
                title="Type"
                icon={<Calendar2Check size={15} />}
                badge={(bookable ? 1 : 0) + (nonBookable ? 1 : 0) || undefined}
                onClear={() => { setBookable(false); setNonBookable(false); }}
              >
                <label className="fs-checkbox-row">
                  <input type="checkbox" checked={bookable} onChange={() => setBookable(!bookable)} />
                  <span>Bookable</span>
                </label>
                <label className="fs-checkbox-row">
                  <input type="checkbox" checked={nonBookable} onChange={() => setNonBookable(!nonBookable)} />
                  <span>Non-bookable</span>
                </label>
              </FilterSection>

              <FilterSection
                title="Status"
                icon={<ToggleOn size={15} />}
                badge={selectedStatus !== "all" ? 1 : undefined}
                onClear={() => setSelectedStatus("all")}
              >
                {(["all", "active", "archived"] as const).map((s) => (
                  <div
                    key={s}
                    className={`fs-radio-row ${selectedStatus === s ? "fs-radio-active" : ""}`}
                    onClick={() => setSelectedStatus(s)}
                  >
                    <span>
                      {s === "all" ? "All staff members" : s === "active" ? "Active" : "Inactive"}
                    </span>
                    {selectedStatus === s && <span className="fs-radio-check">✓</span>}
                  </div>
                ))}
              </FilterSection>
            </div>
            <div className="sl-filter-footer">
              <button className="sl-clear-btn" onClick={clearFilters}>Clear filters</button>
              <button className="sl-apply-btn" onClick={() => setShowFilter(false)}>Apply</button>
            </div>
          </div>
        </div>
      )}

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
                    const res = await api.get(STAFF.EXPORT("csv"), {
                      responseType: "blob",
                      params: exportQueryParams(),
                    });
                    setOptionsOpen(false);
                    return res.data;
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
                    const res = await api.get(STAFF.EXPORT("excel"), {
                      responseType: "blob",
                      params: exportQueryParams(),
                    });
                    setOptionsOpen(false);
                    return res.data;
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
          <button
            className="slp-filter-btn"
            onClick={() => setShowFilter(true)}
          >
            <Sliders size={14} />
            Filters
            {totalFilterBadge > 0 && (
              <span className="slp-filter-count">{totalFilterBadge}</span>
            )}
          </button>
        </div>
        <div className="slp-sort-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="slp-sort-btn" onClick={() => setSortOpen(!sortOpen)}>
            <ArrowDownUp size={13} />
            {selectedSort}
            <ChevronDown size={13} />
          </button>
          {sortOpen && (
            <div className="slp-sort-menu">
              {sortOptions.map((opt) => (
                <div
                  key={opt}
                  className={`slp-sort-item ${selectedSort === opt ? "active" : ""}`}
                  onClick={() => { setSelectedSort(opt); setSortOpen(false); }}
                >
                  {opt}
                  {selectedSort === opt && <span className="slp-sort-check">✓</span>}
                </div>
              ))}
            </div>
          )}
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
                    onChange={() => { }}
                    onClick={(e) => handleCheck(e, member.id)}
                  />
                </div>

                <div className="slp-col-member">
                  <div
                    className="slp-avatar"
                    style={{ "--avatar-bg": member.calendar_color ? resolveColor(member.calendar_color) : getGradient(member.id) } as React.CSSProperties}
                  >
                    <span className="slp-avatar-initials">{initials}</span>
                  </div>
                  <div className="slp-member-info">
                    <div className="slp-member-name">{fullName || "Unknown"}</div>
                    <div className="slp-member-email">
                      <EnvelopeFill size={10} className="me-1" />
                      {member.email || "—"}
                    </div>
                  </div>
                </div>

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
                    const label = PERMISSION_LABELS[permKey] || permKey;
                    if (jobTitle) return <span className="slp-role-tag">{jobTitle}</span>;
                    if (label) return <span className="slp-role-tag slp-role-tag--perm">{label}</span>;
                    return <span className="slp-role-tag slp-role-tag--default">Staff</span>;
                  })()}
                </div>

                <div className="slp-col-status">
                  <span className={`slp-status-badge ${isActive ? 'slp-status-badge--active' : 'slp-status-badge--inactive'}`}>
                    <span className="slp-status-dot" />
                    {isActive ? 'Active' : 'Inactive'}
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
      />

      {/* ===== DELETE CONFIRMATION ===== */}
      <Modal
        show={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={deleteConfirm?.mode === "bulk" ? "Delete staff members?" : "Delete staff member?"}
        size="sm"
      >
        <p className="mb-0">
          {deleteConfirm?.mode === "bulk"
            ? `Are you sure you want to delete ${selectedIds.length} selected staff member${selectedIds.length === 1 ? "" : "s"}?`
            : "Are you sure you want to delete this staff member?"}
        </p>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-outline-secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleConfirmDelete}>
            Delete
          </button>
        </div>
      </Modal>

      {/* ===== FOOTER / PAGINATION ===== */}
      {!loading && sorted.length > 0 && (
        <div className="slp-footer">
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

// ─── Filter Section Sub-component ────────────────────────────────────────────
function FilterSection({
  title,
  icon,
  badge,
  onClear,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: number;
  onClear?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="fs-section">
      <div className="fs-section-header" onClick={() => setOpen(!open)}>
        <div className="fs-section-title">
          {icon}
          <span>{title}</span>
          {badge ? <span className="fs-badge">{badge}</span> : null}
        </div>
        <div className="fs-right">
          {badge && onClear && (
            <span className="fs-clear" onClick={(e) => { e.stopPropagation(); onClear(); }}>
              Clear
            </span>
          )}
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>
      {open && <div className="fs-section-body">{children}</div>}
    </div>
  );
}