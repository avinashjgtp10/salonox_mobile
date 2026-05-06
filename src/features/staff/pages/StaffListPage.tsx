import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { selectCurrentSalon, selectAllStaff, selectStaffLoading } from "../../../store/selectors/slices.selectors";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  Search as SearchIcon,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowDownUp,
  X,
  PersonBadge,
  PersonPlus,
  GeoAlt,
  Calendar2Check,
  ToggleOn,
  FileEarmarkExcel,
  FiletypeCsv,
  Pencil,
  People,
  Trash,
  ThreeDots,
  StarFill,
  TelephoneFill,
  EnvelopeFill,
  CheckCircleFill,
  ExclamationCircleFill,
} from "react-bootstrap-icons";
import "../styles/StaffListPage.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { Button, Input, DownloadButton } from "../../../components/ui";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  status?: string;
  invitation_status?: string;
  job_title?: string;
  calendar_color?: string;
  location?: string;
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

export default function StaffListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const dispatch = useDispatch<AppDispatch>();
  const staff = useSelector(selectAllStaff) as unknown as StaffMember[];
  const loadingState = useSelector(selectStaffLoading);
  // Using loading boolean depending on structure (usually boolean, but sometimes object)
  const loading = typeof loadingState === "boolean" ? loadingState : (loadingState as any)?.fetch || false;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Custom order");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter state
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [bookable, setBookable] = useState(false);
  const [nonBookable, setNonBookable] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "archived">("all");

  const locations = ["Main Branch", "Branch 2", "Branch 3"];
  const sortOptions = [
    "Custom order",
    "Name (A-Z)",
    "Name (Z-A)",
    "Started at (oldest first)",
    "Started at (newest first)",
    "Rating (highest first)",
  ];

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;

  const fetchStaff = useCallback(async () => {
    try {
      await dispatch(fetchStaffThunk()).unwrap();
    } catch (error: any) {
      console.error("Error fetching staff", error);
      showToast(`Failed to load team members: ${error || "Unknown error"}`, "error");
    }
  }, [dispatch, showToast]);

  useEffect(() => {
    fetchStaff();
    
    // Polling: Auto-refresh staff list every 10 seconds to detect invitation acceptance
    const pollInterval = setInterval(() => {
      fetchStaff();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [location.pathname, fetchStaff]);

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

  const toggleLocation = (loc: string) =>
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  const toggleAllLocations = () =>
    setSelectedLocations((prev) => (prev.length === locations.length ? [] : [...locations]));

  const totalFilterBadge =
    selectedLocations.length +
    (bookable ? 1 : 0) +
    (nonBookable ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSelectedLocations([]);
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
      const params = new URLSearchParams();
      if (salonId) params.set("salon_id", String(salonId));
      await api.delete(`${STAFF.BY_ID(id)}?${params.toString()}`);
      await fetchStaff();
      showToast("Team member deleted successfully");
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch {
      showToast("Failed to delete team member", "error");
    } finally {
      setDeletingId(null);
      setActionMenuId(null);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const params = new URLSearchParams();
      if (salonId) params.set("salon_id", String(salonId));
      await api.post(`${STAFF.BY_ID(id)}/resend-invite?${params.toString()}`);
      showToast("Invitation resent successfully");
    } catch {
      showToast("Failed to resend invitation", "error");
    } finally {
      setActionMenuId(null);
    }
  };

  const handleToggleStatus = async (member: StaffMember) => {
    const isActive = (member.status || "Active").toLowerCase() === "active";
    try {
      const params = new URLSearchParams();
      if (salonId) params.set("salon_id", String(salonId));
      const url = isActive ? STAFF.DEACTIVATE(member.id) : STAFF.ACTIVATE(member.id);
      await api.patch(`${url}?${params.toString()}`);
      showToast(`${member.first_name} ${isActive ? "deactivated" : "activated"} successfully`);
      fetchStaff();
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
      (s.phone_number || "").includes(searchTerm);
    const matchesLocation =
      selectedLocations.length === 0 || selectedLocations.includes(s.location || "");
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && (s.is_active !== false)) ||
      (selectedStatus === "archived" && s.is_active === false);
    const matchesBookable =
      !bookable && !nonBookable
        ? true
        : (bookable && s.allow_calendar_bookings) ||
        (nonBookable && !s.allow_calendar_bookings);
    return matchesSearch && matchesLocation && matchesStatus && matchesBookable;
  });

  const sorted = [...filtered].sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
    if (selectedSort === "Name (A-Z)") return nameA.localeCompare(nameB);
    if (selectedSort === "Name (Z-A)") return nameB.localeCompare(nameA);
    return 0;
  });

  return (
    <div className="staff-list-page">
      {/* ===== TOAST ===== */}
      {toast && (
        <div className={`sl-toast ${toast.type === "error" ? "sl-toast--error" : ""}`}>
          {toast.type === "success" ? (
            <CheckCircleFill size={16} className="sl-toast-icon" />
          ) : (
            <ExclamationCircleFill size={16} className="sl-toast-icon" />
          )}
          <span>{toast.msg}</span>
          <button className="sl-toast-close" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

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
                title="Locations"
                icon={<GeoAlt size={15} />}
                badge={selectedLocations.length || undefined}
                onClear={() => setSelectedLocations([])}
              >
                <label className="fs-checkbox-row fs-select-all">
                  <input
                    type="checkbox"
                    checked={selectedLocations.length === locations.length}
                    onChange={toggleAllLocations}
                  />
                  <span>Select all</span>
                </label>
                {locations.map((loc) => (
                  <label key={loc} className="fs-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc)}
                      onChange={() => toggleLocation(loc)}
                    />
                    <span className="fs-loc-info">
                      <span className="fs-loc-icon">🏢</span>
                      <span>{loc}</span>
                    </span>
                  </label>
                ))}
              </FilterSection>

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
                      {s === "all" ? "All team members" : s === "active" ? "Active" : "Archived"}
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
            <h2 className="slp-title">Team members</h2>
            <span className="slp-count-badge">{sorted.length}</span>
          </div>
          <p className="slp-subtitle">
            Manage your team, their roles and access levels.
            <span className="slp-learn-more">Learn more</span>
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
                  <span>⚙️</span> Team settings
                </div>
                <div className="slp-option-divider" />
                <div className="slp-option-label">Export</div>
                <DownloadButton
                  filename="staff.csv"
                  fetcher={async () => {
                    const res = await api.get(STAFF.EXPORT("csv"), { responseType: "blob" });
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
                    const res = await api.get(STAFF.EXPORT("excel"), { responseType: "blob" });
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

      {/* ===== INVITE BANNER ===== */}
      <div className="slp-invite-banner">
        <div className="slp-banner-content">
          <div className="slp-banner-icon-wrap">
            <People size={28} />
          </div>
          <div>
            <h3 className="slp-banner-title">Invite your team members</h3>
            <p className="slp-banner-desc">
              Invite your staff to use the app and manage their schedules, services, and performance.
            </p>
          </div>
        </div>
        <div className="slp-banner-actions">
          <button className="slp-banner-btn" onClick={() => navigate("/dashboard/team/add")}>
            Start inviting
          </button>
          <span className="slp-banner-link">Learn more</span>
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
            <button className="slp-bulk-btn slp-bulk-btn--outline">Bulk edit</button>
            <button
              className="slp-bulk-btn slp-bulk-btn--danger"
              onClick={() => selectedIds.forEach((id) => handleDeleteStaff(id))}
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
            {searchTerm || totalFilterBadge > 0 ? "No results found" : "No team members yet"}
          </h3>
          <p className="slp-empty__desc">
            {searchTerm || totalFilterBadge > 0
              ? "Try adjusting your search or filters."
              : "Add your first team member to get started."}
          </p>
          {!searchTerm && totalFilterBadge === 0 && (
            <button
              className="slp-empty__btn"
              onClick={() => navigate("/dashboard/team/add")}
            >
              <PersonPlus size={15} /> Add team member
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
            <div className="slp-col-member">Team member</div>
            <div className="slp-col-contact">Contact</div>
            <div className="slp-col-role">Role</div>
            <div className="slp-col-status">Status</div>
            <div className="slp-col-actions" />
          </div>

          {/* Table Rows */}
          {sorted.map((member) => {
            const isChecked = selectedIds.includes(member.id);
            const isActive = member.is_active ?? true;
            const rawStatus = (member.status || member.invitation_status || "").toUpperCase();
            const isPending = rawStatus === "PENDING";
            const isAccepted = rawStatus === "ACCEPTED";
            const initials = `${(member.first_name?.[0] || "").toUpperCase()}${(member.last_name?.[0] || "").toUpperCase()}` || "??";
            const fullName = `${member.first_name || ""} ${member.last_name || ""}`.trim();

            return (
              <div
                key={member.id}
                className={`slp-table-row ${isChecked ? "slp-table-row--selected" : ""} ${deletingId === member.id ? "slp-table-row--deleting" : ""}`}
                onClick={() => member.id && navigate(`/dashboard/team/${member.id}`)}
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
                    style={{ background: member.calendar_color ? undefined : getGradient(member.id) }}
                  >
                    {member.calendar_color ? (
                      <span className="slp-avatar-initials" style={{ background: member.calendar_color }}>
                        {initials}
                      </span>
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

                <div className="slp-col-contact">
                  {member.phone_number ? (
                    <div className="slp-contact-phone">
                      <TelephoneFill size={11} className="me-1" />
                      {member.phone_number}
                    </div>
                  ) : (
                    <span className="slp-no-data">—</span>
                  )}
                </div>

                <div className="slp-col-role">
                  {member.job_title ? (
                    <span className="slp-role-tag">{member.job_title}</span>
                  ) : member.permission_level ? (
                    <span className="slp-role-tag slp-role-tag--perm">{member.permission_level}</span>
                  ) : (
                    <span className="slp-no-data">—</span>
                  )}
                </div>

                <div className="slp-col-status">
                  <span className={`slp-status-badge ${isPending ? 'slp-status-badge--pending' : isAccepted ? 'slp-status-badge--accepted' : isActive ? 'slp-status-badge--active' : 'slp-status-badge--inactive'}`}>
                    <span className="slp-status-dot" />
                    {isPending ? 'Pending Acceptance' : isAccepted ? 'Accepted' : isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="slp-col-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="slp-edit-btn"
                    onClick={(e) => { e.stopPropagation(); member.id && navigate(`/dashboard/team/${member.id}`); }}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
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
                        {isPending && (
                          <button
                            className="slp-action-item"
                            onClick={() => { member.id && handleResendInvite(member.id); }}
                          >
                            <EnvelopeFill size={13} /> Resend invite
                          </button>
                        )}
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
                          onClick={() => handleDeleteStaff(member.id)}
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

      {/* ===== FOOTER ===== */}
      {!loading && sorted.length > 0 && (
        <div className="slp-footer">
          <span className="slp-footer-results">
            Showing <strong>{sorted.length}</strong> of <strong>{staff.length}</strong> team members
          </span>
          <div className="slp-footer-rating">
            <StarFill size={12} className="me-1" style={{ color: "#f59e0b" }} />
            <span>Ratings coming soon</span>
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
