import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  FileEarmarkExcel,
  FiletypeCsv,
  TagFill,
  Receipt,
  ArrowDownUp,
  X,
  CheckCircleFill,
  ClockHistory,
  XCircleFill,
  ArrowCounterclockwise,
  SlashCircle,
  ChevronLeft,
  ExclamationCircle,
  Sliders,
  CreditCard2Front,
  ArrowRight,
} from "react-bootstrap-icons";
import "../styles/SalesListPage.scss";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchSalesThunk,
  fetchSaleByIdThunk,
  fetchSaleSummaryThunk,
  exportSalesThunk,
  deleteSaleThunk,
} from "../../../middleware/sale/sale.thunk";
import { clearSaleError } from "../../../store/saleSlice";
import type { Sale, SaleSummary } from "../../../types/sale.types";
import { useSale } from "../../analytics/context/SaleContext";
import QuickSaleDrawer from "../../analytics/components/QuickSaleDrawer";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { Button, Badge, Input, Modal, DownloadButton } from "../../../components/ui";
import api from "../../../services/api/axios";
import { SALE } from "../../../services/api/endpoints";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtMoney = (v: string | number) =>
  "₹" + parseFloat(String(v || "0")).toFixed(2);

const toISO = (d: Date) => format(d, "yyyy-MM-dd");

const STATUS_META: Record<
  string,
  { label: string; mod: string; Icon: React.FC<{ size?: number }> }
> = {
  completed: { label: "Completed", mod: "completed", Icon: CheckCircleFill },
  draft:     { label: "Draft",     mod: "draft",     Icon: ClockHistory },
  cancelled: { label: "Cancelled", mod: "cancelled", Icon: XCircleFill },
  refunded:  { label: "Refunded",  mod: "refunded",  Icon: ArrowCounterclockwise },
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", gift_card: "Gift Card", split: "Split", upi: "UPI",
};

const SORT_OPTIONS = [
  { label: "Date (newest first)", key: "date_desc" },
  { label: "Date (oldest first)", key: "date_asc" },
  { label: "Total (highest first)", key: "total_desc" },
  { label: "Total (lowest first)", key: "total_asc" },
];

const STATUS_FILTER_OPTIONS = ["All", "Completed", "Draft", "Cancelled", "Refunded"];
const PAYMENT_FILTER_OPTIONS = ["All", "Cash", "Card", "UPI", "Gift Card", "Split"];

const ROWS_PER_PAGE = 10;

type DatePreset = "Today" | "Yesterday" | "This week" | "Last week" | "This month" | "Last month" | "All time";

