import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../../services/api/axios";
import { CLIENT } from "../../../services/api/endpoints";
import Pagination from "../../../components/ui/Pagination";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowDownUp,
  X,
  ArrowRight,
  ArrowLeftRight,
  FileEarmarkExcel,
  FiletypeCsv,
  FiletypePdf,
  DashCircleFill,
  PersonPlus,
  ThreeDotsVertical,
  PencilSquare,
  Trash,
  SlashCircle,
  CheckCircle,
  Clipboard,
} from "react-bootstrap-icons";
import ClientDetailsDrawer from "../components/ClientDetailsDrawer";
import ClientSearchInput from "../components/ClientSearchInput";
import ClientImportModal from "../components/ClientImportModal";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useCurrency } from "../../../hooks/useCurrency";
import LearnMoreLink from "../../../components/shared/LearnMoreLink";

// UI Components
import {
  Button,
  Badge,
  Input,
  Modal,
  DownloadButton,
  Loader,
} from "../../../components/ui";
import { useTranslation } from "react-i18next";

import "../styles/ClientsListPage.scss";

export default function ClientsListPage() {
  const { t } = useTranslation();
  const { currencySymbol, formatAmount } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const { showSuccess, showError, overlay } = useStatusOverlay();

  // fetchClients is a stable-identity useCallback (deps: []), so it can't
  // read the `pageSize` state directly without going stale — mirrored into a
  // ref instead. Every call site that omits the `ps` argument (initial load,
  // sort/filter changes, the refresh after delete/block/merge) now falls back
  // to whatever the user actually last selected, instead of a hardcoded 20
  // that silently overwrote their choice.
  const pageSizeRef = useRef(pageSize);
  useEffect(() => { pageSizeRef.current = pageSize; }, [pageSize]);

  // Same rationale as pageSizeRef: the Created-date and Revenue range filters
  // are applied server-side, but threading four more positional args through
  // every fetchClients() call site (pagination, sort, search, refresh-after-
  // mutation) would be error-prone. fetchClients reads the currently-applied
  // range values from this ref instead; it's kept in sync with the state below.
  const rangeFiltersRef = useRef({ dateFrom: "", dateTo: "", minRevenue: "", maxRevenue: "" });

  const sortMap: Record<string, { sort_by: string; sort_order: string }> = {
    "First name (A-Z)": { sort_by: "full_name", sort_order: "asc" },
    "First name (Z-A)": { sort_by: "full_name", sort_order: "desc" },
    "Created at (oldest first)": { sort_by: "created_at", sort_order: "asc" },
    "Created at (newest first)": { sort_by: "created_at", sort_order: "desc" },
    "Total sales (highest first)": { sort_by: "total_sales", sort_order: "desc" },
    "Total sales (lowest first)": { sort_by: "total_sales", sort_order: "asc" },
  };

  const isMountedRef = useRef(false);

  const fetchClients = useCallback(async (
    page = 1,
    sort = "Created at (newest first)",
    gender: string | null = null,
    ps?: number,
    search?: string,
  ) => {
    setLoading(true);
    try {
      const { sort_by, sort_order } = sortMap[sort] ?? { sort_by: "created_at", sort_order: "desc" };
      const resolvedPageSize = ps ?? pageSizeRef.current;
      // Deleted/blocked clients are soft-archived (is_active=false) so their
      // appointment/payment history stays intact for reporting — but that
      // means "delete" must also stop them appearing here, or it looks like
      // deletion did nothing. Omitting `inactive` lets the backend's default
      // (active-only) apply; there's no "show archived" toggle in this UI to
      // preserve.
      const params: Record<string, any> = {
        page,
        pageSize: resolvedPageSize,
        sort_by,
        sort_order,
      };
      if (gender && gender !== "All") params.gender = gender.toLowerCase();
      if (search && search.trim()) params.search = search.trim();
      const { dateFrom: df, dateTo: dt, minRevenue: minRev, maxRevenue: maxRev } =
        rangeFiltersRef.current;
      if (df) params.created_from = df;
      if (dt) params.created_to = dt;
      if (minRev !== "") params.min_sales = minRev;
      if (maxRev !== "") params.max_sales = maxRev;
      const res = await api.get(CLIENT.BASE, { params });
      const payload = res.data?.data;
      const items = payload?.items ?? [];
      const mapped = Array.isArray(items)
        ? items.map((c: any) => ({ ...c, is_blocked: !c.is_active }))
        : [];
      setClients(mapped);
      setTotal(payload?.totalRecords ?? payload?.total ?? 0);
      setCurrentPage(page);
      // Always resync — not just when `ps` was explicitly passed — so the
      // dropdown and the "Showing X–Y" text can never drift from what was
      // actually requested from the server.
      setPageSize(resolvedPageSize);
    } catch (error) {
      console.error("Error fetching clients", error);
      showError("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    isMountedRef.current = true;
  }, [fetchClients]);

  useEffect(() => {
    const handler = () => setOpenRowMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  /* ================= FILTER STATE ================= */
  const [showFilter, setShowFilter] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  // Created-at date range (YYYY-MM-DD) and total-sales revenue range.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");

  useEffect(() => {
    rangeFiltersRef.current = { dateFrom, dateTo, minRevenue, maxRevenue };
  }, [dateFrom, dateTo, minRevenue, maxRevenue]);

  // One badge count per active filter group (gender / date / revenue).
  const activeFilterCount =
    (selectedGender ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (minRevenue || maxRevenue ? 1 : 0);

  const genderOptions = [
    "All",
    "Female",
    "Male",
    "Other",
  ];

  /* ================= SORT STATE ================= */
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  const sortOptions = [
    "First name (A-Z)",
    "First name (Z-A)",
    "Created at (oldest first)",
    "Created at (newest first)",
    "Total sales (highest first)",
    "Total sales (lowest first)",
  ];

  const [selectedSort, setSelectedSort] = useState("Created at (newest first)");

  // Shared by the Excel/CSV/PDF export buttons so the exported file always
  // reflects whatever filters/search/sort are currently applied on screen.
  const getExportParams = useCallback(() => {
    const { sort_by, sort_order } = sortMap[selectedSort] ?? { sort_by: "created_at", sort_order: "desc" };
    const params: Record<string, any> = { sort_by, sort_order };
    if (selectedGender && selectedGender !== "All") params.gender = selectedGender.toLowerCase();
    if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
    if (dateFrom) params.created_from = dateFrom;
    if (dateTo) params.created_to = dateTo;
    if (minRevenue !== "") params.min_sales = minRevenue;
    if (maxRevenue !== "") params.max_sales = maxRevenue;
    return params;
  }, [selectedSort, selectedGender, searchQuery, dateFrom, dateTo, minRevenue, maxRevenue]);

  // Debounced live filter: typing in the search box re-fetches the table
  // itself (page 1) instead of showing a separate floating results dropdown.
  useEffect(() => {
    if (!isMountedRef.current) return;
    const t = setTimeout(() => {
      fetchClients(1, selectedSort, selectedGender, pageSize, searchQuery);
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  /* ================= OPTIONS DROPDOWN ================= */
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;
    const handler = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [optionsOpen]);

  /* ================= CLIENTS STATE ================= */
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [primaryClientId, setPrimaryClientId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<
    string | number | null
  >(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  // Rows near the bottom of the (overflow: hidden) table card would otherwise
  // clip the dropdown, or push it behind the pagination bar — computed from
  // the trigger button's real position at open-time, same "flip if not enough
  // room below" approach as AttendancePage.tsx's TimeDropdown, and rendered
  // with position: fixed so it can never be clipped by an ancestor.
  const [rowMenuPos, setRowMenuPos] = useState({ top: 0, left: 0, openUp: false });

  // The dropdown is position:fixed with coordinates captured once at open
  // time (see rowMenuPos's comment above) — those never update afterward, so
  // scrolling the table (or the page) left it visually stranded, floating
  // over whatever row happened to end up under its original screen position
  // instead of the row it was actually opened for. Closing on scroll is
  // simpler and less janky than continuously repositioning it, and is an
  // explicitly acceptable fix. Capture phase so this also catches scrolling
  // inside the table's own scroll container, not just the window.
  useEffect(() => {
    if (!openRowMenuId) return;
    const closeMenu = () => setOpenRowMenuId(null);
    window.addEventListener("scroll", closeMenu, true);
    return () => window.removeEventListener("scroll", closeMenu, true);
  }, [openRowMenuId]);

  useEffect(() => {
    const openClientId = (location.state as any)?.openClientId;
    if (openClientId) {
      setSelectedClientId(openClientId);
      setIsDrawerOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked)
      setSelectedClients(clients.map((c: any) => String(c.id)));
    else setSelectedClients([]);
  };

  const handleSelectClient = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const handleDeleteClients = async () => {
    setIsDeleting(true);
    try {
      // Soft delete (default, no ?hard=true) — archives the client (is_active=false)
      // instead of permanently removing the row, so their appointment/payment/
      // wallet history stays intact and attributable instead of being lost or
      // violating FK constraints on any linked records.
      await Promise.all(
        selectedClients.map((id) => api.delete(CLIENT.BY_ID(id))),
      );
      showSuccess(
        selectedClients.length > 1
          ? "Clients deleted successfully"
          : "Client deleted successfully"
      );
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Error deleting clients", error);
      showError("Failed to delete client(s)");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBlockClients = async () => {
    if (selectedClients.length === 0) return;
    try {
      await api.post(CLIENT.BLOCK, {
        client_ids: selectedClients,
        reason: blockReason,
      });
      showSuccess("Clients blocked successfully");
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Block error:", error);
      showError("Failed to block clients");
    }
  };

  const handleUnblockClients = async () => {
    if (selectedClients.length === 0) return;
    try {
      await api.post(CLIENT.UNBLOCK, { client_ids: selectedClients });
      showSuccess("Clients unblocked successfully");
      setSelectedClients([]);
      await fetchClients();
    } catch (error) {
      console.error("Unblock error:", error);
      showError("Failed to unblock clients");
    }
  };

  const handleUnblockSingle = async (clientId: string) => {
    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        String(c.id) === clientId ? { ...c, is_blocked: false } : c
      )
    );
    try {
      await api.post(CLIENT.UNBLOCK, { client_ids: [clientId] });
      showSuccess("Client unblocked successfully");
    } catch (error: any) {
      // Revert on failure
      setClients((prev) =>
        prev.map((c) =>
          String(c.id) === clientId ? { ...c, is_blocked: true } : c
        )
      );
      console.error("Unblock error:", error?.response?.data || error);
      showError("Failed to unblock client");
    }
  };

  const handleBlockSingle = async (clientId: string) => {
    // Optimistic update
    setClients((prev) =>
      prev.map((c) =>
        String(c.id) === clientId ? { ...c, is_blocked: true } : c
      )
    );
    try {
      await api.post(CLIENT.BLOCK, { client_ids: [clientId], reason: "Blocked by admin" });
      showSuccess("Client blocked successfully");
    } catch (error: any) {
      // Revert on failure
      setClients((prev) =>
        prev.map((c) =>
          String(c.id) === clientId ? { ...c, is_blocked: false } : c
        )
      );
      console.error("Block error:", error?.response?.data || error);
      showError("Failed to block client");
    }
  };

  const handleMergeDuplicates = async () => {
    try {
      setLoading(true);
      await api.post(CLIENT.MERGE_DUPLICATES, { merge_by: "phone" });
      await fetchClients();
      setOptionsOpen(false);
      showSuccess("Duplicate clients merged successfully");
    } catch (error) {
      console.error("Merge error:", error);
      showError("Failed to merge duplicate clients");
    } finally {
      setLoading(false);
    }
  };

  const handleMergeSelected = async () => {
    if (selectedClients.length !== 2 || !primaryClientId) return;
    const secondaryId = selectedClients.find((id) => id !== primaryClientId);
    if (!secondaryId) return;

    try {
      setLoading(true);
      await api.post(CLIENT.MERGE, {
        primary_id: primaryClientId,
        secondary_id: secondaryId,
      });
      setSelectedClients([]);
      setMergeModalOpen(false);
      setPrimaryClientId(null);
      await fetchClients();
      showSuccess("Clients merged successfully");
    } catch (error) {
      console.error("Merge error:", error);
      showError("Failed to merge clients");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clients-page">
      {overlay}
      {/* ================= FILTER MODAL ================= */}
      {showFilter && (
        <div
          className="clients-filter-overlay"
          onClick={() => setShowFilter(false)}
        >
          <div
            className="clients-filter-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="clients-filter-modal__header">
              <h5>Filters</h5>
              <button
                className="clients-filter-modal__close"
                onClick={() => setShowFilter(false)}
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            <div className="clients-filter-modal__body">
              <div className="clients-filter-field">
                <label>Gender</label>
                <select
                  className="form-select form-select-lg custom-focus-select"
                  value={selectedGender ?? ""}
                  onChange={(e) =>
                    setSelectedGender(e.target.value || null)
                  }
                >
                  {genderOptions.map((g) => (
                    <option key={g} value={g === "All" ? "" : g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="clients-filter-field">
                <label>Created date</label>
                <div className="clients-filter-range">
                  <input
                    type="date"
                    className="form-control form-control-lg custom-focus-select"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <span className="clients-filter-range__sep">to</span>
                  <input
                    type="date"
                    className="form-control form-control-lg custom-focus-select"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="clients-filter-field">
                <label>Revenue ({currencySymbol})</label>
                <div className="clients-filter-range">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    className="form-control form-control-lg custom-focus-select"
                    value={minRevenue}
                    onChange={(e) => setMinRevenue(e.target.value)}
                  />
                  <span className="clients-filter-range__sep">to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    className="form-control form-control-lg custom-focus-select"
                    value={maxRevenue}
                    onChange={(e) => setMaxRevenue(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="clients-filter-modal__footer">
              <button
                className="clear-btn"
                onClick={() => {
                  setSelectedGender(null);
                  setDateFrom("");
                  setDateTo("");
                  setMinRevenue("");
                  setMaxRevenue("");
                  // Sync the ref synchronously — fetchClients reads range
                  // filters from it, and the state resets above won't have
                  // flushed to the ref (via its effect) before this call.
                  rangeFiltersRef.current = { dateFrom: "", dateTo: "", minRevenue: "", maxRevenue: "" };
                  setShowFilter(false);
                  fetchClients(1, selectedSort, null);
                }}
              >
                Clear filters
              </button>

              <button
                className="apply-btn"
                onClick={() => {
                  rangeFiltersRef.current = { dateFrom, dateTo, minRevenue, maxRevenue };
                  setShowFilter(false);
                  fetchClients(1, selectedSort, selectedGender);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="page-header d-flex align-items-center justify-content-between mb-4">
        <div className="header-left">
          <div className="title-container d-flex align-items-center">
            <h2 className="page-title mb-0">
              {t("clients.header.title", "Clients list")}
            </h2>
            <Badge variant="dark" pill className="ms-3">
              {total}
            </Badge>
          </div>
          <p className="page-subtitle text-muted mt-2">
            {t(
              "clients.header.subtitle",
              "View, add, edit and delete your client's details.",
            )}
            <LearnMoreLink topic="clients" className="learn-more-link text-primary cursor-pointer ms-1">
              {" "}
              {t("clients.header.learnMore", "Learn more")}
            </LearnMoreLink>
          </p>
        </div>

        <div className="header-actions">
          {/* OPTIONS DROPDOWN */}
          <div className="options-dropdown position-relative" ref={optionsRef}>
            <Button
              variant="outline-dark"
              pill
              onClick={() => setOptionsOpen(!optionsOpen)}
              iconRight={
                <ChevronDown
                  size={14}
                  className={`chevron ${optionsOpen ? "open" : ""}`}
                />
              }
            >
              Options
            </Button>

            {optionsOpen && (
              <div
                className="options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2"
                style={{ width: "200px" }}
              >
                <div
                  className="option-item p-2 cursor-pointer"
                  onClick={() => {
                    setOptionsOpen(false);
                    setImportModalOpen(true);
                  }}
                >
                  <ArrowRight size={14} className="me-2" />
                  Import clients
                </div>
                <div
                  className="option-item p-2 cursor-pointer"
                  onClick={handleMergeDuplicates}
                >
                  <ArrowLeftRight size={14} className="me-2" />
                  Merge clients
                </div>
                <div className="divider border-top my-1" />
                <div className="export-title px-2 py-1 small fw-bold text-muted">
                  Export
                </div>
                <DownloadButton
                  filename="clients.xlsx"
                  fetcher={async () => {
                    const res = await api.get(CLIENT.EXPORT("excel"), {
                      params: getExportParams(),
                      responseType: "blob",
                    });
                    setOptionsOpen(false);
                    return res.data;
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FileEarmarkExcel size={14} className="me-2" />}
                  className="option-item w-100 text-start p-2 small"
                >
                  Excel
                </DownloadButton>
                <DownloadButton
                  filename="clients.csv"
                  fetcher={async () => {
                    const res = await api.get(CLIENT.EXPORT("csv"), {
                      params: getExportParams(),
                      responseType: "blob",
                    });
                    setOptionsOpen(false);
                    return res.data;
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FiletypeCsv size={14} className="me-2" />}
                  className="option-item w-100 text-start p-2 small"
                >
                  CSV
                </DownloadButton>
                <DownloadButton
                  filename="clients.pdf"
                  fetcher={async () => {
                    const res = await api.get(CLIENT.EXPORT("pdf"), {
                      params: getExportParams(),
                      responseType: "blob",
                    });
                    setOptionsOpen(false);
                    return res.data;
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FiletypePdf size={14} className="me-2" />}
                  className="option-item w-100 text-start p-2 small"
                >
                  PDF
                </DownloadButton>
              </div>
            )}
          </div>

          {/* ADD BUTTON */}
          <Button
            variant="dark"
            pill
            iconLeft={<PersonPlus size={14} />}
            onClick={() => navigate("/dashboard/clients/add")}
          >
            Add
          </Button>
        </div>
      </div>


      {/* ================= SEARCH + SORT ================= */}
      <div className="search-container mb-4">
        <div className="search-section d-flex align-items-center justify-content-between">
          <div className="search-left d-flex align-items-center gap-2 flex-grow-1 me-3">
            <ClientSearchInput
              placeholder="Search by Name / Phone"
              highlight
              hideDropdown
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={(client) => {
                setSelectedClientId(client.id);
                setIsDrawerOpen(true);
              }}
            />

            <Button
              className="clients-filter-btn"
              variant="outline-dark"
              onClick={() => setShowFilter(true)}
              iconLeft={<Sliders size={14} />}
            >
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="dark" pill className="ms-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          <div className="sort-dropdown position-relative" ref={sortRef}>
            <Button
              className="clients-sort-btn"
              variant="outline-dark"
              onClick={() => setSortOpen(!sortOpen)}
              iconRight={<ArrowDownUp size={14} />}
            >
              {selectedSort}
            </Button>

            {sortOpen && (
              <div
                className="sort-menu shadow border position-absolute end-0 mt-2 bg-white z-2"
                style={{ width: "220px" }}
              >
                {sortOptions.map((option) => (
                  <div
                    key={option}
                    className={`sort-item p-2 cursor-pointer ${selectedSort === option ? "bg-light fw-bold" : ""}`}
                    onClick={() => {
                      setSelectedSort(option);
                      setSortOpen(false);
                      fetchClients(1, option, selectedGender, pageSize, searchQuery);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      {loading ? (
        <Loader message="Loading clients..." size="md" />
      ) : (
        <div className="table-card">
          <div className="clients-table">
            {selectedClients.length > 0 ? (
              <div className="table-header selected-header">
                <div className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedClients.length === clients.length}
                    onChange={handleSelectAll}
                  />
                </div>
                <div
                  className="selected-actions-container"
                  style={{ gridColumn: "2 / -1" }}
                >
                  <div className="selected-count">
                    {selectedClients.length === clients.length
                      ? "All on page selected"
                      : `${selectedClients.length} selected`}
                    <span className="dot">•</span>
                    <button
                      className="deselect-btn"
                      onClick={() => setSelectedClients([])}
                    >
                      Deselect
                    </button>
                  </div>
                  <div className="selected-actions-buttons">
                    <div className="bulk-edit-dropdown">
                      <button
                        className="btn-outline"
                        onClick={() => setBulkEditOpen(!bulkEditOpen)}
                      >
                        Bulk edit{" "}
                        {bulkEditOpen ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </button>
                      {bulkEditOpen && (
                        <div className="bulk-edit-menu">
                          {selectedClients.some(
                            (id) =>
                              clients.find((c) => String(c.id) === id)
                                ?.is_blocked,
                          ) ? (
                            <div
                              className="bulk-edit-item"
                              onClick={() => {
                                setBulkEditOpen(false);
                                handleUnblockClients();
                              }}
                            >
                              Unblock customers
                            </div>
                          ) : (
                            <div
                              className="bulk-edit-item"
                              onClick={() => {
                                setBulkEditOpen(false);
                                setBlockModalOpen(true);
                              }}
                            >
                              Block customers
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn-outline text-danger"
                      onClick={() => setDeleteModalOpen(true)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-header">
                <div className="col-checkbox">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={false}
                  />
                </div>
                <div
                  className="col-name cursor-pointer"
                  onClick={() => {
                    const nextSort = selectedSort === "First name (A-Z)" ? "First name (Z-A)" : "First name (A-Z)";
                    setSelectedSort(nextSort);
                    fetchClients(1, nextSort, selectedGender, pageSize, searchQuery);
                  }}
                >
                  Client name{" "}
                  {selectedSort === "First name (Z-A)" ? (
                    <ArrowDown size={12} />
                  ) : (
                    <ArrowUp size={12} className={selectedSort === "First name (A-Z)" ? "text-dark" : "text-muted"} />
                  )}
                </div>
                <div className="col-referral">Referral code</div>
                <div className="col-mobile">Mobile number</div>
                <div className="col-reviews">Reviews</div>
                <div className="col-sales">Sales</div>
                <div className="col-created">Created at</div>
                <div></div>
              </div>
            )}

            {clients.length === 0 ? (
              <div className="text-center p-5 text-muted">
                No clients found.
              </div>
            ) : (
              (() => {
                return clients.map((client) => (
                  <div
                    key={client.id}
                    className="table-row"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setIsDrawerOpen(true);
                    }}
                  >
                    <div className="col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(String(client.id))}
                        onChange={() => { }}
                        onClick={(e) =>
                          handleSelectClient(e, String(client.id))
                        }
                      />
                    </div>

                    <div className="col-name">
                      <div className="avatar-container position-relative d-inline-block">
                        <div className="avatar">
                          {(client.first_name?.[0] || "C").toUpperCase()}
                        </div>
                        {client.is_blocked && (
                          <div
                            className="position-absolute bg-white rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                              bottom: "-2px",
                              right: "-2px",
                              width: "16px",
                              height: "16px",
                              boxShadow: "0 0 0 1.5px #fff",
                            }}
                          >
                            <DashCircleFill className="text-danger" size={14} />
                          </div>
                        )}
                      </div>
                      <div className="client-details ms-3">
                        <div
                          className="name"
                          title={`${client.first_name || ""} ${client.last_name || ""}`.trim() || "-"}
                        >
                          {`${client.first_name || ""} ${client.last_name || ""}`}
                        </div>
                        <div className="email" title={client.email || "-"}>
                          {client.email || "-"}
                        </div>
                      </div>
                    </div>

                    <div className="col-referral" title={client.referral_code || "-"}>
                      <span className="col-referral__code">{client.referral_code || "-"}</span>
                      {client.referral_code && (
                        <button
                          type="button"
                          className="col-referral__copy-btn"
                          title="Copy referral code"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(client.referral_code);
                            showSuccess("Referral code copied!");
                          }}
                        >
                          <Clipboard size={12} />
                        </button>
                      )}
                    </div>

                    <div className="col-mobile" title={client.phone_number || "-"}>
                      {client.phone_number || "-"}
                    </div>
                    <div className="col-reviews">
                      {client.reviews_count > 0
                        ? `${parseFloat(client.reviews_avg || "0").toFixed(1)} ★ (${client.reviews_count})`
                        : "-"}
                    </div>
                    <div className="col-sales">
                      {formatAmount(parseFloat(client.total_sales || "0"))}
                    </div>
                    <div className="col-created">
                      {client.created_at
                        ? new Date(client.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })
                        : "-"}
                    </div>

                    {/* 3-dot row menu */}
                    <div
                      className="col-row-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="row-menu-btn"
                        onClick={(e) => {
                          const id = String(client.id);
                          if (openRowMenuId === id) {
                            setOpenRowMenuId(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const margin = 8;
                          const dropdownHeight = 150; // ~4 menu items incl. padding
                          const spaceBelow = window.innerHeight - rect.bottom - margin;
                          const openUp = spaceBelow < dropdownHeight && rect.top > spaceBelow;
                          setRowMenuPos({
                            top: openUp ? rect.top - margin : rect.bottom + margin,
                            left: rect.right,
                            openUp,
                          });
                          setOpenRowMenuId(id);
                        }}
                      >
                        <ThreeDotsVertical size={16} />
                      </button>
                      {openRowMenuId === String(client.id) && (
                        <div
                          className="row-menu-dropdown"
                          style={{
                            position: "fixed",
                            top: rowMenuPos.openUp ? undefined : rowMenuPos.top,
                            bottom: rowMenuPos.openUp ? window.innerHeight - rowMenuPos.top : undefined,
                            left: rowMenuPos.left,
                            transform: "translateX(-100%)",
                          }}
                        >
                          <div
                            className="row-menu-item"
                            onClick={() => {
                              setOpenRowMenuId(null);
                              navigate(`/dashboard/clients/edit/${client.id}`);
                            }}
                          >
                            <PencilSquare size={14} /> Edit
                          </div>
                          {client.is_blocked ? (
                            <div
                              className="row-menu-item success"
                              onClick={() => {
                                setOpenRowMenuId(null);
                                handleUnblockSingle(String(client.id));
                              }}
                            >
                              <CheckCircle size={14} /> Unblock
                            </div>
                          ) : (
                            <div
                              className="row-menu-item warning"
                              onClick={() => {
                                setOpenRowMenuId(null);
                                handleBlockSingle(String(client.id));
                              }}
                            >
                              <SlashCircle size={14} /> Block
                            </div>
                          )}
                          <div
                            className="row-menu-item danger"
                            onClick={() => {
                              setOpenRowMenuId(null);
                              setSelectedClients([String(client.id)]);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash size={14} /> Delete
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      )}

      {/* ================= PAGINATION ================= */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={(page) => fetchClients(page, selectedSort, selectedGender, pageSize)}
        onPageSizeChange={(sz) => fetchClients(1, selectedSort, selectedGender, sz)}
        className="mt-4"
      />

      {/* ================= DELETE MODAL ================= */}
      <Modal
        show={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete clients?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE" || isDeleting}
              loading={isDeleting}
              onClick={async () => {
                await handleDeleteClients();
                setDeleteModalOpen(false);
                setDeleteInput("");
              }}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteInput("");
              }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          Are you sure you want to delete this client? This operation can't be
          undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>

      {/* ================= BLOCK MODAL ================= */}
      <Modal
        show={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Block client"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="dark"
              fullWidth
              disabled={!blockReason}
              onClick={async () => {
                await handleBlockClients();
                setBlockModalOpen(false);
                setBlockReason("");
              }}
            >
              Block
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => {
                setBlockModalOpen(false);
                setBlockReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          Blocking clients prevents them from booking online appointments with
          you and automatically excludes them from any marketing messages.
        </p>
        <div className="mb-3">
          <label className="form-label fw-semibold small">
            Select blocking reason
          </label>
          <select
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className={`form-select ${blockReason === "" ? "text-muted" : ""}`}
          >
            <option value="" disabled hidden>
              Select blocking reason
            </option>
            <option value="Too many no-shows">Too many no-shows</option>
            <option value="Too many late cancellations">
              Too many late cancellations
            </option>
            <option value="Too many reschedules">Too many reschedules</option>
            <option value="Rude or inappropriate to a team member">
              Rude or inappropriate to a team member
            </option>
            <option value="Refused to pay">Refused to pay</option>
            <option value="Booked fake appointments">
              Booked fake appointments
            </option>
            <option value="Other">Other</option>
          </select>
        </div>
      </Modal>


      {/* ================= MERGE MODAL ================= */}
      {mergeModalOpen && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="modal-header">
              <h4>Merge clients</h4>
              <button
                className="close-btn"
                onClick={() => setMergeModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Select the primary client to keep. The other client's history
                (sessions, notes, etc.) will be merged into this one, and the
                secondary record will be deleted.
              </p>

              <div className="input-group">
                <label>Choose primary profile</label>
                <div className="merge-options">
                  {selectedClients.map((id) => {
                    const client = clients.find((c) => String(c.id) === id);
                    return (
                      <div
                        key={id}
                        className={`merge-option-card ${primaryClientId === id ? "active" : ""}`}
                        onClick={() => setPrimaryClientId(id)}
                        style={{
                          padding: "12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          marginBottom: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          background:
                            primaryClientId === id ? "#f3f4f6" : "white",
                          borderColor:
                            primaryClientId === id ? "#6366f1" : "#e5e7eb",
                        }}
                      >
                        <input
                          type="radio"
                          name="primaryClient"
                          checked={primaryClientId === id}
                          readOnly
                        />
                        <div className="client-mini-info">
                          <div style={{ fontWeight: 600 }}>
                            {client?.first_name} {client?.last_name}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {client?.email || client?.phone_number}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-outline w-100"
                onClick={() => setMergeModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-dark w-100"
                onClick={handleMergeSelected}
                disabled={!primaryClientId}
              >
                Merge to primary
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientDetailsDrawer
        clientId={selectedClientId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      <ClientImportModal
        show={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchClients}
      />
    </div>
  );
}
