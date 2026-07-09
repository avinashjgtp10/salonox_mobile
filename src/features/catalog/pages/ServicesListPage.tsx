import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import api from "../../../services/api/axios";
import { SERVICES } from "../../../services/api/endpoints/services.endpoints";
import {
  deleteServiceThunk,
  fetchServiceByIdThunk,
} from "../../../middleware/services/services.thunk";
import type { FetchServicesParams } from "../../../middleware/services/services.thunk";
import { exportServicesPDF, exportServicesExcel, exportServicesCSV } from "../utils/serviceExport";
import type { Service } from "../types/catalog.types";
import {
  Search,
  Sliders,
  ChevronDown,
  PlusLg,
  TagFill,
  FileEarmarkPdf,
  FileEarmarkExcel,
  FiletypeCsv,
  Trash3,
  PencilSquare,
  X,
} from "react-bootstrap-icons";
import { useServices, type CategoryView } from "../hooks/useServices.ts";
import { useCategories } from "../hooks/useCategories.ts";
import { useServiceFilters } from "../hooks/useServiceFilters.ts";
import { useSelector as useReduxSelector } from "react-redux";
import {
  selectCategoriesLoading,
} from "../../../store/selectors/slices.selectors";
import type { ServiceFiltersState } from "../../../store/serviceFiltersSlice";
import ServiceFilterDrawer from "../components/ServiceFilterDrawer.tsx";
import ManageOrderModal from "../components/ManageOrderModal.tsx";
import ServiceImportModal from "../components/ServiceImportModal.tsx";
import ServiceDetailPanel from "../components/ServiceDetailPanel.tsx";
import ServiceCard from "../components/shared/ServiceCard.tsx";
import {
  CategorySidebarSkeleton,
  ServiceListSkeleton,
} from "../components/shared/LoadingSkeletons.tsx";
import EmptyState from "../components/shared/EmptyState.tsx";
import ErrorState from "../components/shared/ErrorState.tsx";
import Pagination from "../components/shared/Pagination.tsx";
import "../styles/ServicesListPage.scss";

const COLOR_OPTIONS = [
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#10b981", name: "Emerald" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#8b5cf6", name: "Violet" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#64748b", name: "Slate" },
];

// Maps UI filter strings → API boolean params
const buildFilterParams = (
  f: ServiceFiltersState,
): Partial<
  Pick<
    FetchServicesParams,
    "isActive" | "onlineBooking" | "commissionEnabled" | "resourceRequired"
  >
> => {
  const p: Partial<
    Pick<
      FetchServicesParams,
      "isActive" | "onlineBooking" | "commissionEnabled" | "resourceRequired"
    >
  > = {};
  if (f.status === "Active")   p.isActive = true;
  if (f.status === "Inactive") p.isActive = false;
  if (f.onlineBooking === "Enabled")  p.onlineBooking = true;
  if (f.onlineBooking === "Disabled") p.onlineBooking = false;
  if (f.commissions === "Enabled")    p.commissionEnabled = true;
  if (f.commissions === "Disabled")   p.commissionEnabled = false;
  if (f.resourceRequirements === "Required")     p.resourceRequired = true;
  if (f.resourceRequirements === "Not required") p.resourceRequired = false;
  return p;
};

// The services LIST endpoint returns lean objects that omit the `staff`
// relation — only the single GET-by-ID endpoint includes it, so the detail
// panel needs a follow-up fetch to show accurate team member assignment.
const hasFullServiceDetails = (svc: Service) =>
  Object.prototype.hasOwnProperty.call(svc, "staff");

const ServicesListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { services, categories, loading, error, pagination, fetchServices } =
    useServices();
  const { createCategory, updateCategory, deleteCategory, loading: catLoading } =
    useCategories();
  const { filters, activeCount: filterActiveCount } = useServiceFilters();

  const categoryLoadingState = useReduxSelector(selectCategoriesLoading);
  const categoriesLoading = categoryLoadingState?.fetchAll ?? false;

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showFilterDrawer, setShowFilterDrawer]   = useState(false);
  const [showManageOrder, setShowManageOrder]     = useState(false);
  const [showImport, setShowImport]               = useState(false);
  const [selectedCategory, setSelectedCategory]  = useState<string>("all");
  const [openCardMenu, setOpenCardMenu]           = useState<string | null>(null);
  const [searchQuery, setSearchQuery]             = useState("");
  const [showAddCategory, setShowAddCategory]     = useState(false);
  const [newCategoryName, setNewCategoryName]     = useState("");
  const [newCategoryColor, setNewCategoryColor]   = useState(COLOR_OPTIONS[0].hex);
  const [newCategoryDesc, setNewCategoryDesc]     = useState("");
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [editingCategory, setEditingCategory]     = useState<{ id: string | number; name: string; description?: string } | null>(null);
  const [editCategoryName, setEditCategoryName]   = useState("");
  const [editCategoryDesc, setEditCategoryDesc]   = useState("");
  const [deletingCategory, setDeletingCategory]   = useState<{ id: string | number; name: string } | null>(null);
  const [currentPage, setCurrentPage]             = useState(1);
  const [pageSize, setPageSize]                   = useState(25);

  const [selectedService, setSelectedService]   = useState<Service | null>(null);
  const [deletingService, setDeletingService]   = useState<Service | null>(null);
  const [deleteLoading, setDeleteLoading]       = useState(false);

  const optMenuRef = useRef<HTMLDivElement>(null);
  const [showOptMenu, setShowOptMenu] = useState(false);

  // Fetch from API on every dependency change. When search/category/filters
  // change while not already on page 1, reset to page 1 without firing a
  // second (stale-page) fetch in the same tick — the page-1 reset alone
  // triggers this effect again on the next render.
  const filtersKey = JSON.stringify({ selectedCategory, searchQuery, filters });
  const prevFiltersKeyRef = useRef(filtersKey);
  useEffect(() => {
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    fetchServices({
      page: currentPage,
      limit: pageSize,
      search: searchQuery || undefined,
      categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
      ...buildFilterParams(filters),
    });
  }, [currentPage, pageSize, selectedCategory, searchQuery, filters, fetchServices, filtersKey]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (optMenuRef.current && !optMenuRef.current.contains(e.target as Node))
        setShowOptMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Download helpers — fetch ALL services then export client-side ────────────

  const fetchFilteredServicesForExport = useCallback(async (): Promise<Service[]> => {
    interface ServicesListPayload {
      data: Service[];
      pagination?: {
        total_pages?: number;
      };
    }

    interface ServicesListResponse {
      data?: Service[] | ServicesListPayload;
      pagination?: {
        total_pages?: number;
      };
    }

    const queryParts: string[] = ["page=1", "limit=200"];
    const filterParams = buildFilterParams(filters);

    if (searchQuery) queryParts.push(`search=${encodeURIComponent(searchQuery)}`);
    if (selectedCategory !== "all") queryParts.push(`category_id=${selectedCategory}`);
    if (filterParams.isActive !== undefined) queryParts.push(`is_active=${filterParams.isActive}`);
    if (filterParams.onlineBooking !== undefined) queryParts.push(`online_booking=${filterParams.onlineBooking}`);
    if (filterParams.commissionEnabled !== undefined) queryParts.push(`commission_enabled=${filterParams.commissionEnabled}`);
    if (filterParams.resourceRequired !== undefined) queryParts.push(`resource_required=${filterParams.resourceRequired}`);

    const allServices: Service[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const pageQueryParts = queryParts.map((part) =>
        part.startsWith("page=") ? `page=${page}` : part,
      );
      const res = await api.get(SERVICES.LIST(pageQueryParts.join("&")));
      const responseData = res.data as ServicesListResponse;
      const payload = responseData?.data;

      if (Array.isArray(payload)) {
        allServices.push(...payload);
        totalPages = responseData.pagination?.total_pages ?? totalPages;
        page += 1;
        continue;
      }

      const pageData = Array.isArray(payload?.data) ? (payload.data as Service[]) : [];
      allServices.push(...pageData);
      totalPages = payload?.pagination?.total_pages ?? 1;
      page += 1;
    }

    return allServices;
  }, [filters, searchQuery, selectedCategory]);

  const handleDownloadPdf = useCallback(async () => {
    setShowOptMenu(false);
    try { exportServicesPDF(await fetchFilteredServicesForExport()); }
    catch (err) { console.error("[ServicesListPage] PDF export failed:", err); }
  }, [fetchFilteredServicesForExport]);

  const handleDownloadExcel = useCallback(async () => {
    setShowOptMenu(false);
    try { exportServicesExcel(await fetchFilteredServicesForExport()); }
    catch (err) { console.error("[ServicesListPage] Excel export failed:", err); }
  }, [fetchFilteredServicesForExport]);

  const handleDownloadCsv = useCallback(async () => {
    setShowOptMenu(false);
    try { exportServicesCSV(await fetchFilteredServicesForExport()); }
    catch (err) { console.error("[ServicesListPage] CSV export failed:", err); }
  }, [fetchFilteredServicesForExport]);

  // ── Group services by category for display ───────────────────────────────────
  const groupedServices = useMemo(() => {
    const groups: Record<
      string,
      { id: string | number; name: string; color?: string; services: Service[] }
    > = {};

    categories.forEach((cat: CategoryView) => {
      groups[String(cat.id)] = {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        services: [],
      };
    });

    services.forEach((svc: Service) => {
      const key = String(svc.category_id);
      if (groups[key]) {
        groups[key].services.push(svc);
      } else {
        if (!groups["none"]) {
          groups["none"] = { id: "none", name: "Other Services", services: [] };
        }
        groups["none"].services.push(svc);
      }
    });

    return Object.values(groups).filter((g) => g.services.length > 0);
  }, [services, categories]);

  const resetCategoryForm = () => {
    setNewCategoryName("");
    setNewCategoryDesc("");
    setNewCategoryColor(COLOR_OPTIONS[0].hex);
  };

  const hasActiveSearch = searchQuery.trim() !== "";
  const hasActiveFilters = filterActiveCount > 0 || selectedCategory !== "all" || hasActiveSearch;

  return (
    <div className="slp">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="slp__header">
        <div>
          <h1 className="slp__title">Service menu</h1>
          <p className="slp__subtitle">
            View and manage the services offered by your business.{" "}
            <a href="#" className="slp__learn">Learn more</a>
          </p>
        </div>

        <div className="slp__hdr-actions">
          {/* Options dropdown */}
          <div className="slp__dd-wrap" ref={optMenuRef}>
            <button
              className="slp__btn slp__btn--outline"
              onClick={() => setShowOptMenu((v) => !v)}
            >
              Options <ChevronDown size={13} />
            </button>
            {showOptMenu && (
              <ul className="slp__dd-menu slp__dd-menu--left">
                {/* <li>
                  <button
                    className="slp__dd-item"
                    onClick={() => { setShowManageOrder(true); setShowOptMenu(false); }}
                  >
                    <ArrowDownUp size={15} /> Set menu order
                  </button>
                </li> */}
                <li>
                  <button className="slp__dd-item" onClick={() => { setShowImport(true); setShowOptMenu(false); }}>
                    <FiletypeCsv size={15} /> Import services
                  </button>
                </li>
                <li><hr className="slp__dd-divider" /></li>
                <li>
                  <button className="slp__dd-item" onClick={handleDownloadPdf}>
                    <FileEarmarkPdf size={15} /> Download PDF
                  </button>
                </li>
                <li>
                  <button className="slp__dd-item" onClick={handleDownloadExcel}>
                    <FileEarmarkExcel size={15} /> Download Excel
                  </button>
                </li>
                <li>
                  <button className="slp__dd-item" onClick={handleDownloadCsv}>
                    <FiletypeCsv size={15} /> Download CSV
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* Add button */}
          <button
            className="slp__btn slp__btn--dark"
            onClick={() => navigate("/dashboard/catalog/services/add?type=single")}
          >
            Add
          </button>
        </div>
      </header>

      {/* ── CONTROLS ───────────────────────────────────────────────────────── */}
      <div className="slp__controls">
        <div className="slp__search">
          <Search className="slp__search-icon" size={16} />
          <input
            type="text"
            placeholder="Search service name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="slp__search-clear" onClick={() => setSearchQuery("")}>
              <X size={14} />
            </button>
          )}
        </div>
        <button className="slp__ctrl-btn" onClick={() => setShowFilterDrawer(true)}>
          <Sliders size={15} /> Filters
          {filterActiveCount > 0 && (
            <span className="slp__filter-badge">{filterActiveCount}</span>
          )}
        </button>
        <button className="slp__ctrl-btn" onClick={() => setShowAddCategory(true)}>
          <PlusLg size={13} /> Add category
        </button>
        {/* <button
          className="slp__ctrl-btn slp__ctrl-btn--order"
          onClick={() => setShowManageOrder(true)}
        >
          <ArrowDownUp size={15} /> Manage order
        </button> */}
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className={`slp__body${selectedService ? " slp__body--panel-open" : ""}`}>
        {/* Sidebar */}
        <aside className="slp__sidebar">
          <div
            className={`slp__sidebar-top ${selectedCategory === "all" ? "slp__sidebar-top--active" : ""}`}
            onClick={() => setSelectedCategory("all")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedCategory("all");
              }
            }}
          >
            <div>
              <div className="slp__sidebar-title-row">
                <h3 className="slp__sidebar-title">All categories</h3>
              </div>
              <span className="slp__cat-summary">
                {categories.length} saved categories
              </span>
            </div>
            <div className="slp__sidebar-icon">
              <TagFill size={14} />
            </div>
          </div>

          {categoriesLoading && categories.length === 0 ? (
            <CategorySidebarSkeleton />
          ) : (
            <ul className="slp__cat-list">
              {categories.map((cat: CategoryView) => (
                <li
                  key={cat.id}
                  className={`slp__cat-item slp__cat-item--editable ${String(selectedCategory) === String(cat.id) ? "slp__cat-item--active" : ""}`}
                  onClick={() => setSelectedCategory(String(cat.id))}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCategory(String(cat.id));
                    }
                  }}
                >
                  <span className="d-flex align-items-center gap-2 slp__cat-name">
                    {cat.color && (
                      <span className="slp__cat-dot" style={{ background: cat.color }} />
                    )}
                    {cat.name}
                  </span>

                  <span className="slp__cat-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="slp__cat-action-btn"
                      title="Edit category"
                      onClick={() => {
                        setEditingCategory({ id: cat.id, name: cat.name });
                        setEditCategoryName(cat.name);
                        setEditCategoryDesc(cat.description ?? "");
                      }}
                    >
                      <PencilSquare size={12} />
                    </button>
                    <button
                      className="slp__cat-action-btn slp__cat-action-btn--danger"
                      title="Delete category"
                      onClick={() => setDeletingCategory({ id: cat.id, name: cat.name })}
                    >
                      <Trash3 size={12} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main content */}
        <section className="slp__content">
          {loading ? (
            <ServiceListSkeleton groups={2} />
          ) : error ? (
            <ErrorState
              message={String(error)}
              onRetry={() =>
                fetchServices({
                  page: currentPage,
                  limit: pageSize,
                  search: searchQuery || undefined,
                  categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
                  ...buildFilterParams(filters),
                })
              }
            />
          ) : groupedServices.length === 0 ? (
            <EmptyState
              icon={<TagFill size={32} />}
              title="No services found"
              description={
                hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Add your first service to get started."
              }
              secondaryAction={
                hasActiveFilters
                  ? {
                      label: "Clear filters",
                      onClick: () => {
                        setSearchQuery("");
                        setSelectedCategory("all");
                      },
                    }
                  : undefined
              }
              action={
                !hasActiveFilters
                  ? {
                      label: "Add service",
                      onClick: () =>
                        navigate("/dashboard/catalog/services/add?type=single"),
                    }
                  : undefined
              }
            />
          ) : (
            groupedServices.map((group) => (
              <div key={group.id} className="slp__group">
                <div className="slp__group-header">
                  <div className="d-flex align-items-center gap-2">
                    {group.color && (
                      <span
                        className="slp__group-dot"
                        style={{ background: group.color }}
                      />
                    )}
                    <h2 className="slp__group-title">{group.name}</h2>
                    <span className="slp__group-count">{group.services.length}</span>
                  </div>
                  <div className="slp__dd-wrap">
                    <button
                      className="slp__group-actions-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenCardMenu(
                          openCardMenu === `group-${group.id}`
                            ? null
                            : `group-${group.id}`,
                        );
                      }}
                    >
                      <ChevronDown size={14} /> Actions
                    </button>
                    {openCardMenu === `group-${group.id}` && (
                      <ul className="slp__dd-menu slp__dd-menu--right">
                        <li>
                          <button
                            className="slp__dd-item"
                            onClick={() => {
                              setEditingCategory({ id: group.id, name: group.name });
                              setEditCategoryName(group.name);
                              setEditCategoryDesc("");
                              setOpenCardMenu(null);
                            }}
                          >
                            <PencilSquare size={13} /> Edit category
                          </button>
                        </li>
                        <li>
                          <button
                            className="slp__dd-item slp__dd-item--danger"
                            onClick={() => {
                              setDeletingCategory({ id: group.id, name: group.name });
                              setOpenCardMenu(null);
                            }}
                          >
                            <Trash3 size={13} /> Delete category
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>

                <div className="slp__service-list">
                  {group.services.map((svc: Service) => (
                    <ServiceCard
                      key={svc.id}
                      service={svc}
                      openMenuId={openCardMenu}
                      onMenuToggle={setOpenCardMenu}
                      onEdit={(id) =>
                        navigate(`/dashboard/catalog/services/${id}/edit`)
                      }
                      onDelete={(id) => {
                        const target = services.find(
                          (s: Service) => String(s.id) === String(id),
                        );
                        if (target) setDeletingService(target);
                        setOpenCardMenu(null);
                        setSelectedService(null);
                      }}
                      onClick={async (id) => {
                        const target = services.find(
                          (s: Service) => String(s.id) === String(id),
                        );
                        if (!target) return;
                        setSelectedService(target);
                        if (!hasFullServiceDetails(target)) {
                          const result = await dispatch(fetchServiceByIdThunk(id));
                          if (fetchServiceByIdThunk.fulfilled.match(result)) {
                            setSelectedService(result.payload as Service);
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Detail panel */}
        {selectedService && (
          <ServiceDetailPanel
            service={selectedService}
            onClose={() => setSelectedService(null)}
            onDelete={(svc) => {
              setDeletingService(svc);
              setSelectedService(null);
            }}
          />
        )}
      </div>

      {/* ── PAGINATION ─────────────────────────────────────────────────────── */}
      {!loading && pagination && pagination.total_pages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.total_pages}
          totalItems={pagination.total}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {showFilterDrawer && (
        <ServiceFilterDrawer
          onClose={() => setShowFilterDrawer(false)}
        />
      )}
      {showManageOrder && (
        <ManageOrderModal
          services={services}
          onClose={() => setShowManageOrder(false)}
          onSave={() => { fetchServices(); setShowManageOrder(false); }}
        />
      )}
      <ServiceImportModal
        show={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchServices}
      />

      {/* ── EDIT CATEGORY MODAL ────────────────────────────────────────────── */}
      {editingCategory && (
        <div className="slp__overlay" onClick={() => setEditingCategory(null)}>
          <div className="slp__modal" onClick={(e) => e.stopPropagation()}>
            <div className="slp__modal-header">
              <h4>Edit category</h4>
              <button className="slp__modal-close" onClick={() => setEditingCategory(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="slp__modal-body">
              <div className="slp__field">
                <label>Category name</label>
                <input
                  className="slp__input"
                  placeholder="e.g. Hair Services"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="slp__field" style={{ marginTop: 16 }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label style={{ margin: 0 }}>Description</label>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {editCategoryDesc.length}/255
                  </span>
                </div>
                <textarea
                  className="slp__textarea"
                  rows={4}
                  maxLength={255}
                  value={editCategoryDesc}
                  onChange={(e) => setEditCategoryDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="slp__modal-footer">
              <button
                className="slp__btn slp__btn--ghost"
                onClick={() => setEditingCategory(null)}
              >
                Cancel
              </button>
              <button
                className="slp__btn slp__btn--dark"
                disabled={!editCategoryName.trim() || catLoading}
                onClick={async () => {
                  await updateCategory(String(editingCategory.id), {
                    name: editCategoryName.trim(),
                    description: editCategoryDesc.trim() || undefined,
                  });
                  setEditingCategory(null);
                  fetchServices();
                }}
              >
                {catLoading ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CATEGORY CONFIRM ─────────────────────────────────────────── */}
      {deletingCategory && (
        <div className="slp__overlay" onClick={() => setDeletingCategory(null)}>
          <div
            className="slp__modal"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="slp__modal-header">
              <h4>Delete category</h4>
              <button
                className="slp__modal-close"
                onClick={() => setDeletingCategory(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="slp__modal-body">
              <p className="text-muted small mb-0">
                Are you sure you want to delete{" "}
                <strong>{deletingCategory.name}</strong>? Services in this
                category will become uncategorised.
              </p>
            </div>
            <div className="slp__modal-footer">
              <button
                className="slp__btn slp__btn--ghost"
                onClick={() => setDeletingCategory(null)}
              >
                Cancel
              </button>
              <button
                className="slp__btn slp__btn--danger"
                disabled={catLoading}
                onClick={async () => {
                  await deleteCategory(String(deletingCategory.id));
                  setDeletingCategory(null);
                  fetchServices();
                }}
              >
                {catLoading ? "Deleting…" : "Delete category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE SERVICE CONFIRM ─────────────────────────────────────────── */}
      {deletingService && (
        <div className="slp__overlay" onClick={() => setDeletingService(null)}>
          <div
            className="slp__modal"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="slp__modal-header">
              <h4>Delete service</h4>
              <button
                className="slp__modal-close"
                onClick={() => setDeletingService(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="slp__modal-body">
              <p className="text-muted small mb-0">
                Are you sure you want to delete{" "}
                <strong>{deletingService.name}</strong>? This action cannot be
                undone.
              </p>
            </div>
            <div className="slp__modal-footer">
              <button
                className="slp__btn slp__btn--ghost"
                onClick={() => setDeletingService(null)}
              >
                Cancel
              </button>
              <button
                className="slp__btn slp__btn--danger"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  await dispatch(deleteServiceThunk(deletingService.id));
                  setDeleteLoading(false);
                  setDeletingService(null);
                  fetchServices({
                    page: currentPage,
                    limit: pageSize,
                    search: searchQuery || undefined,
                    categoryId:
                      selectedCategory !== "all" ? selectedCategory : undefined,
                    ...buildFilterParams(filters),
                  });
                }}
              >
                {deleteLoading ? "Deleting…" : "Delete service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CATEGORY MODAL ─────────────────────────────────────────────── */}
      {showAddCategory && (
        <div
          className="slp__overlay"
          onClick={() => { setShowAddCategory(false); resetCategoryForm(); }}
        >
          <div className="slp__modal" onClick={(e) => e.stopPropagation()}>
            <div className="slp__modal-header">
              <h4>Add category</h4>
              <button
                className="slp__modal-close"
                onClick={() => { setShowAddCategory(false); resetCategoryForm(); }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="slp__modal-body">
              <div className="slp__modal-row">
                <div className="slp__field">
                  <label>Category name</label>
                  <input
                    className="slp__input"
                    placeholder="e.g. Hair Services"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="slp__field" style={{ position: "relative" }}>
                  <label>Appointment color</label>
                  <div
                    className="slp__color-toggle"
                    onClick={() => setColorDropdownOpen((o) => !o)}
                  >
                    <span
                      className="slp__color-swatch"
                      style={{ background: newCategoryColor }}
                    />
                    <span>
                      {COLOR_OPTIONS.find((c) => c.hex === newCategoryColor)?.name ?? "Color"}
                    </span>
                    <ChevronDown size={13} />
                  </div>
                  {colorDropdownOpen && (
                    <div className="slp__color-menu">
                      {COLOR_OPTIONS.map((c) => (
                        <div
                          key={c.hex}
                          className={`slp__color-opt ${newCategoryColor === c.hex ? "slp__color-opt--sel" : ""}`}
                          onClick={() => {
                            setNewCategoryColor(c.hex);
                            setColorDropdownOpen(false);
                          }}
                        >
                          <span
                            className="slp__color-swatch"
                            style={{ background: c.hex }}
                          />
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="slp__field" style={{ marginTop: 16 }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label style={{ margin: 0 }}>Description</label>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {newCategoryDesc.length}/255
                  </span>
                </div>
                <textarea
                  className="slp__textarea"
                  rows={4}
                  maxLength={255}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="slp__modal-footer">
              <button
                className="slp__btn slp__btn--ghost"
                onClick={() => { setShowAddCategory(false); resetCategoryForm(); }}
              >
                Cancel
              </button>
              <button
                className="slp__btn slp__btn--dark"
                disabled={!newCategoryName.trim() || catLoading}
                onClick={async () => {
                  await createCategory({
                    name: newCategoryName.trim(),
                    description: newCategoryDesc.trim() || undefined,
                    color: newCategoryColor,
                  });
                  setShowAddCategory(false);
                  resetCategoryForm();
                  fetchServices();
                }}
              >
                {catLoading ? "Adding…" : "Add category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesListPage;
