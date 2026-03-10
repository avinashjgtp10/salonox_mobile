import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <i className="bi bi-chevron-left" />
                    </button>
                    <div className="title-content">
                        <h1>Service menu</h1>
                        <p>View and manage the services offered by your business. <a href="#">Learn more</a></p>
                    </div>
                </div>
                <div className="services-list-page__actions">
                    <div className="dropdown">
                        <button className="btn btn-outline dropdown-toggle" data-bs-toggle="dropdown">
                            Options
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li><button className="dropdown-item">Create share link</button></li>
                            <li><button className="dropdown-item">Team settings</button></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li className="dropdown-header">Export</li>
                            <li><button className="dropdown-item">CSV</button></li>
                            <li><button className="dropdown-item">Excel</button></li>
                        </ul>
                    </div>
                    <div className="dropdown">
                        <button className="btn btn-add dropdown-toggle" data-bs-toggle="dropdown">
                            Add <i className="bi bi-chevron-down ms-1" />
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li><button className="dropdown-item" onClick={() => navigate("/dashboard/catalog/services/add?type=single")}>Single Service</button></li>
                            <li><button className="dropdown-item" onClick={() => navigate("/dashboard/catalog/services/add?type=bundle")}>Bundle</button></li>
                            <li><button className="dropdown-item" onClick={() => navigate("/dashboard/catalog/services/categories")}>Category</button></li>
                        </ul>
                    </div>
                </div>
            </header>

            <div className="services-list-page__controls">
                <div className="search-box">
                    <i className="bi bi-search" />
                    <input type="text" placeholder="Search service name"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <button className="filter-btn" onClick={() => setShowFilterDrawer(true)}>
                    Filters <i className="bi bi-sliders ms-1" />
                </button>
                <button className="manage-order-btn" onClick={() => setShowManageOrder(true)}>
                    <i className="bi bi-arrows-expand me-2" /> Manage order
                </button>
            </div>

            <main className="services-list-page__layout">
                <aside className="services-list-page__sidebar">
                    <h3>Categories</h3>
                    <ul className="category-list">
                        <li className={`category-item ${selectedCategory === "all" ? "active" : ""}`}
                            onClick={() => setSelectedCategory("all")}>
                            <span>All categories</span>
                            <span className="count">{services.length}</span>
                        </li>
                        {categories.map((cat: any) => (
                            <li key={cat.id} className={`category-item ${selectedCategory === cat.id ? "active" : ""}`}
                                onClick={() => setSelectedCategory(cat.id)}>
                                <span>{cat.name}</span>
                                <span className="count">{cat.serviceCount || 0}</span>
                            </li>
                        ))}
                    </ul>
                    <button className="add-category-btn" onClick={() => navigate("/dashboard/catalog/services/categories")}>
                        Add category
                    </button>
                </aside>

                <section className="services-list-page__content">
                    {loading ? (
                        <div className="services-list-page__loading"><div className="spinner-border text-primary" /></div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : groupedServices.length === 0 ? (
                        <div className="text-center py-5 bg-white border rounded-3">
                            <p className="mb-3">No services found match your criteria.</p>
                            <button className="btn btn-outline" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>Clear all filters</button>
                        </div>
                    ) : (
                        groupedServices.map((group) => (
                            <div key={group.id} className="service-group">
                                <div className="service-group__header">
                                    <h2>{group.name}</h2>
                                    <div className="dropdown">
                                        <button className="actions-btn dropdown-toggle" data-bs-toggle="dropdown">
                                            Actions <i className="bi bi-chevron-down" />
                                        </button>
                                        <ul className="dropdown-menu">
                                            <li><button className="dropdown-item">Edit category</button></li>
                                            <li><button className="dropdown-item text-danger">Delete category</button></li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="service-group__list">
                                    {group.services.map((svc: any) => (
                                        <div key={svc.id} className="service-card" onClick={() => navigate(`/dashboard/catalog/services/${svc.id}`)}>
                                            <div className="card-left">
                                                <h4>{svc.name}</h4>
                                                <p>{svc.duration}min</p>
                                            </div>
                                            <div className="card-right">
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
