import { useState, useRef, useEffect, useMemo } from "react";
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
import { Button, Input, Modal, Card, Table, Pagination, Loader } from "../../../components/ui";
import { DateRange } from "react-date-range";
import type { RangeKeyDict, Range } from "react-date-range";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
} from "date-fns";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/PaymentsPage.scss";

import type { AppDispatch, RootState } from "../../../store/store";
import { fetchSalesThunk, exportSalesThunk } from "../../../middleware/sale/sale.thunk";
import { fetchClientsThunk } from "../../../middleware/client/client.thunk";
import type { Sale } from "../../../types/sale.types";

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Cash", card: "Card", gift_card: "Gift Card",
  split: "Split", upi: "UPI",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "badge-status-completed",
  refunded: "badge-status-refunded",
  cancelled: "badge-status-cancelled",
};

export default function PaymentsPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ── Redux ─────────────────────────────────────────────────────────────────
  const allSales   = useSelector((s: RootState) => (s.sale as any).items as Sale[]);
  const isLoading  = useSelector((s: RootState) => (s.sale as any).loading?.fetchAll as boolean ?? false);
  const isExporting = useSelector((s: RootState) => (s.sale as any).loading?.export as boolean ?? false);
  const allClients = useSelector((s: RootState) => (s.client as any).items as any[]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  const optionsRef = useRef<HTMLDivElement>(null);

  // id → display name lookup (handles fullName, full_name, first+last variants)
  const clientNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (allClients ?? []).forEach((c: any) => {
      if (!c.id) return;
      const name =
        c.fullName ??
        c.full_name ??
        (c.first_name || c.last_name ? `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() : null) ??
        c.name ??
        null;
      if (name) map.set(String(c.id), name);
    });
    return map;
  }, [allClients]);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchSalesThunk());
    dispatch(fetchClientsThunk());
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
  const handleSelectPreset = (val: string) => {
    setDateRangeDropdown(val);
    if (val === "Custom") return;
    const today = new Date();
    let start = today, end = today;
    switch (val) {
      case "Week": start = startOfWeek(today, { weekStartsOn: 1 }); end = endOfWeek(today, { weekStartsOn: 1 }); break;
      case "Month": start = startOfMonth(today); end = endOfMonth(today); break;
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
      const end = appliedRange[0].endDate!;
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      if (!isWithinInterval(saleDate, { start, end })) return false;
    } catch { return false; }

    // Search
    const q = searchTerm.toLowerCase();
    if (q) {
      const clientName = (sale.client_name || (sale.client_id ? clientNameMap.get(String(sale.client_id)) : null) || "").toLowerCase();
      if (!String(sale.id).includes(q) && !clientName.includes(q)) return false;
    }

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

  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
              <div className="pay-calendar-popup shadow-lg position-absolute start-0 mt-2 bg-white z-2 rounded-4">
                {/* Header */}
                <div className="pay-cal-header">
                  <span className="pay-cal-title">Date Range</span>
                  <span className="pay-cal-range-text">
                    {format(tempRange[0].startDate!, "dd MMM")} → {format(tempRange[0].endDate!, "dd MMM")}
                  </span>
                </div>

                {/* Tab presets */}
                <div className="pay-cal-tabs">
                  {(["Today", "Week", "Month", "Custom"] as const).map((p) => {
                    const isActive = ["Today", "Week", "Month"].includes(dateRangeDropdown) ? dateRangeDropdown === p : p === "Custom";
                    return (
                      <button
                        key={p}
                        className={`pay-cal-tab${isActive ? " active" : ""}`}
                        onClick={() => handleSelectPreset(p)}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar */}
                <DateRange
                  onChange={handleDateChange}
                  moveRangeOnFirstSelection={false}
                  months={1}
                  ranges={tempRange}
                  direction="horizontal"
                  showMonthAndYearPickers={false}
                  showDateDisplay={false}
                  rangeColors={["#11141a"]}
                  navigatorRenderer={(curr, changeShownDate) => (
                    <div className="pay-cal-custom-nav">
                      <button className="pay-cal-nav-btn" onClick={() => changeShownDate(-1, "monthOffset")}>
                        <ChevronLeft size={13} />
                      </button>
                      <span className="pay-cal-nav-label">{format(curr, "MMMM yyyy")}</span>
                      <button className="pay-cal-nav-btn" onClick={() => changeShownDate(1, "monthOffset")}>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                />

                {/* Footer */}
                <div className="pay-cal-footer d-flex justify-content-end gap-2 border-top">
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
          className="text-center py-5 border-0 rounded-4 shadow-sm align-items-center justify-content-center d-flex"
          style={{ minHeight: "300px" }}
        >
          <Loader message="Loading payments…" className="py-5" />
        </Card>
      ) : (
        <Card noPadding className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 p-0">
          <Table
            columns={[
              {
                header: "Sale #",
                key: "id",
                width: "100px",
                render: (sale: any) => <div className="fw-bold text-dark small">#{String(sale.id).substring(0, 8)}</div>
              },
              {
                header: "Date & Time",
                key: "date",
                width: "15%",
                render: (sale: any) => (
                  <div>
                    <div className="fw-bold small">{format(parseISO(sale.created_at || new Date().toISOString()), "dd MMM yyyy")}</div>
                    <div className="extra-small text-muted">{format(parseISO(sale.created_at || new Date().toISOString()), "HH:mm")}</div>
                  </div>
                )
              },
              {
                header: "Client",
                key: "client_id",
                render: (sale: any) => {
                  const name = sale.client_name || (sale.client_id ? clientNameMap.get(String(sale.client_id)) : null);
                  return (
                    <div className="small">
                      {name ?? <span className="text-muted fst-italic">Walk-in</span>}
                    </div>
                  );
                }
              },
              {
                header: "Method",
                key: "payment_method",
                render: (sale: any) => sale.payment_method ? (
                  <span className="payment-method-badge badge-method-other">
                    {PAYMENT_LABEL[sale.payment_method] ?? sale.payment_method}
                  </span>
                ) : "—"
              },
              {
                header: "Status",
                key: "status",
                render: (sale: any) => (
                  <span className={`payment-status-badge ${STATUS_COLOR[sale.status] ?? "badge-status-completed"}`}>
                    {sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : "Unknown"}
                  </span>
                )
              },
              {
                header: "Amount",
                key: "total_amount",
                align: "right",
                width: "120px",
                render: (sale: any) => (
                  <div className="fw-bold small">
                    ₹{parseFloat(sale.total_amount || "0").toFixed(2)}
                  </div>
                )
              }
            ]}
            data={paginated}
            emptyMessage={
              <div className="d-flex flex-column align-items-center justify-content-center py-5">
                <div
                  className="d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: "60px", height: "60px", borderRadius: "15px", background: "linear-gradient(135deg, #a855f7 0%, #d946ef 100%)" }}
                >
                  <CreditCard2Back size={30} className="text-white" />
                </div>
                <h5 className="fw-bold mb-1 text-dark">No results found</h5>
                <p className="text-muted small mb-0">
                  {searchTerm || methodFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "No payment transactions for the selected date range."}
                </p>
              </div>
            }
          />
        </Card>
      )}

      {/* ── PAGINATION ── */}
      {sorted.length > 0 && !isLoading && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={sorted.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
          className="mt-4 mb-4"
        />
      )}

      {/* ── FILTER MODAL ── */}
      <Modal
        show={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        size="md"
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
                <option value="all">All Methods</option>
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
                <option value="all">All Status</option>
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
