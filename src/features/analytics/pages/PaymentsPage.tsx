import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Search,
  Calendar3,
  Sliders,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileEarmarkText,
  CreditCard2Back,
} from "react-bootstrap-icons";

// UI Components
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Card from "../../../components/ui/Card";
import { DateRangePicker } from "react-date-range";
import type { RangeKeyDict, Range } from "react-date-range";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  isWithinInterval,
} from "date-fns";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/PaymentsPage.scss";

import type { AppDispatch, RootState } from "../../../store/store";
import { fetchSalesThunk, exportSalesThunk } from "../../../middleware/sale/sale.thunk";
import type { Sale } from "../../../types/sale.types";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", gift_card: "Gift Card",
  split: "Split", upi: "UPI",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "badge-status-completed",
  refunded:  "badge-status-refunded",
  cancelled: "badge-status-cancelled",
};

const ITEMS_PER_PAGE = 10;

export default function PaymentsPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ── Redux ─────────────────────────────────────────────────────────────────
  const allSales   = useSelector((s: RootState) => (s.sale as any).items as Sale[]);
  const isLoading  = useSelector((s: RootState) => (s.sale as any).loading?.fetchAll as boolean ?? false);
  const isExporting = useSelector((s: RootState) => (s.sale as any).loading?.export as boolean ?? false);
  const salonId    = useSelector((s: RootState) => (s.salon as any).currentSalon?.id as string | undefined);

  // ── State ─────────────────────────────────────────────────────────────────
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFilters,  setShowFilters]  = useState(false);
  const [showOptions,  setShowOptions]  = useState(false);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);

  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dateRangeDropdown, setDateRangeDropdown] = useState("Custom");

  const [tempRange, setTempRange] = useState<Range[]>([{
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    key: "selection",
  }]);
  const [appliedRange, setAppliedRange] = useState<Range[]>([{
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    key: "selection",
  }]);

  const calendarRef = useRef<HTMLDivElement>(null);
  const optionsRef  = useRef<HTMLDivElement>(null);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchSalesThunk());
  }, [dispatch]);

  // ── Close overlays on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
        setTempRange(appliedRange);
      }
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [appliedRange]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, appliedRange, methodFilter, statusFilter]);

  // ── Calendar preset logic ─────────────────────────────────────────────────
  const handleSelectDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDateRangeDropdown(val);
    const today = new Date();
    let start = today, end = today;
    switch (val) {
      case "Yesterday":  start = end = subDays(today, 1); break;
      case "This week":  start = startOfWeek(today, { weekStartsOn: 1 }); end = endOfWeek(today, { weekStartsOn: 1 }); break;
      case "Last week":  start = startOfWeek(subDays(today, 7), { weekStartsOn: 1 }); end = endOfWeek(subDays(today, 7), { weekStartsOn: 1 }); break;
      case "This month": start = startOfMonth(today); end = endOfMonth(today); break;
      case "Last month": start = startOfMonth(subMonths(today, 1)); end = endOfMonth(subMonths(today, 1)); break;
    }
    setTempRange([{ startDate: start, endDate: end, key: "selection" }]);
  };

  const handleDateChange = (item: RangeKeyDict) => {
    setTempRange([item.selection]);
    setDateRangeDropdown("Custom");
  };

  const applyDateRange = () => { setAppliedRange(tempRange); setShowCalendar(false); };
  const cancelDateRange = () => { setTempRange(appliedRange); setShowCalendar(false); };

  const getButtonLabel = () => {
    const s = appliedRange[0].startDate, e = appliedRange[0].endDate;
    if (s && e && s.getTime() === e.getTime()) return format(s, "dd MMM yyyy");
    if (s && e) return `${format(s, "dd MMM, yyyy")} - ${format(e, "dd MMM, yyyy")}`;
    return "Date range";
  };

  // ── Filter + search sales ─────────────────────────────────────────────────
  // Only show non-draft sales as payment transactions
  const filteredPayments = allSales.filter((sale) => {
    if (sale.status === "draft") return false;

    // Date range filter
    try {
      const saleDate = parseISO(sale.created_at);
      const start = appliedRange[0].startDate!;
      const end   = appliedRange[0].endDate!;
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (!isWithinInterval(saleDate, { start, end })) return false;
    } catch { return false; }

    // Search
    const q = searchTerm.toLowerCase();
    if (q && !String(sale.id).includes(q) && !(sale.client_id || "").toLowerCase().includes(q)) return false;

    // Method filter
    if (methodFilter !== "all" && sale.payment_method !== methodFilter) return false;

    // Status filter
    if (statusFilter !== "all" && sale.status !== statusFilter) return false;

    return true;
  });

  // Sort newest first
  const sorted = [...filteredPayments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated  = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Summary totals
  const totalRevenue = filteredPayments
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0);

  return (
    <div className="payments-page container-fluid">
      {/* ── HEADER ── */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1">Payment transactions</h3>
          <p className="text-muted small mb-0">
            View, filter and export the history of your payments.
          </p>
        </div>

        <div className="position-relative" ref={optionsRef}>
          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowOptions(!showOptions)}
            iconRight={
              <ChevronDown
                size={14}
                className={`ms-1 transition-all ${showOptions ? "rotate-180" : ""}`}
              />
            }
          >
            Options
          </Button>

          {showOptions && (
            <div
              className="payment-options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden"
              style={{ minWidth: "200px" }}
            >
              <div className="px-3 py-2 small fw-bold text-muted border-bottom">Export</div>
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0 d-flex align-items-center"
                disabled={isExporting}
                onClick={() => { dispatch(exportSalesThunk({ format: "csv" })); setShowOptions(false); }}
              >
                <FileEarmarkText size={16} className="text-primary me-2" />
                {isExporting ? "Exporting…" : "CSV"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="payments-stat-card">
            <div className="payments-stat-label">Total transactions</div>
            <div className="payments-stat-value">{filteredPayments.length}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="payments-stat-card">
            <div className="payments-stat-label">Total revenue</div>
            <div className="payments-stat-value">₹{totalRevenue.toFixed(2)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="payments-stat-card">
            <div className="payments-stat-label">Completed</div>
            <div className="payments-stat-value payments-stat-value--green">
              {filteredPayments.filter((s) => s.status === "completed").length}
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="payments-stat-card">
            <div className="payments-stat-label">Refunded</div>
            <div className="payments-stat-value payments-stat-value--red">
              {filteredPayments.filter((s) => s.status === "refunded").length}
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="filter-bar mb-4">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div style={{ maxWidth: "350px", flex: 1 }}>
            <Input
              placeholder="Search by Sale # or Client"
              className="mb-0"
              containerClass="mb-0"
              iconLeft={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date range picker */}
          <div className="position-relative" ref={calendarRef}>
            <Button
              variant="outline-dark"
              pill
              onClick={() => setShowCalendar(!showCalendar)}
              iconLeft={<Calendar3 size={16} />}
              iconRight={<ChevronDown size={14} />}
            >
              {getButtonLabel()}
            </Button>

            {showCalendar && (
              <div
                className="shadow-lg border position-absolute start-0 mt-2 bg-white z-2 p-3 rounded-4"
                style={{ minWidth: "360px" }}
              >
                <div className="mb-3">
                  <label className="form-label small fw-bold">Select preset</label>
                  <select
                    className="form-select rounded-3 p-2"
                    value={dateRangeDropdown}
                    onChange={handleSelectDropdown}
                    style={{ appearance: "none", backgroundImage: "none" }}
                  >
                    <option>Today</option>
                    <option>Yesterday</option>
                    <option>This week</option>
                    <option>Last week</option>
                    <option>This month</option>
                    <option>Last month</option>
                    <option>Custom</option>
                  </select>
                </div>
                <div className="overflow-auto">
                  <DateRangePicker
                    onChange={handleDateChange}
                    moveRangeOnFirstSelection={false}
                    months={1}
                    ranges={tempRange}
                    direction="vertical"
                    showMonthAndYearPickers={false}
                    showDateDisplay={false}
                    rangeColors={["#11141a"]}
                    staticRanges={[]}
                    inputRanges={[]}
                  />
                </div>
                <div className="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
                  <Button variant="ghost" pill size="sm" onClick={cancelDateRange}>Cancel</Button>
                  <Button variant="dark" pill size="sm" onClick={applyDateRange}>Apply</Button>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowFilters(true)}
            iconRight={<Sliders size={14} />}
          >
            Filters{(methodFilter !== "all" || statusFilter !== "all") ? " •" : ""}
          </Button>
        </div>
      </div>

      {/* ── TABLE or EMPTY STATE ── */}
      {isLoading ? (
        <Card
          className="text-center py-5 border-0 rounded-4 shadow-sm"
          style={{ minHeight: "300px" }}
        >
          <div className="d-flex flex-column align-items-center justify-content-center h-100">
            <div className="spinner-border text-muted" role="status" />
            <p className="text-muted small mt-3 mb-0">Loading payments…</p>
          </div>
        </Card>
      ) : paginated.length > 0 ? (
        <>
          <div className="payments-table-wrapper rounded-4 shadow-sm border bg-white overflow-hidden">
            <table className="payments-table w-100">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Date &amp; Time</th>
                  <th>Client</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((sale) => (
                  <tr key={sale.id} className="payments-table-row">
                    <td className="fw-bold text-dark small">#{sale.id}</td>
                    <td>
                      <div className="fw-bold small">{format(parseISO(sale.created_at), "dd MMM yyyy")}</div>
                      <div className="extra-small text-muted">{format(parseISO(sale.created_at), "HH:mm")}</div>
                    </td>
                    <td className="small">{sale.client_id ?? <span className="text-muted fst-italic">Walk-in</span>}</td>
                    <td>
                      {sale.payment_method ? (
                        <span className="payment-method-badge badge-method-other">
                          {PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`payment-status-badge ${STATUS_COLOR[sale.status] ?? "badge-status-completed"}`}>
                        {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-end fw-bold small">
                      ₹{parseFloat(sale.total_amount || "0").toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION ── */}
          <div className="payments-pagination d-flex align-items-center justify-content-between mt-4">
            <div className="small text-muted">
              Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)}</strong> of <strong>{sorted.length}</strong> transactions
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`pagination-num ${page === currentPage ? "active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="pagination-btn"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <Card
          className="text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-2 d-flex flex-column align-items-center justify-content-center"
          style={{ minHeight: "340px" }}
        >
          <div className="mb-4">
            <div
              className="d-flex align-items-center justify-content-center mx-auto"
              style={{ width: "60px", height: "60px", borderRadius: "15px", background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)" }}
            >
              <CreditCard2Back size={30} className="text-white" />
            </div>
          </div>
          <h4 className="fw-bold mb-2 text-dark h5">No results found</h4>
          <p className="text-muted small">
            {searchTerm || methodFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your search or filters."
              : "No payment transactions for the selected date range."}
          </p>
        </Card>
      )}

      {/* ── FILTER MODAL ── */}
      <Modal
        show={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-3 w-100">
            <Button
              variant="outline-dark"
              pill
              className="px-4"
              onClick={() => { setMethodFilter("all"); setStatusFilter("all"); setShowFilters(false); }}
            >
              Clear filters
            </Button>
            <Button variant="dark" pill className="px-4" onClick={() => setShowFilters(false)}>
              Apply
            </Button>
          </div>
        }
      >
        <div className="payment-filters-modal-content">
          <div className="mb-4">
            <label className="form-label small fw-bold">Payment method</label>
            <div className="position-relative">
              <select
                className="form-select rounded-3 p-2 pe-5"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                style={{ appearance: "none", backgroundImage: "none" }}
              >
                <option value="all">All methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="gift_card">Gift Card</option>
                <option value="split">Split</option>
              </select>
              <ChevronDown
                className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
                size={14}
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="form-label small fw-bold">Status</label>
            <div className="position-relative">
              <select
                className="form-select rounded-3 p-2 pe-5"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ appearance: "none", backgroundImage: "none" }}
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown
                className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
                size={14}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
