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
  selectCurrentSalon,
  selectUserProfile,
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
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import "../styles/ServicesListPage.scss";

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
  const { filters, activeCount: filterActiveCount, reset: resetServiceFilters } = useServiceFilters();

  const categoryLoadingState = useReduxSelector(selectCategoriesLoading);
  const categoriesLoading = categoryLoadingState?.fetchAll ?? false;

  const currentSalon = useReduxSelector(selectCurrentSalon);
  const userProfile = useReduxSelector(selectUserProfile);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showFilterDrawer, setShowFilterDrawer]   = useState(false);
  const [showManageOrder, setShowManageOrder]     = useState(false);
  const [showImport, setShowImport]               = useState(false);
  const [selectedCategory, setSelectedCategory]  = useState<string>("all");
  const [openCardMenu, setOpenCardMenu]           = useState<string | null>(null);
  const [searchQuery, setSearchQuery]             = useState("");
  const [showAddCategory, setShowAddCategory]     = useState(false);
  const [newCategoryName, setNewCategoryName]     = useState("");
  const [newCategoryDesc, setNewCategoryDesc]     = useState("");
  const [editingCategory, setEditingCategory]     = useState<{ id: string | number; name: string; description?: string } | null>(null);
  const [editCategoryName, setEditCategoryName]   = useState("");
  const [editCategoryDesc, setEditCategoryDesc]   = useState("");
  const [deletingCategory, setDeletingCategory]   = useState<{ id: string | number; name: string } | null>(null);
  const [deleteCategoryInput, setDeleteCategoryInput] = useState("");
  const [currentPage, setCurrentPage]             = useState(1);
  const [pageSize, setPageSize]                   = useState(25);

  const [selectedService, setSelectedService]   = useState<Service | null>(null);
  const [deletingService, setDeletingService]   = useState<Service | null>(null);
  const [deleteServiceInput, setDeleteServiceInput] = useState("");
  const [deleteLoading, setDeleteLoading]       = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Bulk selection state
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string | number>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteBulkInput, setDeleteBulkInput]         = useState("");
  const [deleteBulkLoading, setDeleteBulkLoading]     = useState(false);

  const optMenuRef = useRef<HTMLDivElement>(null);
  const [showOptMenu, setShowOptMenu] = useState(false);

  // Tracks whether we're past the initial mount, so the effects below don't
  // also fire (redundantly) on first render — mirrors ProductsListPage.tsx.
  const isMountedRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always-current pagination/category/filter state for the debounced search
  // effect to read from inside its setTimeout callback, without needing them
  // in its dependency array (which would re-arm the debounce on every change).
  const latestRef = useRef({ currentPage, pageSize, selectedCategory, filters });
  latestRef.current = { currentPage, pageSize, selectedCategory, filters };

  // Initial fetch on mount only.
  useEffect(() => {
    fetchServices({
      page: currentPage,
      limit: pageSize,
      search: searchQuery || undefined,
      categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
      ...buildFilterParams(filters),
    });
    const t = setTimeout(() => { isMountedRef.current = true; }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Category/filter/page/pageSize changes are discrete actions (not free-text
  // typing), so they re-fetch immediately. When category/filters change while
  // not already on page 1, reset to page 1 without firing a second (stale-page)
  // fetch in the same tick — the page-1 reset alone triggers this effect again.
  const categoryFiltersKey = JSON.stringify({ selectedCategory, filters });
  const prevCategoryFiltersKeyRef = useRef(categoryFiltersKey);
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (prevCategoryFiltersKeyRef.current !== categoryFiltersKey) {
      prevCategoryFiltersKeyRef.current = categoryFiltersKey;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    fetchServices({
      page: currentPage,
      limit: pageSize,
      search: searchQuery || undefined,
      categoryId: filters.categoryId && filters.categoryId !== "all"
        ? filters.categoryId
        : selectedCategory !== "all"
        ? selectedCategory
        : undefined,
      ...buildFilterParams(filters),
    });
  }, [currentPage, pageSize, selectedCategory, filters, fetchServices, categoryFiltersKey]);

  // Debounced re-fetch on search input change (skip initial mount, already
  // handled above) — search typing shouldn't hit the API on every keystroke.
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const { currentPage: page, pageSize: limit, selectedCategory: cat, filters: f } = latestRef.current;
      if (page !== 1) {
        setCurrentPage(1);
        return;
      }
      fetchServices({
        page: 1,
        limit,
        search: searchQuery || undefined,
        categoryId: f.categoryId && f.categoryId !== "all"
          ? f.categoryId
          : cat !== "all"
          ? cat
          : undefined,
        ...buildFilterParams(f),
      });
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, fetchServices]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (optMenuRef.current && !optMenuRef.current.contains(e.target as Node))
        setShowOptMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset the "type DELETE to confirm" fields whenever a delete target opens/closes
  useEffect(() => { setDeleteCategoryInput(""); }, [deletingCategory]);
  useEffect(() => { setDeleteServiceInput(""); }, [deletingService]);

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
    const exportCatId = filters.categoryId && filters.categoryId !== "all" ? filters.categoryId : selectedCategory;
    if (exportCatId !== "all") queryParts.push(`category_id=${exportCatId}`);
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

      if (payload && Array.isArray(payload.data)) {
        allServices.push(...payload.data);
        totalPages = payload.pagination?.total_pages ?? totalPages;
        page += 1;
        continue;
      }

      break;
    }

    return allServices;
  }, [filters, searchQuery, selectedCategory]);

  const handleDownloadPdf = useCallback(async () => {
    setShowOptMenu(false);
    try {
      const filteredServices = await fetchFilteredServicesForExport();
      exportServicesPDF(filteredServices, {
        salon: currentSalon,
        user: userProfile,
      });
    } catch (err) {
      console.error("[ServicesListPage] PDF export failed:", err);
    }
  }, [fetchFilteredServicesForExport, currentSalon, userProfile]);

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

  // ── Client-side filtering for Duration, Price Range, and Category ─────────
  const filteredServices = useMemo(() => {
    return services.filter((svc: Service) => {
      // 1. Category filter from modal
      if (filters.categoryId && filters.categoryId !== "all") {
        if (String(svc.category_id) !== String(filters.categoryId)) {
          return false;
        }
      }

      // 2. Duration filter
      if (filters.durationRange && filters.durationRange !== "all") {
        const dur = Number(svc.duration) || 0;
        if (filters.durationRange === "0-30" && (dur < 0 || dur > 30)) return false;
        if (filters.durationRange === "30-60" && (dur < 30 || dur > 60)) return false;
        if (filters.durationRange === "60-120" && (dur < 60 || dur > 120)) return false;
        if (filters.durationRange === "120+" && dur < 120) return false;
      }

      return true;
    });
  }, [services, filters]);

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

    filteredServices.forEach((svc: Service) => {
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
  }, [filteredServices, categories]);

  // Flat, visual-order list of every rendered service — powers arrow-key
  // navigation across group boundaries.
  const flatServices = useMemo(
    () => groupedServices.flatMap((g) => g.services),
    [groupedServices],
  );

  // Keep the highlighted card in view as the user arrows past the fold.
  useEffect(() => {
    if (highlightedIndex < 0) return;
    const svc = flatServices[highlightedIndex];
    if (!svc) return;
    document
      .getElementById(`service-card-${svc.id}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedIndex, flatServices]);

  const openServiceDetail = async (svc: Service) => {
    setSelectedService(svc);
    if (!hasFullServiceDetails(svc)) {
      const result = await dispatch(fetchServiceByIdThunk(svc.id));
      if (fetchServiceByIdThunk.fulfilled.match(result)) {
        setSelectedService(result.payload as Service);
      }
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!flatServices.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1 >= flatServices.length ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 < 0 ? flatServices.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && flatServices[highlightedIndex]) {
        e.preventDefault();
        openServiceDetail(flatServices[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setHighlightedIndex(-1);
    }
  };

  const resetCategoryForm = () => {
    setNewCategoryName("");
    setNewCategoryDesc("");
  };

  const hasActiveSearch = searchQuery.trim() !== "";
  const hasActiveFilters = filterActiveCount > 0 || selectedCategory !== "all" || hasActiveSearch;

  const handleToggleSelectService = useCallback((id: string | number, checked: boolean) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAllServices = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = services.map((s) => s.id);
      setSelectedServiceIds(new Set(allIds));
    } else {
      setSelectedServiceIds(new Set());
    }
  }, [services]);

  const handleToggleGroupServices = useCallback((groupServicesList: Service[], checked: boolean) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      groupServicesList.forEach((s) => {
        if (checked) {
          next.add(s.id);
        } else {
          next.delete(s.id);
        }
      });
      return next;
    });
  }, []);

  return (
    <div className="slp">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="slp__header">
        <div>
          <h1 className="slp__title">Service menu</h1>
          <p className="slp__subtitle">
            View and manage the services offered by your business.{" "}
            <LearnMoreLink topic="service-menu" className="slp__learn">Learn more</LearnMoreLink>
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
            onKeyDown={handleSearchKeyDown}
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

      {/* ── BULK ACTION BAR ─────────────────────────────────────────────────── */}
      {selectedServiceIds.size > 0 && (
        <div className="slp__bulk-bar">
          <div className="slp__bulk-left">
            <label className="slp__bulk-select-all">
              <input
                type="checkbox"
                checked={services.length > 0 && services.every((s) => selectedServiceIds.has(s.id))}
                onChange={(e) => handleToggleSelectAllServices(e.target.checked)}
              />
              Select all on page ({services.length})
            </label>
            <span className="slp__bulk-count">
              {selectedServiceIds.size} service{selectedServiceIds.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="slp__bulk-actions">
            <button
              className="slp__btn slp__btn--ghost"
              onClick={() => setSelectedServiceIds(new Set())}
            >
              Clear selection
            </button>
            <button
              className="slp__btn slp__btn--danger"
              onClick={() => {
                setDeleteBulkInput("");
                setShowBulkDeleteModal(true);
              }}
            >
              <Trash3 size={14} /> Delete selected ({selectedServiceIds.size})
            </button>
          </div>
        </div>
      )}

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
                        resetServiceFilters();
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
                    <input
                      type="checkbox"
                      className="slp__svc-checkbox"
                      checked={
                        group.services.length > 0 &&
                        group.services.every((s) => selectedServiceIds.has(s.id))
                      }
                      onChange={(e) =>
                        handleToggleGroupServices(group.services, e.target.checked)
                      }
                      title="Select all in category"
                    />
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
                      isSelected={selectedServiceIds.has(svc.id)}
                      onSelect={handleToggleSelectService}
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
                      onClick={(id) => {
                        const target = services.find(
                          (s: Service) => String(s.id) === String(id),
                        );
                        if (target) openServiceDetail(target);
                      }}
                      highlighted={flatServices[highlightedIndex]?.id === svc.id}
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
              <p className="text-muted small mb-3">
                Are you sure you want to delete{" "}
                <strong>{deletingCategory.name}</strong>? Services in this
                category will become uncategorised. This operation can't be
                undone.
              </p>
              <div className="slp__field">
                <label>Type DELETE to confirm</label>
                <input
                  className="slp__input"
                  placeholder="DELETE"
                  value={deleteCategoryInput}
                  onChange={(e) => setDeleteCategoryInput(e.target.value)}
                  autoFocus
                />
              </div>
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
                disabled={deleteCategoryInput !== "DELETE" || catLoading}
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
              <p className="text-muted small mb-3">
                Are you sure you want to delete{" "}
                <strong>{deletingService.name}</strong>? This action cannot be
                undone.
              </p>
              <div className="slp__field">
                <label>Type DELETE to confirm</label>
                <input
                  className="slp__input"
                  placeholder="DELETE"
                  value={deleteServiceInput}
                  onChange={(e) => setDeleteServiceInput(e.target.value)}
                  autoFocus
                />
              </div>
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
                disabled={deleteServiceInput !== "DELETE" || deleteLoading}
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

      {/* ── BULK DELETE MODAL ────────────────────────────────────────────── */}
      {showBulkDeleteModal && (
        <div className="slp__overlay" onClick={() => setShowBulkDeleteModal(false)}>
          <div className="slp__modal" onClick={(e) => e.stopPropagation()}>
            <div className="slp__modal-header">
              <h4>Delete selected services</h4>
              <button
                className="slp__modal-close"
                onClick={() => setShowBulkDeleteModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="slp__modal-body">
              <p style={{ margin: "0 0 12px", color: "#374151" }}>
                Are you sure you want to delete <strong>{selectedServiceIds.size}</strong> selected service(s)?
                This action cannot be undone.
              </p>
              <div className="slp__field">
                <label>
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  className="slp__input"
                  placeholder="Type DELETE"
                  value={deleteBulkInput}
                  onChange={(e) => setDeleteBulkInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="slp__modal-footer">
              <button
                className="slp__btn slp__btn--ghost"
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="slp__btn slp__btn--danger"
                disabled={deleteBulkInput !== "DELETE" || deleteBulkLoading}
                onClick={async () => {
                  setDeleteBulkLoading(true);
                  const idsToDelete = Array.from(selectedServiceIds);
                  await Promise.allSettled(
                    idsToDelete.map((id) => dispatch(deleteServiceThunk(id)))
                  );
                  setDeleteBulkLoading(false);
                  setShowBulkDeleteModal(false);
                  setSelectedServiceIds(new Set());
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
                {deleteBulkLoading ? "Deleting…" : `Delete ${selectedServiceIds.size} service(s)`}
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
