import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    Search,
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
} from "react-bootstrap-icons";
import "../styles/StaffListPage.scss";
import { getStaff, deleteStaff, exportStaff } from "../services/staffService";

export default function StaffListPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await getStaff();
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
    const [actionsOpenId, setActionsOpenId] = useState<number | null>(null);
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

    const typeBadge = (bookable ? 1 : 0) + (nonBookable ? 1 : 0);
    const totalFilterBadge = selectedLocations.length + typeBadge + (selectedStatus !== "all" ? 1 : 0);

    const clearFilters = () => {
        setSelectedLocations([]); setBookable(false); setNonBookable(false); setSelectedStatus("all");
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? filtered.map((m) => m.id) : []);
    };

    const handleCheck = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
        setActionsOpenId((prev) => {
            const isChecked = !selectedIds.includes(id);
            return isChecked ? id : (prev === id ? null : prev);
        });
    };

    const handleDeleteStaff = async (id: number) => {
        try {
            await deleteStaff(id);
            await fetchStaff();
            showToast("Staff member deleted successfully");
        } catch (error) {
            console.error("Error deleting staff", error);
            showToast("Error deleting staff member");
        }
    };

    const handleExportExcel = async () => {
        try {
            const res = await exportStaff("excel");
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "staff.xlsx");
            document.body.appendChild(link);
            link.click();
            link.remove();
            setOptionsOpen(false);
        } catch (error) {
            console.error("Export error:", error);
            showToast("Error exporting staff");
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await exportStaff("csv");
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "staff.csv");
            document.body.appendChild(link);
            link.click();
            link.remove();
            setOptionsOpen(false);
        } catch (error) {
            console.error("Export error:", error);
            showToast("Error exporting staff");
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

    const actionItems = [
        { label: "Edit", onClick: (id: number) => navigate(`/dashboard/team/${id}`) },
        { label: "View calendar", onClick: () => navigate("/dashboard/calendar") },
        { label: "View scheduled shifts", onClick: () => navigate("/dashboard/team/shifts") },
        { label: "Delete", onClick: (id: number) => handleDeleteStaff(id), className: "text-danger" },
    ];

    return (
        <div className="staff-list-page" onClick={() => { setActionsOpenId(null); setOptionsOpen(false); }}>

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
                        <div className="sl-filter-header">
                            <h4>All filters</h4>
                            <button className="sl-close-btn" onClick={() => setShowFilter(false)} type="button">
                                <X size={16} />
                            </button>
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
                            <FilterSection title="Type" icon={<Calendar2Check size={15} />} badge={typeBadge || undefined} onClear={() => { setBookable(false); setNonBookable(false); }}>
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
                        <div className="sl-filter-footer">
                            <button className="sl-clear-btn" onClick={clearFilters}>Clear filters</button>
                            <button className="sl-apply-btn" onClick={() => setShowFilter(false)}>Apply</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== HEADER ===== */}
            <div className="page-header">
                <div>
                    <h4>Team members <span className="count-badge">{filtered.length}</span></h4>
                    <p>Manage your team, their roles and access levels.</p>
                </div>
                <div className="header-actions">
                    {/* OPTIONS BUTTON */}
                    <div className="options-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="btn-outline options-btn"
                            onClick={() => setOptionsOpen(!optionsOpen)}
                        >
                            Options {optionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {optionsOpen && (
                            <div className="options-menu">
                                <div className="options-item" onClick={() => setOptionsOpen(false)}>
                                    <span className="opt-icon">🔗</span> Create share link
                                </div>
                                <div className="options-item" onClick={() => setOptionsOpen(false)}>
                                    <span className="opt-icon">⚙️</span> Team settings
                                </div>
                                <div className="options-divider" />
                                <div className="options-label">Export</div>
                                <div className="options-item" onClick={handleExportCSV}>
                                    <FiletypeCsv size={14} /> CSV
                                </div>
                                <div className="options-item" onClick={handleExportExcel}>
                                    <FileEarmarkExcel size={14} /> Excel
                                </div>
                            </div>
                        )}
                    </div>
                    {/* ADD BUTTON */}
                    <button className="btn-dark" onClick={() => navigate("/dashboard/team/add")}>
                        <PersonPlus size={16} /> Add
                    </button>
                </div>
            </div>

            {/* ===== SEARCH + SORT ===== */}
            <div className="search-container">
                <div className="search-section">
                    <div className="search-left">
                        <div className="search-box">
                            <Search size={16} />
                            <input type="text" placeholder="Search team members" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <button className="btn-outline filters-btn" onClick={() => setShowFilter(true)}>
                            <Sliders size={14} /> Filters
                            {totalFilterBadge > 0 && <span className="filter-badge">{totalFilterBadge}</span>}
                        </button>
                    </div>
                    <div className="sort-dropdown">
                        <button className="btn-outline sort-btn" onClick={() => setSortOpen(!sortOpen)}>
                            <ArrowDownUp size={14} /> {selectedSort} <ChevronDown size={13} />
                        </button>
                        {sortOpen && (
                            <div className="sort-menu">
                                {sortOptions.map((opt) => (
                                    <div key={opt} className={`sort-item ${selectedSort === opt ? "active" : ""}`} onClick={() => { setSelectedSort(opt); setSortOpen(false); }}>{opt}</div>
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
                <div className="table-card">
                    <div className="staff-table">

                        {/* TABLE HEADER */}
                        <div className="table-header">
                            <div className="col-check">
                                <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={handleSelectAll} />
                            </div>
                            <div className="col-name">Name</div>
                            <div>Contact</div>
                            <div>Rating</div>
                            <div></div>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="empty-state">
                                <PersonBadge size={40} />
                                <p>No team members found.</p>
                            </div>
                        ) : (
                            filtered.map((member) => {
                                const isChecked = selectedIds.includes(member.id);
                                const actionsOpen = actionsOpenId === member.id;
                                return (
                                    <div
                                        key={member.id}
                                        className={`table-row ${isChecked ? "row-selected" : ""}`}
                                        onClick={() => navigate(`/dashboard/team/${member.id}`)}
                                    >
                                        {/* CHECKBOX */}
                                        <div className="col-check">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => { }}
                                                onClick={(e) => handleCheck(e, member.id)}
                                            />
                                        </div>

                                        {/* NAME */}
                                        <div className="col-name">
                                            <div className="avatar">{(member.first_name?.[0] || 'S').toUpperCase()}</div>
                                            <div>
                                                <div className="name">{`${member.first_name || ''} ${member.last_name || ''}`}</div>
                                                <div className="email">{member.email}</div>
                                            </div>
                                        </div>

                                        {/* CONTACT */}
                                        <div className="col-contact">
                                            <div className="contact-email">{member.email || '-'}</div>
                                            <div className="contact-phone">{member.phone_number || '-'}</div>
                                        </div>

                                        {/* RATING */}
                                        <div className="col-rating">
                                            <span className="no-reviews">No reviews yet</span>
                                        </div>

                                        {/* ACTIONS — only visible when row is checked */}
                                        <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                                            {isChecked && (
                                                <div className="actions-wrapper">
                                                    <button
                                                        className="actions-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionsOpenId(actionsOpen ? null : member.id);
                                                        }}
                                                    >
                                                        Actions <ChevronDown size={13} />
                                                    </button>
                                                    {actionsOpen && (
                                                        <div className="actions-menu">
                                                            {actionItems.map((item) => (
                                                                <div
                                                                    key={item.label}
                                                                    className={`action-item ${item.className || ''}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActionsOpenId(null);
                                                                        item.onClick(member.id);
                                                                    }}
                                                                >
                                                                    {item.label}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            <div className="results-text">
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
