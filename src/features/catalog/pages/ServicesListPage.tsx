import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronDown,
    Search,
    Sliders,
    ArrowsExpand,
    Link45deg,
    ArrowDownUp,
    Gear,
    FileEarmarkPdf,
    FileEarmarkExcel,
    FiletypeCsv
} from "react-bootstrap-icons";
import { useServices } from "../hooks/useServices.ts";
import ServiceFilterDrawer from "../components/ServiceFilterDrawer.tsx";
import ManageOrderModal from "../components/ManageOrderModal.tsx";
import ServiceActionsMenu from "../components/ServiceActionsMenu.tsx";
import "../styles/ServicesListPage.scss";

const ServicesListPage: React.FC = () => {
    const navigate = useNavigate();
    const { services, categories, loading, error, fetchServices } = useServices();
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [showManageOrder, setShowManageOrder] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [actionsMenuServiceId, setActionsMenuServiceId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        status: "Active",
        type: "All types",
        teamMember: "Any team member",
        onlineBooking: "All status",
        commissions: "All status",
        resourceRequirements: "All status",
    });

    useEffect(() => { fetchServices(); }, []);

    const groupedServices = useMemo(() => {
        const filtered = services.filter((svc: any) => {
            const matchesCategory = selectedCategory === "all" || svc.categoryId === selectedCategory;
            const matchesSearch = svc.name.toLowerCase().includes(searchQuery.toLowerCase());

            // Simple status filter logic for now
            const matchesStatus = filters.status === "All status" ||
                (filters.status === "Active" && svc.status !== "inactive") ||
                (filters.status === "Inactive" && svc.status === "inactive");

            return matchesCategory && matchesSearch && matchesStatus;
        });

        const groups: Record<string, { id: string, name: string, services: any[] }> = {};

        categories.forEach(cat => {
            if (selectedCategory === "all" || selectedCategory === cat.id) {
                groups[cat.id] = { id: cat.id, name: cat.name, services: [] };
            }
        });

        filtered.forEach(svc => {
            if (groups[svc.categoryId]) {
                groups[svc.categoryId].services.push(svc);
            }
        });

        return Object.values(groups).filter(g => g.services.length > 0);
    }, [services, categories, selectedCategory, searchQuery]);

    return (
        <div className="services-list-page">
            <header className="services-list-page__header">
                <div className="header-left">
                    <div className="title-content">
                        <h1>Service menu</h1>
                        <p>View and manage the services offered by your business. <a href="#" className="learn-more">Learn more</a></p>
                    </div>
                </div>
                <div className="services-list-page__actions">
                    <div className="dropdown">
                        <button className="btn btn-options" data-bs-toggle="dropdown">
                            Options <ChevronDown size={14} className="ms-1" />
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-4 py-2 mt-2" style={{ minWidth: '240px' }}>
                            <li><button className="dropdown-item d-flex align-items-center py-2 px-3 fw-medium"><Link45deg className="me-3" size={18} /> Quick booking link</button></li>
                            <li><button className="dropdown-item d-flex align-items-center py-2 px-3 fw-medium" onClick={() => setShowManageOrder(true)}><ArrowDownUp className="me-3" size={16} /> Set menu order</button></li>
                            <li><button className="dropdown-item d-flex align-items-center py-2 px-3 fw-medium"><ArrowDownUp className="me-3" size={16} /> Set booking sequence</button></li>
                            <li><button className="dropdown-item d-flex align-items-center py-2 px-3 fw-medium"><Gear className="me-3" size={16} /> Settings</button></li>
                            <li><hr className="dropdown-divider my-2 opacity-50" /></li>
                            <li><button className="dropdown-item d-flex align-items-center py-2 px-3 fw-medium"><FileEarmarkPdf className="me-3" size={16} /> Download PDF</button></li>
                            <li><button className="dropdown-item d-flex align-items-center py-2 px-3 fw-medium"><FileEarmarkExcel className="me-3" size={16} /> Download Excel</button></li>
                            <li><button className="dropdown-item d-flex align-items-center py-2 px-3 fw-medium"><FiletypeCsv className="me-3" size={16} /> Download CSV</button></li>
                        </ul>
                    </div>
                    <div className="dropdown">
                        <button className="btn btn-add-new" data-bs-toggle="dropdown">
                            Add <ChevronDown size={14} className="ms-1" />
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-4">
                            <li><button className="dropdown-item py-2" onClick={() => navigate("/dashboard/catalog/services/add?type=single")}>Single Service</button></li>
                            <li><button className="dropdown-item py-2" onClick={() => navigate("/dashboard/catalog/services/add?type=bundle")}>Bundle</button></li>
                            <li><button className="dropdown-item py-2" onClick={() => navigate("/dashboard/catalog/services/categories")}>Category</button></li>
                        </ul>
                    </div>
                </div>
            </header>

            <div className="services-list-page__controls">
                <div className="search-box">
                    <Search className="search-icon-abs" size={18} />
                    <input type="text" placeholder="Search service name"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <button className="filter-btn" onClick={() => setShowFilterDrawer(true)}>
                    Filters <Sliders size={16} className="ms-1" />
                </button>
                <button className="manage-order-btn ms-auto" onClick={() => setShowManageOrder(true)}>
                    <ArrowsExpand size={16} className="me-2" /> Manage order
                </button>
            </div>

            <main className="services-list-page__layout">
                <aside className="services-list-page__sidebar">
                    <div className="sidebar-section">
                        <h3>Categories</h3>
                        <ul className="category-list">
                            <li className={`category-item ${selectedCategory === "all" ? "active" : ""}`}
                                onClick={() => setSelectedCategory("all")}>
                                <span className="cat-name">All categories</span>
                                <span className="count">{services.length}</span>
                            </li>
                            {categories.map((cat: any) => (
                                <li key={cat.id} className={`category-item ${selectedCategory === cat.id ? "active" : ""}`}
                                    onClick={() => setSelectedCategory(cat.id)}>
                                    <span className="cat-name">{cat.name}</span>
                                    <span className="count">{cat.serviceCount || 0}</span>
                                </li>
                            ))}
                        </ul>
                        <button className="add-category-link" onClick={() => navigate("/dashboard/catalog/services/categories")}>
                            Add category
                        </button>
                    </div>
                </aside>

                <section className="services-list-page__content">
                    {loading ? (
                        <div className="services-list-page__loading"><div className="spinner-border text-primary" /></div>
                    ) : error ? (
                        <div className="alert alert-danger rounded-4">{error}</div>
                    ) : groupedServices.length === 0 ? (
                        <div className="text-center py-5 bg-white border rounded-4 no-results">
                            <p className="mb-3">No services found match your criteria.</p>
                            <button className="btn btn-outline-dark rounded-pill px-4" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>Clear all filters</button>
                        </div>
                    ) : (
                        groupedServices.map((group) => (
                            <div key={group.id} className="service-group mb-5">
                                <div className="service-group__header d-flex justify-content-between align-items-center mb-3">
                                    <h2 className="group-title">{group.name}</h2>
                                    <div className="dropdown">
                                        <button className="actions-btn rounded-pill border-0" data-bs-toggle="dropdown">
                                            Actions <ChevronDown size={14} className="ms-1" />
                                        </button>
                                        <ul className="dropdown-menu shadow-sm border-0 rounded-4">
                                            <li><button className="dropdown-item py-2">Edit category</button></li>
                                            <li><button className="dropdown-item py-2 text-danger">Delete category</button></li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="service-group__list rounded-4 overflow-hidden border">
                                    {group.services.map((svc: any) => (
                                        <div key={svc.id} className={`service-card p-4 d-flex justify-content-between align-items-center ${selectedCategory === group.id ? 'active-cat' : ''}`} onClick={() => navigate(`/dashboard/catalog/services/${svc.id}`)}>
                                            <div className="card-left">
                                                <h4 className="service-name">{svc.name}</h4>
                                                <p className="service-meta">{svc.duration}min</p>
                                            </div>
                                            <div className="card-right d-flex align-items-center gap-4">
                                                <span className="price">₹{svc.price}</span>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <ServiceActionsMenu
                                                        serviceId={svc.id}
                                                        open={actionsMenuServiceId === svc.id}
                                                        onToggle={() => setActionsMenuServiceId(actionsMenuServiceId === svc.id ? null : svc.id)}
                                                        onEdit={() => navigate(`/dashboard/catalog/services/${svc.id}/edit`)}
                                                        onDelete={() => fetchServices()}
                                                        onQuickBookingLink={() => navigate(`/dashboard/catalog/services/${svc.id}/quick-booking`)}
                                                        onSetMenuOrder={() => setShowManageOrder(true)}
                                                        onSetBookingSequence={() => navigate(`/dashboard/catalog/services/${svc.id}/booking-sequence`)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </section>
            </main>

            {showFilterDrawer && (
                <ServiceFilterDrawer
                    onClose={() => setShowFilterDrawer(false)}
                    onApply={(newFilters: any) => setFilters(newFilters)}
                />
            )}
            {showManageOrder && (
                <ManageOrderModal services={services} onClose={() => setShowManageOrder(false)}
                    onSave={() => { fetchServices(); setShowManageOrder(false); }} />
            )}
        </div>
    );
};

export default ServicesListPage;
