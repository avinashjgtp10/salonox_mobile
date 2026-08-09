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
  ChevronDown,
  ArrowDownUp,
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
import { JiraFilterMenu } from "../../../components/ui";
import type { FilterDropdownOption, JiraFilterField } from "../../../components/ui";
import ManageOrderModal from "../components/ManageOrderModal.tsx";
import ServiceImportModal from "../components/ServiceImportModal.tsx";
import ServiceDetailPanel from "../components/ServiceDetailPanel.tsx";
import ServiceCard from "../components/shared/ServiceCard.tsx";
import { ServiceListSkeleton } from "../components/shared/LoadingSkeletons.tsx";
import EmptyState from "../components/shared/EmptyState.tsx";
import ErrorState from "../components/shared/ErrorState.tsx";
// The shared UI pagination (same one ProductsListPage uses) rather than the
// catalog-local copy, so rows-per-page, the "Showing x – y of z" summary and
// the button styling match across the catalog.
import Pagination from "../../../components/ui/Pagination";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";
import "../styles/ServicesListPage.scss";

// Maps UI filter strings → API boolean params.
//
// Commission and Resource Required filters were removed: neither is readable
// anywhere outside the services module, and the form can no longer set either,
// so both filters partitioned the list into "all" and "none".
// onlineBooking is multi-select but the API takes a single boolean, so only a
// selection of exactly one side narrows anything — picking both Enabled and
// Disabled means "either", which is the same as no filter at all.
const buildFilterParams = (
  f: ServiceFiltersState,
): Partial<Pick<FetchServicesParams, "isActive" | "onlineBooking">> => {
  const p: Partial<Pick<FetchServicesParams, "isActive" | "onlineBooking">> = {};
  const ob = f.onlineBooking ?? [];
  if (ob.length === 1 && ob[0] === "Enabled")  p.onlineBooking = true;
  if (ob.length === 1 && ob[0] === "Disabled") p.onlineBooking = false;
  return p;
};

const DURATION_OPTIONS: FilterDropdownOption[] = [
  { id: "0-30",   label: "Under 30 min" },
  { id: "30-60",  label: "30 – 60 min" },
  { id: "60-120", label: "1 – 2 hours" },
  { id: "120+",   label: "Over 2 hours" },
];

const ONLINE_BOOKING_OPTIONS: FilterDropdownOption[] = [
  { id: "Enabled",  label: "Online" },
  { id: "Disabled", label: "Offline" },
];

// Upper bound is exclusive so the buckets don't overlap — a 60 min service
// belongs to "30 – 60", not to both that and "1 – 2 hours".
const matchesDuration = (dur: number, range: string): boolean => {
  switch (range) {
    case "0-30":   return dur <= 30;
    case "30-60":  return dur > 30 && dur <= 60;
    case "60-120": return dur > 60 && dur <= 120;
    case "120+":   return dur > 120;
    default:       return true;
  }
};

// The services LIST endpoint returns lean objects that omit the `staff`
// relation — only the single GET-by-ID endpoint includes it, so the detail
// panel needs a follow-up fetch to show accurate team member assignment.
const hasFullServiceDetails = (svc: Service) =>
  Object.prototype.hasOwnProperty.call(svc, "staff");

// Sort is applied client-side, within each category group, to the services
// currently on screen. The list endpoint takes no sort parameter, so sorting
// server-side would need an API change; ordering what the user can actually
// see is both honest and what the control appears to promise.
// How many category chips show before the row collapses behind "+N more".
// Roughly two rows at typical widths.
const COLLAPSED_CHIP_COUNT = 12;

type SortId = "default" | "name-asc" | "name-desc" | "price-asc" | "price-desc";

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "default",    label: "Sort" },
  { id: "name-asc",   label: "Name (A–Z)" },
  { id: "name-desc",  label: "Name (Z–A)" },
  { id: "price-asc",  label: "Price (low → high)" },
  { id: "price-desc", label: "Price (high → low)" },
];

const sortServices = (list: Service[], sortBy: SortId): Service[] => {
  if (sortBy === "default") return list;
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const copy = [...list];
  copy.sort((a, b) => {
    switch (sortBy) {
      case "name-asc":   return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      case "name-desc":  return String(b.name ?? "").localeCompare(String(a.name ?? ""));
      case "price-asc":  return num(a.price) - num(b.price);
      case "price-desc": return num(b.price) - num(a.price);
      default:           return 0;
    }
  });
  return copy;
};

const ServicesListPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { services, categories, loading, error, pagination, fetchServices } =
    useServices();
  const { createCategory, updateCategory, deleteCategory, loading: catLoading } =
    useCategories();
  const {
    filters,
    activeCount: filterActiveCount,
    apply: applyServiceFilters,
    reset: resetServiceFilters,
  } = useServiceFilters();

  const categoryLoadingState = useReduxSelector(selectCategoriesLoading);
  const categoriesLoading = categoryLoadingState?.fetchAll ?? false;

  const currentSalon = useReduxSelector(selectCurrentSalon);
  const userProfile = useReduxSelector(selectUserProfile);

  // ── UI state ────────────────────────────────────────────────────────────────
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

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState<SortId>("default");

  // Salons can accumulate a lot of categories (51 on dev today), which turned
  // the chips row into a seven-line wall that pushed the list off screen.
  const [chipsExpanded, setChipsExpanded] = useState(false);

  // Collapsed shows the first N — but never hides the category currently being
  // filtered on, or the active chip would vanish the moment it's picked from
  // the expanded list and the row collapses again.
  const visibleCategories = useMemo(() => {
    if (chipsExpanded || categories.length <= COLLAPSED_CHIP_COUNT) return categories;
    const head = categories.slice(0, COLLAPSED_CHIP_COUNT);
    if (selectedCategory === "all") return head;
    if (head.some((c) => String(c.id) === String(selectedCategory))) return head;
    const active = categories.find((c) => String(c.id) === String(selectedCategory));
    return active ? [...head, active] : head;
  }, [categories, chipsExpanded, selectedCategory]);

  const hiddenCategoryCount = chipsExpanded
    ? 0
    : Math.max(0, categories.length - visibleCategories.length);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "durationRange", label: "Duration", options: DURATION_OPTIONS },
    { key: "onlineBooking", label: "Online booking", options: ONLINE_BOOKING_OPTIONS },
  ], []);

  // JiraFilterMenu hands back the WHOLE draft on Apply (every field, changed or
  // not) in one call, so this commits everything at once rather than per field.
  const applyAllFilters = useCallback((next: Record<string, string[]>) => {
    applyServiceFilters({
      durationRange: next.durationRange ?? [],
      onlineBooking: next.onlineBooking ?? [],
    });
    setCurrentPage(1);
  }, [applyServiceFilters]);

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
      // The chips row is now the only category control, so there's no second
      // source to reconcile against.
      categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
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
        categoryId: cat !== "all" ? cat : undefined,
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
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node))
        setShowSortMenu(false);
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
    if (selectedCategory !== "all") queryParts.push(`category_id=${selectedCategory}`);
    if (filterParams.isActive !== undefined) queryParts.push(`is_active=${filterParams.isActive}`);
    if (filterParams.onlineBooking !== undefined) queryParts.push(`online_booking=${filterParams.onlineBooking}`);

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
      // Category is filtered by the chips row (and server-side), not here.
      // Several duration buckets ticked means "any of these".
      const ranges = filters.durationRange ?? [];
      if (ranges.length > 0) {
        const dur = Number(svc.duration) || 0;
        if (!ranges.some((r) => matchesDuration(dur, r))) return false;
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
        {/* Shared filter menu (components/ui) — the same two-pane panel and
            single-Apply behaviour as Memberships and Consumable Inventory,
            replacing this page's own modal drawer. */}
        <JiraFilterMenu
          fields={filterFields}
          selected={filters as unknown as Record<string, string[]>}
          onApply={applyAllFilters}
          triggerLabel="Filters"
        />
        <div className="slp__dd-wrap" ref={sortMenuRef}>
          <button className="slp__ctrl-btn" onClick={() => setShowSortMenu((v) => !v)}>
            <ArrowDownUp size={14} /> {SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? "Sort"}
          </button>
          {showSortMenu && (
            <ul className="slp__dd-menu slp__dd-menu--left">
              {SORT_OPTIONS.map((opt) => (
                <li key={opt.id}>
                  <button
                    className="slp__dd-item"
                    onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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

      {/* ── CATEGORY CHIPS ─────────────────────────────────────────────────── */}
      {/* Replaces the old left sidebar. Category edit/delete moved to the
          per-group "Actions" menu, which already offered both. */}
      <div className="slp__chips">
        <button
          className={`slp__chip${selectedCategory === "all" ? " slp__chip--active" : ""}`}
          onClick={() => setSelectedCategory("all")}
        >
          All
          <span className="slp__chip-count">({pagination?.total ?? services.length})</span>
        </button>

        {categoriesLoading && categories.length === 0
          ? null
          : visibleCategories.map((cat: CategoryView) => (
              <button
                key={cat.id}
                className={`slp__chip${String(selectedCategory) === String(cat.id) ? " slp__chip--active" : ""}`}
                onClick={() => setSelectedCategory(String(cat.id))}
                title={cat.name}
              >
                {cat.color && (
                  <span className="slp__chip-dot" style={{ background: cat.color }} />
                )}
                {cat.name}
                {/* service_count is the salon-wide total from the API; the
                    derived serviceCount only counts the loaded page, so it's
                    the fallback rather than the default. */}
                <span className="slp__chip-count">
                  ({(cat as { service_count?: number }).service_count ?? cat.serviceCount})
                </span>
              </button>
            ))}

        {hiddenCategoryCount > 0 && (
          <button
            className="slp__chip slp__chip--more"
            onClick={() => setChipsExpanded(true)}
          >
            +{hiddenCategoryCount} more
          </button>
        )}
        {chipsExpanded && categories.length > COLLAPSED_CHIP_COUNT && (
          <button
            className="slp__chip slp__chip--more"
            onClick={() => setChipsExpanded(false)}
          >
            Show less
          </button>
        )}

        <button
          className="slp__chip slp__chip--add"
          onClick={() => setShowAddCategory(true)}
        >
          <PlusLg size={11} /> Add Category
        </button>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className={`slp__body${selectedService ? " slp__body--panel-open" : ""}`}>
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

                {/* Column labels. Same grid track list as .slp__service-card,
                    so the headings sit over the values they name. */}
                <div className="slp__group-cols" aria-hidden="true">
                  <span />
                  <span>Service</span>
                  <span>Time</span>
                  <span>Staff</span>
                  <span>Description</span>
                  <span>Status</span>
                  <span className="slp__group-cols__center">Commission</span>
                  <span className="slp__group-cols__right">Price</span>
                  <span />
                </div>

                <div className="slp__service-list">
                  {sortServices(group.services, sortBy).map((svc: Service) => (
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
      {/* The shared component derives total pages from totalItems/pageSize and
          renders nothing when there are no results, so it needs neither a
          totalPages prop nor a total_pages guard. */}
      {!loading && pagination && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={pagination.total}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          className="services-pagination"
        />
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
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
