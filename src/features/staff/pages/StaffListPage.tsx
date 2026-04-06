import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
    People
} from "react-bootstrap-icons";
import "../styles/StaffListPage.scss";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";

// UI Components — all from the barrel index
import { Button, Input, Badge, DownloadButton } from "../../../components/ui";
export default function StaffListPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await api.get(STAFF.BASE);
            console.log("STAFF API RESPONSE:", res.data);
            const staffData = res.data?.data?.items || [];
            setStaff(Array.isArray(staffData) ? staffData : []);
        } catch (error) {
            console.error("Error fetching staff", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, [location]);

    const locations = ["Main Branch", "Branch 2", "Branch 3"];
    const sortOptions = [
        "Custom order",
        "Name (A-Z)",
        "Name (Z-A)",
        "Surname (A-Z)",
        "Surname (Z-A)",
        "Started at (oldest first)",
        "Started at (newest first)",
        "Rating (highest first)",
        "Rating (lowest first)",
        "Updated at (oldest first)",
        "Updated at (newest first)",
    ];

    const [searchTerm, setSearchTerm] = useState("");
    const [showFilter, setShowFilter] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState("Custom order");

    // Checkbox & Actions state
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // Filter state
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [bookable, setBookable] = useState(false);
    const [nonBookable, setNonBookable] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "archived">("all");

    const toggleLocation = (loc: string) =>
        setSelectedLocations((prev) => prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]);
    const toggleAllLocations = () =>
        setSelectedLocations((prev) => prev.length === locations.length ? [] : [...locations]);

    const typeBadgeCount = (bookable ? 1 : 0) + (nonBookable ? 1 : 0);
    const totalFilterBadge = selectedLocations.length + typeBadgeCount + (selectedStatus !== "all" ? 1 : 0);

    const clearFilters = () => {
        setSelectedLocations([]); setBookable(false); setNonBookable(false); setSelectedStatus("all");
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? filtered.map((m) => m.id) : []);
    };

    const handleCheck = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const handleDeleteStaff = async (id: number) => {
        try {
            await api.delete(STAFF.BY_ID(id));
            await fetchStaff();
            showToast("Staff member deleted successfully");
        } catch (error) {
            console.error("Error deleting staff", error);
            showToast("Error deleting staff member");
        }
    };



    const filtered = staff.filter((s) => {
        const matchesSearch = (s.first_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (s.last_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (s.email || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(s.location);
        const matchesStatus = selectedStatus === "all" || (selectedStatus === "active" && s.status === "Active") || (selectedStatus === "archived" && s.status === "Inactive");
        return matchesSearch && matchesLocation && matchesStatus;
    });


    return (
        <div className="staff-list-page p-4">

            {/* ===== TOAST ===== */}
            {toast && (
                <div className="sl-toast">
                    <span>{toast}</span>
                    <button className="sl-toast-close" onClick={() => setToast(null)}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {showFilter && (
                <div className="sl-filter-overlay" onClick={() => setShowFilter(false)}>
                    <div className="sl-filter-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="sl-filter-header border-bottom">
                            <button className="sl-close-btn" onClick={() => setShowFilter(false)} type="button">
                                <X size={16} />
                            </button>
                            <h4 className="fw-bold mb-0">All filters</h4>
                        </div>
                        <div className="sl-filter-body">
                            <FilterSection title="Locations" icon={<GeoAlt size={15} />} badge={selectedLocations.length || undefined} onClear={() => setSelectedLocations([])}>
                                <label className="fs-checkbox-row fs-select-all">
                                    <input type="checkbox" checked={selectedLocations.length === locations.length} onChange={toggleAllLocations} />
                                    <span>Select all</span>
                                </label>
                                {locations.map((loc) => (
                                    <label key={loc} className="fs-checkbox-row">
                                        <input type="checkbox" checked={selectedLocations.includes(loc)} onChange={() => toggleLocation(loc)} />
                                        <span className="fs-loc-info"><span className="fs-loc-icon">🏢</span><span>{loc}</span></span>
                                    </label>
                                ))}
                            </FilterSection>
                            <FilterSection title="Type" icon={<Calendar2Check size={15} />} badge={typeBadgeCount || undefined} onClear={() => { setBookable(false); setNonBookable(false); }}>
                                <label className="fs-checkbox-row">
                                    <input type="checkbox" checked={bookable} onChange={() => setBookable(!bookable)} />
                                    <span>Bookable</span>
                                </label>
                                <label className="fs-checkbox-row">
                                    <input type="checkbox" checked={nonBookable} onChange={() => setNonBookable(!nonBookable)} />
                                    <span>Non-bookable</span>
                                </label>
                            </FilterSection>
                            <FilterSection title="Status" icon={<ToggleOn size={15} />} badge={selectedStatus !== "all" ? 1 : undefined} onClear={() => setSelectedStatus("all")}>
                                {(["all", "active", "archived"] as const).map((s) => (
                                    <div key={s} className={`fs-radio-row ${selectedStatus === s ? "fs-radio-active" : ""}`} onClick={() => setSelectedStatus(s)}>
                                        <span>{s === "all" ? "All team members" : s === "active" ? "Active" : "Archived"}</span>
                                        {selectedStatus === s && <span className="fs-radio-check">✓</span>}
                                    </div>
                                ))}
                            </FilterSection>
                        </div>
                        <div className="sl-filter-footer border-top">
                            <button className="sl-clear-btn" onClick={clearFilters}>Clear filters</button>
                            <button className="sl-apply-btn" onClick={() => setShowFilter(false)}>Apply</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== HEADER ===== */}
            <div className="page-header d-flex align-items-center justify-content-between mb-4">
                <div className="header-left">
                    <div className="title-container d-flex align-items-center">
                        <h2 className="page-title mb-0 h4 fw-bold">Team members</h2>
                        <Badge variant="dark" pill className="ms-3 count-badge">{filtered.length}</Badge>
                    </div>
                    <p className="page-subtitle text-muted mt-2 small">
                        Manage your team, their roles and access levels.
                        <span className="learn-more-link text-primary cursor-pointer ms-1"> Learn more</span>
                    </p>
                </div>

                <div className="header-actions d-flex gap-2">
                    <div className="options-dropdown position-relative" onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="outline-dark"
                            onClick={() => setOptionsOpen(!optionsOpen)}
                            iconRight={<ChevronDown size={14} className={`chevron ${optionsOpen ? 'open' : ''}`} />}
                        >
                            Options
                        </Button>
                        {optionsOpen && (
                            <div className="options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 p-2 rounded-3" style={{ width: '210px' }}>
                                <div className="option-item p-2 cursor-pointer hover-bg-light rounded-2 small" onClick={() => setOptionsOpen(false)}>
                                    <span className="me-2">🔗</span> Create share link
                                </div>
                                <div className="option-item p-2 cursor-pointer hover-bg-light rounded-2 small" onClick={() => setOptionsOpen(false)}>
                                    <span className="me-2">⚙️</span> Team settings
                                </div>
                                <div className="divider border-top my-1" />
                                <div className="export-title px-2 py-1 extra-small fw-bold text-muted text-uppercase" style={{ letterSpacing: '0.05em' }}>Export</div>
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
                                    className="option-item w-100 text-start p-2 rounded-2 small"
                                >
                                    CSV
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
                                    className="option-item w-100 text-start p-2 rounded-2 small"
                                >
                                    Excel
                                </DownloadButton>
                            </div>
                        )}
                    </div>
                    <Button variant="dark" pill className="px-4" onClick={() => navigate("/dashboard/team/add")} iconLeft={<PersonPlus size={16} />}>
                        Add
                    </Button>
                </div>
            </div>

            {/* ===== INVITE BANNER ===== */}
            <div className="import-banner mb-4 p-4 rounded-4 position-relative d-flex justify-content-between align-items-center bg-dark text-white overflow-hidden" 
                 style={{ background: 'linear-gradient(90deg, #111827 0%, #1f2937 100%)' }}>
                <div className="banner-content z-1">
                    <h3 className="h5 fw-bold mb-2">Invite your team members</h3>
                    <p className="small text-white-50 mb-3">Invite your staff to use the app and manage their schedules, services, and performance.</p>
                    <div className="banner-actions d-flex align-items-center gap-3">
                        <Button variant="light" pill size="sm" className="fw-bold px-4" onClick={() => navigate("/dashboard/team/add")}>
                            Start inviting
                        </Button>
                        <span className="small text-white-50 cursor-pointer hover-text-white border-bottom border-white-50">Learn more</span>
                    </div>
                </div>
                <div className="banner-image opacity-50">
                    <People size={80} className="text-white-50" />
                </div>
                <button className="banner-close position-absolute top-0 end-0 m-3 border-0 bg-transparent text-white-50 hover-text-white">
                    <X size={20} />
                </button>
            </div>

            {/* ===== SEARCH + SORT ===== */}
            <div className="search-container mb-4">
                <div className="search-section d-flex align-items-center justify-content-between">
                    <div className="search-left d-flex align-items-center gap-2 flex-grow-1 me-3">
                        <div style={{ maxWidth: '400px', flex: 1 }}>
                            <Input
                                placeholder="Search team members"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="mb-0"
                                containerClass="mb-0"
                                iconLeft={<SearchIcon size={16} />}
                            />
                        </div>
                        <Button
                            variant="outline-dark"
                            onClick={() => setShowFilter(true)}
                            iconLeft={<Sliders size={14} />}
                        >
                            Filters
                            {totalFilterBadge > 0 && <Badge variant="dark" pill className="ms-2">{totalFilterBadge}</Badge>}
                        </Button>
                    </div>
                    <div className="sort-dropdown position-relative">
                        <Button
                            variant="outline-dark"
                            onClick={() => setSortOpen(!sortOpen)}
                            iconRight={<ArrowDownUp size={14} />}
                        >
                            {selectedSort}
                        </Button>
                        {sortOpen && (
                            <div className="sort-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden" style={{ width: '220px' }}>
                                {sortOptions.map((opt) => (
                                    <div key={opt} 
                                         className={`sort-item p-3 cursor-pointer small hover-bg-light ${selectedSort === opt ? "bg-light fw-bold" : ""}`} 
                                         onClick={() => { setSelectedSort(opt); setSortOpen(false); }}>
                                        {opt}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ===== TABLE ===== */}
            {loading ? (
                <div className="text-center p-5">Loading team members...</div>
            ) : (
                <div className="table-card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
                    <div className="staff-table">
                        {selectedIds.length > 0 ? (
                            <div className="table-header selected-header py-3 px-4 d-flex align-items-center gap-3 bg-light border-bottom">
                                <div className="col-checkbox">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedIds.length === filtered.length}
                                        onChange={handleSelectAll}
                                    />
                                </div>
                                <div className="selected-actions-container flex-grow-1 d-flex justify-content-between align-items-center">
                                    <div className="selected-count small fw-bold">
                                        {selectedIds.length === filtered.length ? "All selected" : `${selectedIds.length} selected`}
                                        <span className="mx-2 text-muted">•</span>
                                        <button className="bg-transparent border-0 text-primary p-0 h6 mb-0 small fw-bold" onClick={() => setSelectedIds([])}>Deselect</button>
                                    </div>
                                    <div className="selected-actions-buttons d-flex gap-2">
                                        <Button variant="outline-dark" size="sm" pill className="px-3">Bulk edit</Button>
                                        <Button variant="outline-danger" size="sm" pill className="px-3" onClick={() => selectedIds.forEach(id => handleDeleteStaff(id))}>Delete</Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="table-header py-3 px-4 border-bottom bg-light extra-small fw-bold text-muted text-uppercase d-flex align-items-center" style={{ letterSpacing: '0.05em' }}>
                                <div className="col-check" style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                </div>
                                <div className="col-name ms-3 flex-grow-1">Team member</div>
                                <div style={{ width: '200px' }}>Contact</div>
                                <div style={{ width: '150px' }}>Rating</div>
                                <div style={{ width: '100px' }}>Status</div>
                                <div style={{ width: '80px' }}></div>
                            </div>
                        )}

                        {filtered.length === 0 ? (
                            <div className="empty-state text-center p-5">
                                <PersonBadge size={40} className="text-muted opacity-25 mb-3" />
                                <p className="text-muted small">No team members found.</p>
                            </div>
                        ) : (
                            filtered.map((member) => {
                                const isChecked = selectedIds.includes(member.id);
                                return (
                                    <div
                                        key={member.id}
                                        className={`table-row d-flex align-items-center py-3 px-4 border-bottom cursor-pointer transition-all ${isChecked ? "bg-light opacity-75" : "hover-bg-light"}`}
                                        onClick={() => navigate(`/dashboard/team/${member.id}`)}
                                    >
                                        <div className="col-check" style={{ width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={isChecked}
                                                onChange={() => { }}
                                                onClick={(e) => handleCheck(e, member.id)}
                                            />
                                        </div>

                                        <div className="col-name ms-3 d-flex align-items-center flex-grow-1">
                                            <div className="avatar rounded-circle d-flex align-items-center justify-content-center bg-dark text-white fw-bold me-3" 
                                                 style={{ width: '36px', height: '36px', fontSize: '13px', background: 'linear-gradient(135deg, #111827 0%, #374151 100%)' }}>
                                                {(member.first_name?.[0] || 'S').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="name fw-bold small text-dark">{`${member.first_name || ''} ${member.last_name || ''}`}</div>
                                                <div className="email text-muted extra-small">{member.email}</div>
                                            </div>
                                        </div>

                                        <div className="col-contact extra-small text-muted" style={{ width: '200px' }}>
                                            <div className="contact-phone fw-bold text-dark">{member.phone_number || '-'}</div>
                                        </div>

                                        <div className="col-rating" style={{ width: '150px' }}>
                                            <span className="no-reviews extra-small text-muted">No reviews yet</span>
                                        </div>

                                        <div className="col-status" style={{ width: '100px' }}>
                                            <Badge variant={member.status === "Inactive" ? "light" : "success"} pill className="extra-small px-3">
                                                {member.status || "Active"}
                                            </Badge>
                                        </div>

                                        <div className="col-actions text-end" style={{ width: '80px' }} onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" className="p-1 text-muted hover-text-dark" onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/dashboard/team/${member.id}`);
                                            }}>
                                                <Pencil size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <div className="results-text mt-4 text-end extra-small text-muted fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>
                Viewing 1–{filtered.length} of {filtered.length} results
            </div>

        </div>
    );
}


function FilterSection({
    title, icon, badge, onClear, children, defaultOpen = false,
}: {
    title: string; icon: React.ReactNode; badge?: number; onClear?: () => void;
    children: React.ReactNode; defaultOpen?: boolean;
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
                        <span className="fs-clear" onClick={(e) => { e.stopPropagation(); onClear(); }}>Clear</span>
                    )}
                    {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
            </div>
            {open && <div className="fs-section-body">{children}</div>}
        </div>
    );
}
