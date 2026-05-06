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
import { Button, Badge, Input, Modal, DownloadButton, Table, Pagination, Loader } from "../../../components/ui";
import api from "../../../services/api/axios";
import { SALE } from "../../../services/api/endpoints";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtMoney = (v: string | number) =>
  "₹" + parseFloat(String(v || "0")).toFixed(2);

const toISO = (d: Date) => format(d, "yyyy-MM-dd");

const STATUS_META: Record<
  string,
  { label: string; mod: string; Icon: React.FC<{ size?: number; className?: string }> }
> = {
  completed: { label: "Completed", mod: "completed", Icon: CheckCircleFill },
  draft: { label: "Draft", mod: "draft", Icon: ClockHistory },
  cancelled: { label: "Cancelled", mod: "cancelled", Icon: XCircleFill },
  refunded: { label: "Refunded", mod: "refunded", Icon: ArrowCounterclockwise },
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
        endDate: toISO(endOfWeek(today, { weekStartsOn: 1 })),
      };
    case "Last week": {
      const last = subDays(today, 7);
      return {
        startDate: toISO(startOfWeek(last, { weekStartsOn: 1 })),
        endDate: toISO(endOfWeek(last, { weekStartsOn: 1 })),
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
  const [activeTab, setActiveTab] = useState<"sales" | "drafts">("sales");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date_desc");
  const [datePreset, setDatePreset] = useState<DatePreset>("All time");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [paymentFilter, setPaymentFilter] = useState<string>("All");
  const [statusFilterOpen, setStatusFilterOpen] = useState(true);
  const [paymentFilterOpen, setPaymentFilterOpen] = useState(false);

  // Selection
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  // Dropdowns
  const [showOptions, setShowOptions] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  const optionsRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
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
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) setShowOptions(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false);
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
    total_revenue: summary?.total_revenue ?? String(completedSales.filter(s => s.status === "completed").reduce((a, s) => a + parseFloat(s.total_amount || "0"), 0).toFixed(2)),
    total_sales: summary?.total_sales ?? completedSales.length,
    completed_sales: summary?.completed_sales ?? completedSales.filter(s => s.status === "completed").length,
    draft_sales: summary?.draft_sales ?? drafts.length,
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
      if (sortKey === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortKey === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortKey === "total_desc") return parseFloat(b.total_amount) - parseFloat(a.total_amount);
      if (sortKey === "total_asc") return parseFloat(a.total_amount) - parseFloat(b.total_amount);
      return 0;
    });

  const displayDrafts = drafts.filter((d) => {
    const q = search.toLowerCase();
    return !q || String(d.id).includes(q) || (d.client_id || "").toLowerCase().includes(q);
  });

  // Pagination
  const currentList = activeTab === "sales" ? displaySales : displayDrafts;

  const displaySalesForPage = activeTab === "sales"
    ? displaySales.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : displayDrafts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        <div className="mb-4 bg-white rounded-4 shadow-sm py-5 text-center w-100 h-100">
          <Loader message="Loading sales…" className="py-5" />
        </div>
      ) : (
        <div className="sales-pg__table-card">
          {/* Table header — bulk selected */}
          {selectedSales.length > 0 && activeTab === "sales" && (
            <div className="sales-pg__table-header sales-pg__table-header--selected mb-3 rounded-4 px-3 py-2 d-flex align-items-center justify-content-between shadow-sm border">
              <div className="d-flex align-items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedSales.length === displaySalesForPage.length && displaySalesForPage.length > 0}
                  onChange={handleSelectAll}
                />
                <div className="sales-pg__selected-count">
                  {selectedSales.length === displaySales.length ? "All selected" : `${selectedSales.length} selected`}
                  <span className="sales-pg__dot mx-2">•</span>
                  <button
                    className="sales-pg__deselect-btn border-0 bg-transparent text-primary px-0"
                    onClick={() => setSelectedSales([])}
                  >
                    Deselect
                  </button>
                </div>
              </div>
              <div className="sales-pg__selected-actions d-flex gap-2">
                <div className="sales-pg__bulk-dropdown position-relative" ref={bulkEditRef}>
                  <Button
                    variant="outline-dark"
                    size="sm"
                    pill
                    onClick={() => setBulkEditOpen((v) => !v)}
                    iconRight={bulkEditOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  >
                    Bulk actions
                  </Button>
                  {bulkEditOpen && (
                    <div className="sales-pg__bulk-menu position-absolute end-0 mt-2 bg-white border shadow-sm rounded-3 py-1 z-3 min-w-150px">
                      <button
                        className="dropdown-item py-2 small"
                        onClick={() => {
                          setBulkEditOpen(false);
                          dispatch(exportSalesThunk({ format: "excel", date: datePreset }));
                        }}
                      >
                        Export selected
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  pill
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {activeTab === "sales" ? (
            <Table
              columns={[
                {
                  header: (
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedSales.length === displaySalesForPage.length && displaySalesForPage.length > 0}
                    />
                  ),
                  key: "checkbox",
                  width: "40px",
                  align: "center",
                  render: (item: any) => {
                    const isChecked = selectedSales.includes(String(item.id));
                    return (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }}
                        onClick={(e) => handleSelectSale(e, String(item.id))}
                      />
                    );
                  },
                },
                {
                  header: "Sale #",
                  key: "id",
                  render: (item: any) => <div className="sales-pg__sale-num">#{String(item.id).substring(0, 8)}</div>,
                },
                {
                  header: "Client",
                  key: "client",
                  render: (item: any) => (
                    <div className="sales-pg__client-cell">
                      <div className="sales-pg__avatar">
                        {item.client_id ? String(item.client_id).substring(0, 2).toUpperCase() : "WI"}
                      </div>
                      <div className="sales-pg__client-name text-nowrap">
                        {item.client_id ?? <span className="text-muted fst-italic">Walk-in</span>}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  key: "status",
                  align: "center",
                  render: (item: any) => {
                    const meta = STATUS_META[item.status] ?? { label: item.status, mod: "draft", Icon: ClockHistory };
                    const { Icon } = meta;
                    return (
                      <span className={`sales-pg__badge sales-pg__badge--${meta.mod}`}>
                        <Icon size={11} className="me-1" /> {meta.label}
                      </span>
                    );
                  },
                },
                {
                  header: "Payment",
                  key: "payment",
                  render: (item: any) => (
                    <div className="text-muted">
                      {item.payment_method ? (PAYMENT_LABEL[item.payment_method] ?? item.payment_method) : "—"}
                    </div>
                  ),
                },
                {
                  header: "Date",
                  key: "date",
                  render: (item: any) => (
                    <div className="text-muted text-nowrap">
                      {format(new Date(item.created_at || new Date()), "dd MMM yyyy")}
                    </div>
                  ),
                },
                {
                  header: "Total",
                  key: "total",
                  align: "right",
                  render: (item: any) => (
                    <div className="fw-medium text-dark">{fmtMoney(item.total_amount)}</div>
                  ),
                },
              ]}
              data={displaySalesForPage}
              onRowClick={(item: any) => openDetail(item.id)}
              emptyMessage={
                <EmptyState
                  icon={<TagFill size={28} />}
                  title={search || activeFilterCount > 0 ? "No sales found" : "No sales yet"}
                  text={search || activeFilterCount > 0 ? "Try adjusting your search or filters." : "Start processing sales to see them here."}
                  actionLabel={!search && activeFilterCount === 0 ? "Create new sale" : undefined}
                  onAction={!search && activeFilterCount === 0 ? () => setDrawerOpen(true) : undefined}
                />
              }
            />
          ) : (
            /* Drafts tab */
            <Table
              columns={[
                {
                  header: "Draft #",
                  key: "id",
                  render: (item: any) => <div className="sales-pg__sale-num">#{String(item.id).substring(0, 8)}</div>,
                },
                {
                  header: "Client",
                  key: "client",
                  render: (item: any) => (
                    <div className="sales-pg__client-cell">
                      <div className="sales-pg__avatar sales-pg__avatar--draft">
                        {item.client_id ? String(item.client_id).substring(0, 2).toUpperCase() : "WI"}
                      </div>
                      <div className="sales-pg__client-name text-nowrap">
                        {item.client_id ?? <span className="text-muted fst-italic">Walk-in</span>}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  key: "status",
                  align: "center",
                  render: () => (
                    <span className="sales-pg__badge sales-pg__badge--draft">
                      <ClockHistory size={11} className="me-1" /> Draft
                    </span>
                  ),
                },
                {
                  header: "Created",
                  key: "date",
                  render: (item: any) => (
                    <div className="text-muted text-nowrap">
                      {format(new Date(item.created_at || new Date()), "dd MMM yyyy, HH:mm")}
                    </div>
                  ),
                },
                {
                  header: "Total",
                  key: "total",
                  align: "right",
                  render: (item: any) => (
                    <div className="fw-medium text-dark">{fmtMoney(item.total_amount)}</div>
                  ),
                },
              ]}
              data={displaySalesForPage}
              onRowClick={(item: any) => openDetail(item.id)}
              emptyMessage={
                <EmptyState
                  icon={<Receipt size={28} />}
                  title="No draft sales"
                  text="Drafts are saved when you don't complete a checkout."
                  actionLabel="Create sale"
                  onAction={() => setDrawerOpen(true)}
                />
              }
            />
          )}
        </div>
      )}

      {/* ── PAGINATION ─────────────────────────────────────────────────────── */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={currentList.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(sz) => {
          setPageSize(sz);
          setCurrentPage(1);
        }}
        className="mt-4"
      />

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
              <div className="sales-pg__skeleton p-4">
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