function getPresetRange(preset: DatePreset): { startDate?: string; endDate?: string } {
  const today = new Date();
  switch (preset) {
    case "Today":
      return { startDate: toISO(today), endDate: toISO(today) };
    case "Yesterday": {
      const d = subDays(today, 1);
      return { startDate: toISO(d), endDate: toISO(d) };
    }
    case "This week":
      return {
        startDate: toISO(startOfWeek(today, { weekStartsOn: 1 })),
        endDate:   toISO(endOfWeek(today,   { weekStartsOn: 1 })),
      };
    case "Last week": {
      const last = subDays(today, 7);
      return {
        startDate: toISO(startOfWeek(last, { weekStartsOn: 1 })),
        endDate:   toISO(endOfWeek(last,   { weekStartsOn: 1 })),
      };
    }
    case "This month":
      return { startDate: toISO(startOfMonth(today)), endDate: toISO(endOfMonth(today)) };
    case "Last month": {
      const last = subMonths(today, 1);
      return { startDate: toISO(startOfMonth(last)), endDate: toISO(endOfMonth(last)) };
    }
    default:
      return {};
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function SalesListPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ── Redux selectors ──────────────────────────────────────────────────────────
  const allSales = useSelector(
    (s: RootState) => (s.sale as any).items as Sale[],
  );
  const summary = useSelector(
    (s: RootState) => (s.sale as any).summary as SaleSummary | null,
  );
  const isLoading = useSelector(
    (s: RootState) => (s.sale as any).loading?.fetchAll as boolean ?? false,
  );
  const isLoadingDetail = useSelector(
    (s: RootState) => (s.sale as any).loading?.fetchById as boolean ?? false,
  );
  const isCreatingSale = useSelector(
    (s: RootState) => (s.sale as any).loading?.create as boolean ?? false,
  );
  const selectedSale = useSelector(
    (s: RootState) => (s.sale as any).selectedItem as Sale | null,
  );
  const apiError = useSelector(
    (s: RootState) => (s.sale as any).error as string | null,
  );

  const { drafts, cancelDraft } = useSale();

  // ── Local state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]           = useState<"sales" | "drafts">("sales");
  const [search, setSearch]                 = useState("");
  const [sortKey, setSortKey]               = useState("date_desc");
  const [datePreset, setDatePreset]         = useState<DatePreset>("All time");
  const [currentPage, setCurrentPage]       = useState(1);

  // Filters
  const [showFilter, setShowFilter]         = useState(false);
  const [statusFilter, setStatusFilter]     = useState<string>("All");
  const [paymentFilter, setPaymentFilter]   = useState<string>("All");
  const [statusFilterOpen, setStatusFilterOpen] = useState(true);
  const [paymentFilterOpen, setPaymentFilterOpen] = useState(false);

  // Selection
  const [selectedSales, setSelectedSales]   = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen]     = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput]       = useState("");

  // Dropdowns
  const [showOptions,  setShowOptions]      = useState(false);
  const [showSort,     setShowSort]         = useState(false);
  const [showDateMenu, setShowDateMenu]     = useState(false);
  const [drawerOpen,   setDrawerOpen]       = useState(false);
  const [detailOpen,   setDetailOpen]       = useState(false);
  const [toast,        setToast]            = useState<string | null>(null);
  const [showBanner,   setShowBanner]       = useState(true);

  const optionsRef  = useRef<HTMLDivElement>(null);
  const sortRef     = useRef<HTMLDivElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const bulkEditRef = useRef<HTMLDivElement>(null);

  // Track whether a sale was created while drawer was open
  const wasCreatingRef = useRef(false);

  // ── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchSalesThunk());
    dispatch(fetchSaleSummaryThunk());
  }, [dispatch]);

  // ── Refetch after QuickSaleDrawer creates a sale ─────────────────────────────
  useEffect(() => {
    if (isCreatingSale) {
      wasCreatingRef.current = true;
    } else if (wasCreatingRef.current) {
      wasCreatingRef.current = false;
      const range = getPresetRange(datePreset);
      dispatch(fetchSalesThunk(range));
      dispatch(fetchSaleSummaryThunk());
    }
  }, [isCreatingSale]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Show API errors as toast ─────────────────────────────────────────────────
  useEffect(() => {
    if (apiError) {
      showToast(apiError);
      dispatch(clearSaleError());
    }
  }, [apiError, dispatch]);

  // ── Close dropdowns on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (optionsRef.current  && !optionsRef.current.contains(e.target as Node))  setShowOptions(false);
      if (sortRef.current     && !sortRef.current.contains(e.target as Node))     setShowSort(false);
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setShowDateMenu(false);
      if (bulkEditRef.current && !bulkEditRef.current.contains(e.target as Node)) setBulkEditOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── Date preset change → refetch from backend ────────────────────────────────
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setShowDateMenu(false);
    setCurrentPage(1);
    const range = getPresetRange(preset);
    dispatch(fetchSalesThunk(range));
  };

  // ── Selection handlers ────────────────────────────────────────────────────────
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedSales(displaySalesForPage.map((s) => String(s.id)));
    else setSelectedSales([]);
  };

  const handleSelectSale = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedSales((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  // ── Delete selected drafts ────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    try {
      await Promise.all(selectedSales.map((id) => dispatch(deleteSaleThunk(id))));
      setSelectedSales([]);
      setDeleteModalOpen(false);
      setDeleteInput("");
      const range = getPresetRange(datePreset);
      dispatch(fetchSalesThunk(range));
      dispatch(fetchSaleSummaryThunk());
      showToast("Sales deleted successfully");
    } catch {
      showToast("Failed to delete sales");
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const completedSales = allSales.filter((s) => s.status !== "draft");

  // Active filter count
  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) + (paymentFilter !== "All" ? 1 : 0);

  // Fallback client-side summary
  const summaryData = {
    total_revenue:   summary?.total_revenue   ?? String(completedSales.filter(s => s.status === "completed").reduce((a, s) => a + parseFloat(s.total_amount || "0"), 0).toFixed(2)),
    total_sales:     summary?.total_sales     ?? completedSales.length,
    completed_sales: summary?.completed_sales ?? completedSales.filter(s => s.status === "completed").length,
    draft_sales:     summary?.draft_sales     ?? drafts.length,
  };

  // Client-side search + status/payment filter + sort
  const displaySales = completedSales
    .filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || String(s.id).includes(q) || (s.client_id || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || s.status === statusFilter.toLowerCase();
      const matchPayment = paymentFilter === "All" || s.payment_method === paymentFilter.toLowerCase().replace(" ", "_");
      return matchSearch && matchStatus && matchPayment;
    })
    .sort((a, b) => {
      if (sortKey === "date_desc")  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortKey === "date_asc")   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortKey === "total_desc") return parseFloat(b.total_amount) - parseFloat(a.total_amount);
      if (sortKey === "total_asc")  return parseFloat(a.total_amount) - parseFloat(b.total_amount);
      return 0;
    });

  const displayDrafts = drafts.filter((d) => {
    const q = search.toLowerCase();
    return !q || String(d.id).includes(q) || (d.client_id || "").toLowerCase().includes(q);
  });

  // Pagination
  const totalSalesPages = Math.ceil(displaySales.length / ROWS_PER_PAGE);
  const totalDraftsPages = Math.ceil(displayDrafts.length / ROWS_PER_PAGE);
  const currentList = activeTab === "sales" ? displaySales : displayDrafts;
  const totalPages  = activeTab === "sales" ? totalSalesPages : totalDraftsPages;

  const displaySalesForPage = activeTab === "sales"
    ? displaySales.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)
    : displayDrafts.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const startItem = currentList.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const endItem   = Math.min(currentPage * ROWS_PER_PAGE, currentList.length);

  const openDetail = useCallback((id: string | number) => {
    dispatch(fetchSaleByIdThunk(id));
    setDetailOpen(true);
  }, [dispatch]);

  const closeDetail = () => setDetailOpen(false);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Sort";

  // Reset page when switching tabs or filtering
  const handleTabChange = (tab: "sales" | "drafts") => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedSales([]);
  };

  return (
    <div className="sales-pg">

      {/* ── TOAST ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="sales-pg__toast">
          <ExclamationCircle size={15} />
          <span>{toast}</span>
          <button className="sales-pg__toast-close" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── FILTER DRAWER ──────────────────────────────────────────────────── */}
      {showFilter && (
        <div className="sales-pg__filter-overlay" onClick={() => setShowFilter(false)}>
          <div className="sales-pg__filter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sales-pg__filter-header">
              <button
                className="sales-pg__filter-close"
                onClick={() => setShowFilter(false)}
              >
                <X size={16} />
              </button>
              <h4 className="sales-pg__filter-title">All filters</h4>
            </div>

            <div className="sales-pg__filter-body">
              {/* Status filter */}
              <div className="sales-pg__filter-item">
                <div
                  className="sales-pg__filter-section-title"
                  onClick={() => setStatusFilterOpen((v) => !v)}
                >
                  <div className="sales-pg__filter-title-left">
                    <CheckCircleFill size={14} />
                    <span>Status</span>
                    {statusFilter !== "All" && (
                      <span className="sales-pg__filter-count">1</span>
                    )}
                  </div>
                  <div className="sales-pg__filter-title-right">
                    {statusFilter !== "All" && (
                      <span
                        className="sales-pg__filter-clear"
                        onClick={(e) => { e.stopPropagation(); setStatusFilter("All"); }}
                      >
                        Clear
                      </span>
                    )}
                    {statusFilterOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </div>
                {statusFilterOpen && (
                  <div className="sales-pg__filter-options">
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <div
                        key={opt}
                        className={`sales-pg__filter-option${statusFilter === opt ? " sales-pg__filter-option--active" : ""}`}
                        onClick={() => setStatusFilter(opt)}
                      >
                        <span>{opt}</span>
                        {statusFilter === opt && <span className="sales-pg__filter-check">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment method filter */}
              <div className="sales-pg__filter-item">
                <div
                  className="sales-pg__filter-section-title"
                  onClick={() => setPaymentFilterOpen((v) => !v)}
                >
                  <div className="sales-pg__filter-title-left">
                    <CreditCard2Front size={14} />
                    <span>Payment method</span>
                    {paymentFilter !== "All" && (
                      <span className="sales-pg__filter-count">1</span>
                    )}
                  </div>
                  <div className="sales-pg__filter-title-right">
                    {paymentFilter !== "All" && (
                      <span
                        className="sales-pg__filter-clear"
                        onClick={(e) => { e.stopPropagation(); setPaymentFilter("All"); }}
                      >
                        Clear
                      </span>
                    )}
                    {paymentFilterOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </div>
                {paymentFilterOpen && (
                  <div className="sales-pg__filter-options">
                    {PAYMENT_FILTER_OPTIONS.map((opt) => (
                      <div
                        key={opt}
                        className={`sales-pg__filter-option${paymentFilter === opt ? " sales-pg__filter-option--active" : ""}`}
                        onClick={() => setPaymentFilter(opt)}
                      >
                        <span>{opt}</span>
                        {paymentFilter === opt && <span className="sales-pg__filter-check">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sales-pg__filter-footer">
              <button
                className="sales-pg__filter-btn-clear"
                onClick={() => { setStatusFilter("All"); setPaymentFilter("All"); }}
              >
                Clear filters
              </button>
              <button
                className="sales-pg__filter-btn-apply"
                onClick={() => { setShowFilter(false); setCurrentPage(1); }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="sales-pg__header">
        <div className="sales-pg__header-info">
          <div className="sales-pg__title-row">
            <h2 className="sales-pg__title">Sales</h2>
            <Badge variant="dark" pill className="ms-2">
              {completedSales.length}
            </Badge>
          </div>
          <p className="sales-pg__subtitle">
            View, filter and export the history of your sales.
          </p>
        </div>

        <div className="sales-pg__header-actions">
          {/* Options dropdown */}
          <div className="sales-pg__dropdown-wrap" ref={optionsRef}>
            <Button
              variant="outline-dark"
              onClick={() => setShowOptions((v) => !v)}
              iconRight={
                <ChevronDown size={13} className={showOptions ? "sales-pg__chevron--open" : ""} />
              }
            >
              Options
            </Button>
            {showOptions && (
              <div className="sales-pg__options-menu">
                <div className="sales-pg__options-label">Export</div>
                <DownloadButton
                  filename="sales.xlsx"
                  fetcher={async () => {
                    const res = await api.get(SALE.EXPORT({ format: "excel" }), { responseType: "blob" });
                    setShowOptions(false);
                    return res.data;
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FileEarmarkExcel size={14} className="sales-pg__icon--excel" />}
                  className="sales-pg__options-download-btn"
                >
                  Excel
                </DownloadButton>
                <DownloadButton
                  filename="sales.csv"
                  fetcher={async () => {
                    const res = await api.get(SALE.EXPORT({ format: "csv" }), { responseType: "blob" });
                    setShowOptions(false);
                    return res.data;
                  }}
                  variant="ghost"
                  size="sm"
                  iconLeft={<FiletypeCsv size={14} className="sales-pg__icon--csv" />}
                  className="sales-pg__options-download-btn"
                >
                  CSV
                </DownloadButton>
              </div>
            )}
          </div>

          <Button
            variant="dark"
            onClick={() => setDrawerOpen(true)}
            iconLeft={<Plus size={16} />}
          >
            New sale
          </Button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ──────────────────────────────────────────────────── */}
      <div className="sales-pg__cards">
        <div className="sales-pg__card">
          <label>Total revenue</label>
          <div className="sales-pg__val">{fmtMoney(summaryData.total_revenue)}</div>
        </div>
        <div className="sales-pg__card">
          <label>Total sales</label>
          <div className="sales-pg__val">{summaryData.total_sales}</div>
        </div>
        <div className="sales-pg__card">
          <label>Completed</label>
          <div className="sales-pg__val sales-pg__val--green">{summaryData.completed_sales}</div>
        </div>
        <div className="sales-pg__card">
          <label>Drafts</label>
          <div className="sales-pg__val sales-pg__val--muted">{summaryData.draft_sales}</div>
        </div>
        <div className="sales-pg__card">
          <label>Cancelled</label>
          <div className="sales-pg__val sales-pg__val--red">
            {completedSales.filter((s) => s.status === "cancelled").length}
          </div>
        </div>
      </div>

      {/* ── PROMO BANNER ───────────────────────────────────────────────────── */}
      {showBanner && (
        <div className="sales-pg__banner">
          <div className="sales-pg__banner-content">
            <h3 className="sales-pg__banner-title">Track and grow your revenue</h3>
            <p className="sales-pg__banner-text">
              Use filters and date ranges to analyse your best-performing services and payment methods.
            </p>
            <div className="sales-pg__banner-actions">
              <button
                className="sales-pg__banner-btn"
                onClick={() => setDrawerOpen(true)}
              >
                Create first sale
              </button>
              <span className="sales-pg__banner-link">
                <ArrowRight size={13} /> Learn more
              </span>
            </div>
          </div>
          <button className="sales-pg__banner-close" onClick={() => setShowBanner(false)}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── TABS ───────────────────────────────────────────────────────────── */}
      <div className="sales-pg__tabs">
        <button
          className={`sales-pg__tab${activeTab === "sales" ? " sales-pg__tab--active" : ""}`}
          onClick={() => handleTabChange("sales")}
        >
          Sales
          {completedSales.length > 0 && (
            <span className="sales-pg__tab-count">{completedSales.length}</span>
          )}
        </button>
        <button
          className={`sales-pg__tab${activeTab === "drafts" ? " sales-pg__tab--active" : ""}`}
          onClick={() => handleTabChange("drafts")}
        >
          Drafts
          {drafts.length > 0 && (
            <span className="sales-pg__tab-count">{drafts.length}</span>
          )}
        </button>
      </div>

      {/* ── SEARCH + FILTERS TOOLBAR ────────────────────────────────────────── */}
      <div className="sales-pg__toolbar">
        <div className="sales-pg__toolbar-left">
          {/* Search */}
          <div className="sales-pg__search">
            <Search size={14} className="sales-pg__search-icon" />
            <input
              type="text"
              placeholder={activeTab === "sales" ? "Search by sale # or client" : "Search drafts"}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="sales-pg__search-input"
            />
            {search && (
              <button className="sales-pg__search-clear" onClick={() => setSearch("")}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters button */}
          <Button
            variant="outline-dark"
            onClick={() => setShowFilter(true)}
            iconLeft={<Sliders size={14} />}
          >
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="dark" pill className="ms-1">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        <div className="sales-pg__toolbar-right">
          {/* Date range */}
          <div className="sales-pg__dropdown-wrap" ref={dateMenuRef}>
            <Button
              variant="outline-dark"
              onClick={() => setShowDateMenu((v) => !v)}
              iconRight={<ChevronDown size={12} />}
            >
              {datePreset}
            </Button>
            {showDateMenu && (
              <div className="sales-pg__dropdown sales-pg__dropdown--right">
                {(["All time", "Today", "Yesterday", "This week", "Last week", "This month", "Last month"] as DatePreset[]).map((p) => (
                  <div
                    key={p}
                    className={`sales-pg__dropdown-item${datePreset === p ? " sales-pg__dropdown-item--active" : ""}`}
                    onClick={() => applyDatePreset(p)}
                  >
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="sales-pg__dropdown-wrap" ref={sortRef}>
            <Button
              variant="outline-dark"
              onClick={() => setShowSort((v) => !v)}
              iconRight={<ArrowDownUp size={12} />}
            >
              {currentSortLabel}
            </Button>
            {showSort && (
              <div className="sales-pg__dropdown sales-pg__dropdown--right">
                {SORT_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    className={`sales-pg__dropdown-item${sortKey === opt.key ? " sales-pg__dropdown-item--active" : ""}`}
                    onClick={() => { setSortKey(opt.key); setShowSort(false); }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="sales-pg__skeleton">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="sales-pg__skeleton-row" />
          ))}
        </div>
      ) : (
        <div className="sales-pg__table-card">
          {activeTab === "sales" ? (
            displaySales.length > 0 ? (
              <>
                {/* Table header — bulk selected or normal */}
                {selectedSales.length > 0 ? (
                  <div className="sales-pg__table-header sales-pg__table-header--selected">
                    <div className="sales-pg__col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedSales.length === displaySalesForPage.length && displaySalesForPage.length > 0}
                        onChange={handleSelectAll}
                      />
                    </div>
                    <div className="sales-pg__selected-bar">
                      <div className="sales-pg__selected-count">
                        {selectedSales.length === displaySales.length ? "All selected" : `${selectedSales.length} selected`}
                        <span className="sales-pg__dot">•</span>
                        <button
                          className="sales-pg__deselect-btn"
                          onClick={() => setSelectedSales([])}
                        >
                          Deselect
                        </button>
                      </div>
                      <div className="sales-pg__selected-actions">
                        <div className="sales-pg__bulk-dropdown" ref={bulkEditRef}>
                          <button
                            className="sales-pg__bulk-btn"
                            onClick={() => setBulkEditOpen((v) => !v)}
                          >
                            Bulk actions {bulkEditOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                          {bulkEditOpen && (
                            <div className="sales-pg__bulk-menu">
                              <div
                                className="sales-pg__bulk-item"
                                onClick={() => {
                                  setBulkEditOpen(false);
                                  // export selected IDs
                                  dispatch(exportSalesThunk({ format: "excel" }));
                                }}
                              >
                                Export selected
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          className="sales-pg__delete-btn"
                          onClick={() => setDeleteModalOpen(true)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="sales-pg__table-header">
                    <div className="sales-pg__col-checkbox">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={false}
                      />
                    </div>
                    <div>Sale #</div>
                    <div>Client</div>
                    <div className="sales-pg__col--center">Status</div>
                    <div>Payment</div>
                    <div>Date</div>
                    <div className="sales-pg__col--right">Total</div>
                  </div>
                )}

                {/* Rows */}
                {displaySalesForPage.map((sale) => {
                  const meta = STATUS_META[sale.status] ?? { label: sale.status, mod: "draft", Icon: ClockHistory };
                  const { Icon } = meta;
                  const isChecked = selectedSales.includes(String(sale.id));
                  return (
                    <div
                      key={sale.id}
                      className={`sales-pg__table-row${isChecked ? " sales-pg__table-row--checked" : ""}`}
                      onClick={() => openDetail(sale.id)}
                    >
                      <div className="sales-pg__col-checkbox">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          onClick={(e) => handleSelectSale(e, String(sale.id))}
                        />
                      </div>
                      <div className="sales-pg__sale-num">#{sale.id}</div>
                      <div className="sales-pg__client-cell">
                        <div className="sales-pg__avatar">
                          {sale.client_id
                            ? sale.client_id.substring(0, 2).toUpperCase()
                            : "WI"}
                        </div>
                        <div>
                          <div className="sales-pg__client-name">
                            {sale.client_id ?? <span className="sales-pg__walk-in">Walk-in</span>}
                          </div>
                        </div>
                      </div>
                      <div className="sales-pg__col--center">
                        <span className={`sales-pg__badge sales-pg__badge--${meta.mod}`}>
                          <Icon size={11} /> {meta.label}
                        </span>
                      </div>
                      <div className="sales-pg__muted-cell">
                        {sale.payment_method ? (PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method) : "—"}
                      </div>
                      <div className="sales-pg__muted-cell">
                        {format(new Date(sale.created_at), "dd MMM yyyy")}
                      </div>
                      <div className="sales-pg__col--right sales-pg__amount-cell">
                        {fmtMoney(sale.total_amount)}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <EmptyState
                icon={<TagFill size={28} />}
                title={search || activeFilterCount > 0 ? "No sales found" : "No sales yet"}
                text={search || activeFilterCount > 0 ? "Try adjusting your search or filters." : "Start processing sales to see them here."}
                actionLabel={!search && activeFilterCount === 0 ? "Create new sale" : undefined}
                onAction={!search && activeFilterCount === 0 ? () => setDrawerOpen(true) : undefined}
              />
            )
          ) : /* Drafts tab */
          displayDrafts.length > 0 ? (
            <>
              <div className="sales-pg__table-header sales-pg__table-header--drafts">
                <div>Draft #</div>
                <div>Client</div>
                <div className="sales-pg__col--center">Status</div>
                <div>Created</div>
                <div className="sales-pg__col--right">Total</div>
              </div>
              {displaySalesForPage.map((draft) => (
                <div
                  key={draft.id}
                  className="sales-pg__table-row sales-pg__table-row--drafts"
                  onClick={() => openDetail(draft.id)}
                >
                  <div className="sales-pg__sale-num">#{draft.id}</div>
                  <div className="sales-pg__client-cell">
                    <div className="sales-pg__avatar sales-pg__avatar--draft">
                      {draft.client_id
                        ? draft.client_id.substring(0, 2).toUpperCase()
                        : "WI"}
                    </div>
                    <div className="sales-pg__client-name">
                      {draft.client_id ?? <span className="sales-pg__walk-in">Walk-in</span>}
                    </div>
                  </div>
                  <div className="sales-pg__col--center">
                    <span className="sales-pg__badge sales-pg__badge--draft">
                      <ClockHistory size={11} /> Draft
                    </span>
                  </div>
                  <div className="sales-pg__muted-cell">
                    {format(new Date(draft.created_at), "dd MMM yyyy, HH:mm")}
                  </div>
                  <div className="sales-pg__col--right sales-pg__amount-cell">
                    {fmtMoney(draft.total_amount)}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <EmptyState
              icon={<Receipt size={28} />}
              title="No draft sales"
              text="Drafts are saved when you don't complete a checkout."
              actionLabel="Create sale"
              onAction={() => setDrawerOpen(true)}
            />
          )}
        </div>
      )}

      {/* ── PAGINATION ─────────────────────────────────────────────────────── */}
      {currentList.length > 0 && (
        <div className="sales-pg__pagination-bar">
          <div className="sales-pg__results-text">
            Viewing {startItem}–{endItem} of {currentList.length} results
          </div>
          <div className="sales-pg__pagination-controls">
            <button
              className="sales-pg__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`sales-pg__page-btn${currentPage === page ? " sales-pg__page-btn--active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="sales-pg__page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── SALE DETAIL DRAWER ─────────────────────────────────────────────── */}
      {detailOpen && (
        <div className="sales-detail-overlay" onClick={closeDetail}>
          <div className="sales-detail" onClick={(e) => e.stopPropagation()}>
            <div className="sales-detail__header">
              <button className="sales-detail__back" onClick={closeDetail}>
                <ChevronLeft size={16} />
              </button>
              <h3 className="sales-detail__title">
                {isLoadingDetail ? "Loading…" : selectedSale ? `Sale #${selectedSale.id}` : "Sale details"}
              </h3>
              <button className="sales-detail__close" onClick={closeDetail}>
                <X size={17} />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="sales-pg__skeleton" style={{ padding: "24px" }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="sales-pg__skeleton-row" />
                ))}
              </div>
            ) : selectedSale ? (
              <div className="sales-detail__body">
                {/* Status + date */}
                <div className="sales-detail__meta-row">
                  {(() => {
                    const meta = STATUS_META[selectedSale.status] ?? { label: selectedSale.status, mod: "draft", Icon: SlashCircle };
                    const { Icon } = meta;
                    return (
                      <span className={`sales-pg__badge sales-pg__badge--${meta.mod}`}>
                        <Icon size={11} /> {meta.label}
                      </span>
                    );
                  })()}
                  <span className="sales-detail__date">
                    {format(new Date(selectedSale.created_at), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>

                {/* Client */}
                <div className="sales-detail__client-card">
                  <div className="sales-detail__avatar">
                    {selectedSale.client_id
                      ? selectedSale.client_id.substring(0, 2).toUpperCase()
                      : "WI"}
                  </div>
                  <div>
                    <div className="sales-detail__client-name">
                      {selectedSale.client_id ?? "Walk-in"}
                    </div>
                    {selectedSale.payment_method && (
                      <div className="sales-detail__client-sub">
                        Paid via {PAYMENT_LABEL[selectedSale.payment_method] ?? selectedSale.payment_method}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="sales-detail__section">
                  <div className="sales-detail__section-title">Items</div>
                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    <div className="sales-detail__items">
                      {selectedSale.items.map((item, idx) => (
                        <div key={idx} className="sales-detail__item">
                          <div>
                            <div className="sales-detail__item-name">{item.name}</div>
                            <div className="sales-detail__item-sub">
                              Qty {item.quantity} × {fmtMoney(item.unit_price)}
                            </div>
                          </div>
                          <div className="sales-detail__item-total">
                            {fmtMoney(item.total_price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="sales-detail__empty-items">No item details available.</p>
                  )}
                </div>

                {/* Totals */}
                <div className="sales-detail__totals">
                  <div className="sales-detail__total-row">
                    <span>Subtotal</span>
                    <span>{fmtMoney(selectedSale.subtotal)}</span>
                  </div>
                  {parseFloat(selectedSale.discount_amount) > 0 && (
                    <div className="sales-detail__total-row sales-detail__total-row--discount">
                      <span>Discount</span>
                      <span>−{fmtMoney(selectedSale.discount_amount)}</span>
                    </div>
                  )}
                  {parseFloat(selectedSale.tip_amount) > 0 && (
                    <div className="sales-detail__total-row">
                      <span>Tip</span>
                      <span>{fmtMoney(selectedSale.tip_amount)}</span>
                    </div>
                  )}
                  {parseFloat(selectedSale.tax_amount) > 0 && (
                    <div className="sales-detail__total-row">
                      <span>Tax</span>
                      <span>{fmtMoney(selectedSale.tax_amount)}</span>
                    </div>
                  )}
                  <div className="sales-detail__total-row sales-detail__total-row--grand">
                    <span>Total</span>
                    <span>{fmtMoney(selectedSale.total_amount)}</span>
                  </div>
                </div>

                {/* Notes */}
                {selectedSale.notes && (
                  <div className="sales-detail__section">
                    <div className="sales-detail__section-title">Note</div>
                    <p className="sales-detail__note">{selectedSale.notes}</p>
                  </div>
                )}

                {/* Draft actions */}
                {selectedSale.status === "draft" && (
                  <div className="sales-detail__actions">
                    <button
                      className="sales-pg__btn sales-pg__btn--white sales-pg__btn--danger"
                      onClick={() => { cancelDraft(selectedSale.id); closeDetail(); }}
                    >
                      Cancel draft
                    </button>
                    <button
                      className="sales-pg__btn sales-pg__btn--dark"
                      onClick={() => { closeDetail(); setDrawerOpen(true); }}
                    >
                      Checkout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="sales-detail__error">Failed to load sale details.</p>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ────────────────────────────────────────────────────── */}
      <Modal
        show={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteInput(""); }}
        title="Delete sales?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE"}
              onClick={handleDeleteSelected}
            >
              Delete
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => { setDeleteModalOpen(false); setDeleteInput(""); }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          Are you sure you want to delete {selectedSales.length} sale{selectedSales.length !== 1 ? "s" : ""}? This operation can't be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
        />
      </Modal>

      {/* Quick Sale Drawer */}
      <QuickSaleDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({
  icon, title, text, actionLabel, onAction,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="sales-pg__empty">
      <div className="sales-pg__empty-icon">{icon}</div>
      <h4 className="sales-pg__empty-title">{title}</h4>
      <p className="sales-pg__empty-text">{text}</p>
      {actionLabel && onAction && (
        <button className="sales-pg__btn sales-pg__btn--dark" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
