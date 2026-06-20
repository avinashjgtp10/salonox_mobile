import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Calendar3,
  Search,
  Sliders,
  ChevronDown,
  SortDown,
  FiletypePdf,
  FiletypeCsv,
  FiletypeXlsx,
  X,
  ChevronLeft,
  ChevronRight,
  PencilFill,
  XCircleFill,
  PersonFill,
  ClockFill,
  CurrencyRupee,
  CheckCircleFill,
} from "react-bootstrap-icons";

import {
  Button,
  Input,
  Modal,
  Table,
  Card,
  Loader,
  Pagination,
} from "../../../components/ui";
import { DateRange } from "react-date-range";
import { format, parseISO, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/AppointmentsPage.scss";

import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  fetchBookingsThunk,
  exportBookingsThunk,
  cancelBookingThunk,
  fetchBookingByIdThunk,
} from "../../../middleware/booking/booking.thunk";
import { clearSelectedBooking } from "../../../store/bookingSlice";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { fetchClientsThunk } from "../../../middleware/client/client.thunk";
import { selectAllClients } from "../../../store/selectors/slices.selectors";
import type { Booking } from "../../../types/booking.types";

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  booked: "#3b82f6",
  confirmed: "#10b981",
  in_progress: "#f59e0b",
  completed: "#6366f1",
  cancelled: "#ef4444",
  no_show: "#6b7280",
  pending: "#f59e0b",
};

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
  pending: "Pending",
};

const PAYMENT_LABEL: Record<string, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  partial: "Partial",
  refunded: "Refunded",
};

const PAYMENT_COLOR: Record<string, string> = {
  paid: "#10b981",
  unpaid: "#ef4444",
  partial: "#f59e0b",
  refunded: "#6366f1",
};

const fmtMoney = (v: string | number) =>
  "₹" + parseFloat(String(v || "0")).toFixed(2);

function fmtDuration(mins: number) {
  if (!mins || mins <= 0) return "—";
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins}min`;
}

export default function AppointmentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  // ── Redux: real data from backend ──────────────────────────────────────────
  const allBookings = useSelector((state: RootState) => (state.booking as any).items as Booking[]);
  const serverPagination = useSelector((state: RootState) => (state.booking as any).pagination as any);
  const selectedBooking = useSelector((state: RootState) => (state.booking as any).selectedItem as any);
  const isLoadingDetail = useSelector((state: RootState) => (state.booking as any).loading?.fetchById as boolean ?? false);
  const staffList = useSelector((state: RootState) => (state.staff as any).items as any[]);
  const clientList = useSelector(selectAllClients);
  const isLoading = useSelector((state: RootState) => (state.booking as any).loading?.fetchAll as boolean ?? false);


  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("All time");
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerApptId, setDrawerApptId] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Filters Modal State
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    staffId: "all",
    status: "all",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    staffId: "all",
    status: "all",
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting State
  const [sortConfig, setSortConfig] = useState("scheduled_newest");
  const [showSort, setShowSort] = useState(false);

  const [range, setRange] = useState([
    {
      startDate: new Date("2000-01-01"),
      endDate: new Date("2099-12-31"),
      key: "selection",
    },
  ]);
  const [allTime, setAllTime] = useState(true);

  // ── Core fetch function ────────────────────────────────────────────────────
  const fetchPage = useCallback((
    page: number,
    size: number,
    filters: { staffId: string; status: string },
    isAllTime: boolean,
    dateRange: typeof range,
    search?: string,
  ) => {
    dispatch(fetchBookingsThunk({
      page,
      limit: size,
      staffId: filters.staffId !== "all" ? filters.staffId : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      allTime: isAllTime,
      startDate: !isAllTime ? format(dateRange[0].startDate, "yyyy-MM-dd") : undefined,
      endDate: !isAllTime ? format(dateRange[0].endDate, "yyyy-MM-dd") : undefined,
      search: search && search.replace(/^#/, "").trim() ? search : undefined,
    }));
  }, [dispatch]);

  // Mount-only: initial data load + staff + clients
  useEffect(() => {
    fetchPage(1, pageSize, appliedFilters, allTime, range);
    dispatch(fetchStaffThunk());
    dispatch(fetchClientsThunk());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced API search when searchTerm changes
  useEffect(() => {
    const q = searchTerm.replace(/^#/, "").trim();
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPage(1, pageSize, appliedFilters, allTime, range, q ? searchTerm : undefined);
    }, 350);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchPage(page, pageSize, appliedFilters, allTime, range, searchTerm || undefined);
  };

  const handlePageSizeChange = (size: number) => {
    setCurrentPage(1);
    setPageSize(size);
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchPage(1, size, appliedFilters, allTime, range, searchTerm || undefined);
  };


  const handleTabPreset = (label: string) => {
    setSelectedLabel(label);
    if (label === "Custom") return;
    const t = new Date();
    let newRange: typeof range;
    switch (label) {
      case "Today":
        newRange = [{ startDate: t, endDate: t, key: "selection" }]; break;
      case "Week":
        newRange = [{ startDate: startOfWeek(t, { weekStartsOn: 1 }), endDate: endOfWeek(t, { weekStartsOn: 1 }), key: "selection" }]; break;
      case "Month":
        newRange = [{ startDate: startOfMonth(t), endDate: endOfMonth(t), key: "selection" }]; break;
      default: return;
    }
    setAllTime(false);
    setRange(newRange);
  };

  const handleApplyRange = () => {
    const formatted = `${format(range[0].startDate, "dd MMM yyyy")} – ${format(range[0].endDate, "dd MMM yyyy")}`;
    setSelectedLabel(formatted);
    setAllTime(false);
    setShowPicker(false);
    setCurrentPage(1);
    fetchPage(1, pageSize, appliedFilters, false, range);
  };

  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    setShowFiltersModal(false);
    setCurrentPage(1);
    fetchPage(1, pageSize, tempFilters, allTime, range);
  };

  const clearFilters = () => {
    const cleared = { staffId: "all", status: "all" };
    setTempFilters(cleared);
    setAppliedFilters(cleared);
    setShowFiltersModal(false);
    setCurrentPage(1);
    fetchPage(1, pageSize, cleared, allTime, range);
  };

  const handleExport = async (type: string) => {
    setShowExport(false);
    const fmt = type === "xlsx" ? "excel" : type === "pdf" ? "pdf" : "csv";
    setExportingFormat(fmt);
    await dispatch(
      exportBookingsThunk({
        format: fmt as "excel" | "csv" | "pdf",
        filters: {
          status: appliedFilters.status !== "all" ? appliedFilters.status : undefined,
          start_date: !allTime ? format(range[0].startDate, "yyyy-MM-dd") : undefined,
          end_date: !allTime ? format(range[0].endDate, "yyyy-MM-dd") : undefined,
        },
      })
    );
    setExportingFormat(null);
  };

  // ── Drawer handlers ────────────────────────────────────────────────────────
  const openDrawer = useCallback((id: string) => {
    setDrawerApptId(id);
    setDrawerOpen(true);
    dispatch(fetchBookingByIdThunk(id));
  }, [dispatch]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerApptId(null);
    dispatch(clearSelectedBooking());
  }, [dispatch]);

  const handleEditAppointment = () => {
    if (!drawerApptId) return;
    closeDrawer();
    navigate("/dashboard/calendar", { state: { openAppointmentId: drawerApptId } });
  };

  const handleCancelAppointment = async () => {
    if (!drawerApptId) return;
    setCancelLoading(true);
    try {
      await (dispatch(cancelBookingThunk(drawerApptId)) as any);
      setCancelConfirmOpen(false);
      closeDrawer();
      fetchPage(currentPage, pageSize, appliedFilters, allTime, range);
      setToast({ msg: "Appointment cancelled successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to cancel appointment", type: "error" });
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Lookups ────────────────────────────────────────────────────────────────
  const staffById = useMemo<Record<string, any>>(
    () => Object.fromEntries(
      (Array.isArray(staffList) ? staffList : []).map((s: any) => [s.id, s])
    ),
    [staffList],
  );

  const clientById = useMemo<Record<string, any>>(
    () => Object.fromEntries(
      (Array.isArray(clientList) ? clientList : []).map((c: any) => [c.id, c])
    ),
    [clientList],
  );

  // Map backend Appointment records to table-friendly shape
  const bookings = useMemo(() =>
    (Array.isArray(allBookings) ? allBookings : []).map((b: any) => ({
      ...b,
      id: b.id,
      clientName: b.client_name
        || (b.client_id ? (clientById[b.client_id]?.fullName || clientById[b.client_id]?.full_name || `${clientById[b.client_id]?.first_name ?? ""} ${clientById[b.client_id]?.last_name ?? ""}`.trim()) : null)
        || (b.client?.first_name ? `${b.client.first_name} ${b.client.last_name || ""}`.trim() : null)
        || (!b.client_id ? "Walk-in" : ""),
      services: b.services?.length
        ? b.services.map((s: any) => ({
            ...s,
            service: s.service || s.name || b.title || "Service",
          }))
        : [{ staffId: b.staff_id ?? b.staffId ?? "", service: b.title || "Service" }],
      status: b.status || "pending",
      date: b.date || "",
      startTime: b.startTime || "00:00",
      endTime: b.endTime || "00:00",
      billDate: b.created_at || b.createdDate || "",
      createdById: b.created_by ?? "",
      grandTotal: b.grandTotal || b.total_amount || b.price || 0,
    })),
    [allBookings, clientById]
  );

  // Client-side search filter
  const filteredAppointments = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    // strip leading # so users can type "#6EDA3359" or just "6EDA3359"
    const raw  = searchTerm.trim();
    const term = (raw.startsWith("#") ? raw.slice(1) : raw).toLowerCase();
    return bookings.filter((b) => {
      const shortRef = String(b.id).substring(0, 8).toLowerCase();
      return (
        shortRef.includes(term) ||
        String(b.id).toLowerCase().includes(term) ||
        (b.clientName || "").toLowerCase().includes(term) ||
        (b.services || []).some((s: any) =>
          (s.service || s.name || "").toLowerCase().includes(term)
        )
      );
    });
  }, [bookings, searchTerm]);

  // Client-side sort
  const sortedAppointments = useMemo(() => {
    const result = [...filteredAppointments];
    result.sort((a, b) => {
      const getDuration = (bk: any) => {
        try {
          const s = parseISO(bk.date + "T" + bk.startTime);
          const e = parseISO(bk.date + "T" + bk.endTime);
          return e.getTime() - s.getTime();
        } catch { return 0; }
      };
      switch (sortConfig) {
        case "created_oldest":
          return new Date(a.billDate || a.date).getTime() - new Date(b.billDate || b.date).getTime();
        case "created_newest":
          return new Date(b.billDate || b.date).getTime() - new Date(a.billDate || a.date).getTime();
        case "scheduled_oldest":
          try { return parseISO(a.date + "T" + a.startTime).getTime() - parseISO(b.date + "T" + b.startTime).getTime(); }
          catch { return 0; }
        case "scheduled_newest":
          try { return parseISO(b.date + "T" + b.startTime).getTime() - parseISO(a.date + "T" + a.startTime).getTime(); }
          catch { return 0; }
        case "duration_shortest": return getDuration(a) - getDuration(b);
        case "duration_longest": return getDuration(b) - getDuration(a);
        default: return 0;
      }
    });
    return result;
  }, [filteredAppointments, sortConfig]);

  const totalRecords = serverPagination?.total ?? sortedAppointments.length;

  const displayedAppointments = useMemo(() => {
    if (serverPagination) return sortedAppointments;
    const start = (currentPage - 1) * pageSize;
    return sortedAppointments.slice(start, start + pageSize);
  }, [sortedAppointments, serverPagination, currentPage, pageSize]);

  const sortOptions = [
    { label: "Created Date (oldest first)", value: "created_oldest" },
    { label: "Created Date (newest first)", value: "created_newest" },
    { label: "Scheduled Date (oldest first)", value: "scheduled_oldest" },
    { label: "Scheduled Date (newest first)", value: "scheduled_newest" },
    { label: "Duration (shortest first)", value: "duration_shortest" },
    { label: "Duration (longest first)", value: "duration_longest" },
  ];

  const currentSortLabel = sortOptions.find((o) => o.value === sortConfig)?.label;

  // ── Resolve drawer appointment data ───────────────────────────────────────
  const drawerAppt = selectedBooking;
  const drawerClient = drawerAppt?.client_id ? clientById[drawerAppt.client_id] : null;

  const drawerClientName = drawerAppt?.client_name
    || drawerAppt?.clientName
    || (drawerClient ? (drawerClient.fullName || drawerClient.full_name || `${drawerClient.first_name || ""} ${drawerClient.last_name || ""}`.trim()) : null)
    || (drawerAppt?.client?.first_name ? `${drawerAppt.client.first_name} ${drawerAppt.client.last_name || ""}`.trim() : null)
    || (!drawerAppt?.client_id ? "Walk-in" : "Client");

  const drawerClientPhone = drawerAppt?.client?.phone
    || drawerAppt?.client?.mobile
    || drawerAppt?.client?.phone_number
    || drawerClient?.phone
    || drawerClient?.mobile
    || drawerClient?.phone_number
    || null;

  const drawerClientEmail = drawerAppt?.client?.email
    || drawerClient?.email
    || null;

  const drawerClientGender = drawerAppt?.client?.gender
    || drawerClient?.gender
    || null;

  const drawerClientNotes = drawerAppt?.client?.notes
    || drawerClient?.notes
    || null;

  const drawerStaffId = drawerAppt?.staffId || drawerAppt?.staff_id
    || drawerAppt?.services?.[0]?.staffId || drawerAppt?.services?.[0]?.staff_id;
  const drawerStaff = drawerStaffId ? staffById[drawerStaffId] : null;
  const drawerStaffName = drawerAppt?.staff_name
    || (drawerStaff ? `${drawerStaff.first_name || ""} ${drawerStaff.last_name || ""}`.trim() : null)
    || null;

  let drawerDurationMins = 0;
  try {
    if (drawerAppt?.date && drawerAppt?.startTime && drawerAppt?.endTime) {
      drawerDurationMins = differenceInMinutes(
        parseISO(drawerAppt.date + "T" + drawerAppt.endTime),
        parseISO(drawerAppt.date + "T" + drawerAppt.startTime),
      );
    } else if (drawerAppt?.duration_minutes) {
      drawerDurationMins = drawerAppt.duration_minutes;
    }
  } catch { /* ignore */ }

  const drawerStatus = (drawerAppt?.status || "").toLowerCase();
  const isCancellable = !["cancelled", "completed", "no_show"].includes(drawerStatus);

  return (
    <div className="appointments-page">

      {/* ── TOAST ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`appt-toast appt-toast--${toast.type}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="appointments-header d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="h3 fw-bold mb-1">Appointments</h2>
          <p className="text-muted small mb-0">
            View, filter and export appointments booked by your clients.
          </p>
        </div>

        <div className="position-relative" ref={exportRef}>
          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowExport(!showExport)}
            iconRight={
              <ChevronDown
                size={14}
                className={`ms-1 transition-all ${showExport ? "rotate-180" : ""}`}
              />
            }
          >
            Export
          </Button>

          {showExport && (
            <div
              className="custom-dropdown shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden"
              style={{ minWidth: "150px" }}
            >
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0 border-bottom"
                onClick={() => handleExport("pdf")}
              >
                <FiletypePdf size={18} className="text-danger me-2" /> PDF
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0 border-bottom"
                disabled={exportingFormat !== null}
                onClick={() => handleExport("csv")}
              >
                <FiletypeCsv size={18} className="text-primary me-2" />
                {exportingFormat === "csv" ? "Exporting…" : "CSV"}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0"
                disabled={exportingFormat !== null}
                onClick={() => handleExport("xlsx")}
              >
                <FiletypeXlsx size={18} className="text-success me-2" />
                {exportingFormat === "excel" ? "Exporting…" : "Excel"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="appointments-toolbar mb-4 d-flex gap-2 align-items-center flex-wrap">
        <div style={{ maxWidth: "300px", flex: 1 }}>
          <Input
            placeholder="Search ref # or client name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-0"
            containerClass="mb-0"
            iconLeft={<Search size={16} />}
          />
        </div>

        <div className="position-relative">
          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowPicker(!showPicker)}
            iconLeft={<Calendar3 size={16} />}
            iconRight={
              <ChevronDown
                size={14}
                className={`transition-all ${showPicker ? "rotate-180" : ""}`}
              />
            }
          >
            {selectedLabel}
          </Button>

          {showPicker && (
            <div className="salonox-calendar-popup shadow-lg position-absolute start-0 mt-2 bg-white z-2 rounded-4">
              {/* Header */}
              <div className="cal-popup-header">
                <span className="cal-popup-title">Date Range</span>
                <span className="cal-popup-range-text">
                  {allTime ? "All time" : `${format(range[0].startDate.getFullYear() < 2020 ? new Date() : range[0].startDate, "dd MMM")} → ${format(range[0].endDate.getFullYear() > 2050 ? new Date() : range[0].endDate, "dd MMM")}`}
                </span>
              </div>

              {/* Tab presets */}
              <div className="cal-popup-tabs">
                {(["Today", "Week", "Month", "Custom"] as const).map((p) => {
                  const isActive = ["Today", "Week", "Month"].includes(selectedLabel) ? selectedLabel === p : p === "Custom";
                  return (
                    <button
                      key={p}
                      className={`cal-popup-tab${isActive ? " active" : ""}`}
                      onClick={() => handleTabPreset(p)}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Calendar */}
              <DateRange
                ranges={range}
                onChange={(item: any) => {
                  setSelectedLabel("Custom");
                  setAllTime(false);
                  setRange([item.selection]);
                }}
                months={1}
                direction="horizontal"
                rangeColors={["#111827"]}
                showDateDisplay={false}
                showMonthAndYearPickers={false}
                shownDate={range[0].startDate.getFullYear() < 2020 ? new Date() : range[0].startDate}
                navigatorRenderer={(curr, changeShownDate) => (
                  <div className="cal-custom-nav">
                    <button className="cal-nav-btn" onClick={() => changeShownDate(-1, "monthOffset")}>
                      <ChevronLeft size={13} />
                    </button>
                    <span className="cal-nav-label">{format(curr, "MMMM yyyy")}</span>
                    <button className="cal-nav-btn" onClick={() => changeShownDate(1, "monthOffset")}>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              />

              {/* Footer */}
              <div className="cal-popup-footer d-flex justify-content-end gap-2 border-top">
                <Button variant="ghost" pill size="sm" onClick={() => setShowPicker(false)}>Cancel</Button>
                <Button variant="dark" pill size="sm" onClick={handleApplyRange}>Apply</Button>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="outline-dark"
          pill
          onClick={() => setShowFiltersModal(true)}
          iconLeft={<Sliders size={16} />}
        >
          Filters{" "}
          {(appliedFilters.staffId !== "all" ||
            appliedFilters.status !== "all") &&
            "•"}
        </Button>

        {/* Sorting Dropdown */}
        <div className="sort-container position-relative ms-auto">
          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowSort(!showSort)}
            iconRight={<SortDown size={18} />}
          >
            {currentSortLabel}
          </Button>

          {showSort && (
            <div
              className="custom-dropdown shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden"
              style={{ width: "220px" }}
            >
              {sortOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant="ghost"
                  fullWidth
                  className={`text-start p-2 rounded-0 border-bottom small ${sortConfig === opt.value ? "bg-light font-bold" : ""}`}
                  onClick={() => {
                    setSortConfig(opt.value);
                    setShowSort(false);
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= FILTERS MODAL ================= */}
      <Modal
        show={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        title="Filters"
        size="md"
        footer={
          <div className="d-flex justify-content-end gap-3 w-100">
            <Button variant="outline-dark" pill className="px-4" onClick={clearFilters}>
              Clear filters
            </Button>
            <Button variant="dark" pill className="px-4" onClick={applyFilters}>
              Apply
            </Button>
          </div>
        }
      >
        <div className="filter-modal-content">
          <div className="mb-4">
            <label className="form-label small fw-bold">Team member</label>
            <div className="position-relative">
              <select
                className="form-select rounded-3 p-2 pe-5"
                value={tempFilters.staffId}
                onChange={(e) => setTempFilters({ ...tempFilters, staffId: e.target.value })}
                style={{ appearance: "none", backgroundImage: "none" }}
              >
                <option value="all">All team members</option>
                {staffList.map((staff: any) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none" size={14} />
            </div>
          </div>

          <div className="mb-2">
            <label className="form-label small fw-bold">Status</label>
            <div className="position-relative">
              <select
                className="form-select rounded-3 p-2 pe-5"
                value={tempFilters.status}
                onChange={(e) => setTempFilters({ ...tempFilters, status: e.target.value })}
                style={{ appearance: "none", backgroundImage: "none" }}
              >
                <option value="all">All Status</option>
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-show</option>
              </select>
              <ChevronDown className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none" size={14} />
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= TABLE ================= */}
      <div className="position-relative mb-4">
        {isLoading ? (
          <Card noPadding>
            <Loader message="Loading appointments…" className="py-5" />
          </Card>
        ) : (
          <Card noPadding className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Table
              columns={[
                {
                  header: "Ref #",
                  key: "id",
                  width: "100px",
                  render: (item: any) => {
                    const ref = `#${String(item.id).substring(0, 8).toUpperCase()}`;

                    return (
                      <span
                        className="d-block fw-bold"
                        title={ref}
                        style={{
                          color: "#a445ed",
                          fontSize: "13px",
                          fontFamily: "monospace",
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ref}
                      </span>
                    );
                  },
                },
                {
                  header: "Client",
                  key: "clientName",
                  width: "180px",
                  render: (item: any) => (
                    <span
                      className="d-block fw-bold text-dark"
                      title={item.clientName || "—"}
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.clientName || "—"}
                    </span>
                  ),
                },
                {
                  header: "Status",
                  key: "status",
                  align: "center",
                  width: "130px",
                  render: (item: any) => {
                    const s = (item.status || "booked").toLowerCase();
                    return (
                      <span
                        className="d-block"
                        title={STATUS_LABEL[s] || s.replace(/_/g, " ")}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <span style={{
                          display: "inline-block",
                          maxWidth: "100%",
                          padding: "4px 12px",
                          borderRadius: "100px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#fff",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          background: STATUS_COLOR[s] || "#6b7280",
                        }}>
                          {STATUS_LABEL[s] || s.replace(/_/g, " ")}
                        </span>
                      </span>
                    );
                  },
                },
                {
                  header: "Service",
                  key: "services",
                  width: "200px",
                  render: (item: any) => {
                    const serviceNames = item.services.map((s: any) => s.service).join(", ");

                    return (
                      <span
                        className="text-dark d-block"
                        title={serviceNames}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {serviceNames}
                      </span>
                    );
                  },
                },
                {
                  header: "Scheduled Date",
                  key: "date",
                  align: "center",
                  width: "160px",
                  render: (item: any) => {
                    try {
                      const scheduledAt = parseISO(item.date + "T" + item.startTime);
                      const formattedDate = format(scheduledAt, "dd MMM yyyy");
                      const formattedTime = format(scheduledAt, "h:mma").toLowerCase();

                      return (
                        <div
                          className="d-flex flex-column align-items-center"
                          title={`${formattedDate}, ${formattedTime}`}
                          style={{
                            overflow: "hidden",
                          }}
                        >
                          <span
                            className="text-dark d-block"
                            style={{
                              maxWidth: "100%",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontWeight: 600,
                            }}
                          >
                            {formattedDate}
                          </span>
                          <span
                            className="text-muted d-block"
                            style={{
                              maxWidth: "100%",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontSize: "12px",
                              lineHeight: 1.2,
                            }}
                          >
                            {formattedTime}
                          </span>
                        </div>
                      );
                    } catch {
                      return <span className="text-muted">—</span>;
                    }
                  },
                },
                {
                  header: "Duration",
                  key: "duration",
                  align: "center",
                  width: "110px",
                  render: (item: any) => {
                    try {
                      const start = parseISO(item.date + "T" + item.startTime);
                      const end = parseISO(item.date + "T" + item.endTime);
                      const durMins = Math.floor((end.getTime() - start.getTime()) / 60000);
                      if (isNaN(durMins) || durMins <= 0) return <span className="text-muted">—</span>;
                      const duration = fmtDuration(durMins);
                      return (
                        <span
                          className="text-muted d-block"
                          title={duration}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {duration}
                        </span>
                      );
                    } catch {
                      return <span className="text-muted">—</span>;
                    }
                  },
                },
                {
                  header: "Team member",
                  key: "staff",
                  width: "170px",
                  render: (item: any) => {
                    const staffId =
                      item.services?.find((s: any) => s.staffId)?.staffId ||
                      item.staffId ||
                      item.staff_id;
                    const staff = staffId ? staffById[staffId] : null;
                    const name = staff ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() : null;
                    return (
                      <span
                        className="text-muted d-block"
                        title={name || "—"}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {name || "—"}
                      </span>
                    );
                  },
                },
                {
                  header: "Price",
                  key: "grandTotal",
                  align: "right",
                  width: "100px",
                  render: (item: any) => {
                    const price = `₹${Number(item.grandTotal || 0).toFixed(2)}`;

                    return (
                      <span
                        className="text-dark fw-medium d-block"
                        title={price}
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {price}
                      </span>
                    );
                  },
                },
              ]}
              data={displayedAppointments}
              onRowClick={(item: any) => openDrawer(String(item.id))}
              emptyMessage={
                <div className="d-flex flex-column align-items-center justify-content-center py-5">
                  <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: "64px", height: "64px" }}>
                    <Calendar3 size={24} className="text-muted" />
                  </div>
                  <h5 className="fw-bold mb-1 text-dark">No bookings found</h5>
                  <p className="text-muted small mb-0">Try changing filters or date range</p>
                </div>
              }
            />
          </Card>
        )}
      </div>

      {/* ================= PAGINATION ================= */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalRecords}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        className="mt-4 mb-4"
      />

      {/* ================= APPOINTMENT DETAIL DRAWER ================= */}
      {drawerOpen && (
        <div className="appt-drawer-overlay" onClick={closeDrawer}>
          <div className="appt-drawer" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="appt-drawer__header">
              <button className="appt-drawer__back" onClick={closeDrawer}>
                <ChevronLeft size={16} />
              </button>
              <h3 className="appt-drawer__title">
                {isLoadingDetail
                  ? "Loading…"
                  : drawerAppt
                  ? `Appt #${String(drawerAppt.id).substring(0, 8).toUpperCase()}`
                  : "Appointment Details"}
              </h3>
              <button className="appt-drawer__close" onClick={closeDrawer}>
                <X size={17} />
              </button>
            </div>

            {/* Body */}
            <div className="appt-drawer__body">
              {isLoadingDetail ? (
                <div className="appt-drawer__skeleton">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="appt-drawer__skeleton-row" />
                  ))}
                </div>
              ) : !drawerAppt ? (
                <p className="appt-drawer__error">Failed to load appointment details.</p>
              ) : (
                <>
                  {/* Status + date row */}
                  <div className="appt-drawer__meta-row">
                    <span
                      className="appt-drawer__status-badge"
                      style={{ background: STATUS_COLOR[drawerStatus] || "#6b7280" }}
                    >
                      {STATUS_LABEL[drawerStatus] || drawerStatus}
                    </span>
                    <span className="appt-drawer__date-label">
                      {drawerAppt.created_at
                        ? format(new Date(drawerAppt.created_at), "dd MMM yyyy, HH:mm")
                        : "—"}
                    </span>
                  </div>

                  {/* ── CLIENT INFORMATION ───────────────────────────────── */}
                  <div className="appt-drawer__section">
                    <div className="appt-drawer__section-header">
                      <PersonFill size={13} />
                      <span>Client Information</span>
                    </div>
                    <div className="appt-drawer__client-card">
                      <div className="appt-drawer__avatar">
                        {drawerClientName === "Walk-in"
                          ? "WI"
                          : drawerClientName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "CL"}
                      </div>
                      <div className="appt-drawer__client-info">
                        <div className="appt-drawer__client-name">{drawerClientName}</div>
                        {drawerClientPhone && (
                          <div className="appt-drawer__client-detail">{drawerClientPhone}</div>
                        )}
                        {drawerClientEmail && (
                          <div className="appt-drawer__client-detail">{drawerClientEmail}</div>
                        )}
                        {drawerClientGender && (
                          <div className="appt-drawer__client-detail" style={{ textTransform: "capitalize" }}>{drawerClientGender}</div>
                        )}
                      </div>
                    </div>
                    {drawerClientNotes && (
                      <div className="appt-drawer__note-box">
                        <span className="appt-drawer__note-label">Client note</span>
                        <p className="appt-drawer__note-text">{drawerClientNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* ── APPOINTMENT INFORMATION ──────────────────────────── */}
                  <div className="appt-drawer__section">
                    <div className="appt-drawer__section-header">
                      <ClockFill size={13} />
                      <span>Appointment Information</span>
                    </div>
                    <div className="appt-drawer__info-grid">
                      <InfoRow label="Reference" value={`#${String(drawerAppt.id).substring(0, 8).toUpperCase()}`} />
                      <InfoRow label="Status" value={STATUS_LABEL[drawerStatus] || drawerStatus} />
                      <InfoRow
                        label="Date"
                        value={drawerAppt.date
                          ? format(new Date(drawerAppt.date), "dd MMM yyyy")
                          : "—"}
                      />
                      <InfoRow
                        label="Start time"
                        value={drawerAppt.startTime
                          ? format(parseISO(`2000-01-01T${drawerAppt.startTime}`), "h:mm a")
                          : "—"}
                      />
                      <InfoRow
                        label="End time"
                        value={drawerAppt.endTime
                          ? format(parseISO(`2000-01-01T${drawerAppt.endTime}`), "h:mm a")
                          : "—"}
                      />
                      <InfoRow label="Duration" value={fmtDuration(drawerDurationMins)} />
                      <InfoRow
                        label="Created"
                        value={drawerAppt.created_at
                          ? format(new Date(drawerAppt.created_at), "dd MMM yyyy, HH:mm")
                          : "—"}
                      />
                    </div>
                    {drawerAppt.notes && (
                      <div className="appt-drawer__note-box mt-2">
                        <span className="appt-drawer__note-label">Appointment notes</span>
                        <p className="appt-drawer__note-text">{drawerAppt.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* ── SERVICE INFORMATION ──────────────────────────────── */}
                  {drawerAppt.services?.length > 0 && (
                    <div className="appt-drawer__section">
                      <div className="appt-drawer__section-header">
                        <CheckCircleFill size={13} />
                        <span>Service Information</span>
                      </div>
                      <div className="appt-drawer__services">
                        {drawerAppt.services.map((svc: any, idx: number) => {
                          const svcStaffId = svc.staffId || svc.staff_id;
                          const svcStaff = svcStaffId ? staffById[svcStaffId] : null;
                          const svcStaffName = svcStaff
                            ? `${svcStaff.first_name || ""} ${svcStaff.last_name || ""}`.trim()
                            : null;
                          return (
                            <div key={idx} className="appt-drawer__service-row">
                              <div className="appt-drawer__service-main">
                                <span className="appt-drawer__service-name">
                                  {svc.name || svc.service || svc.service_name || "Service"}
                                </span>
                                {svcStaffName && (
                                  <span className="appt-drawer__service-staff">
                                    with {svcStaffName}
                                  </span>
                                )}
                              </div>
                              <div className="appt-drawer__service-right">
                                {svc.price > 0 && (
                                  <span className="appt-drawer__service-price">{fmtMoney(svc.price)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── TEAM MEMBER INFORMATION ──────────────────────────── */}
                  {drawerStaffName && (
                    <div className="appt-drawer__section">
                      <div className="appt-drawer__section-header">
                        <PersonFill size={13} />
                        <span>Team Member</span>
                      </div>
                      <div className="appt-drawer__client-card">
                        <div className="appt-drawer__avatar appt-drawer__avatar--staff">
                          {drawerStaffName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "ST"}
                        </div>
                        <div className="appt-drawer__client-info">
                          <div className="appt-drawer__client-name">{drawerStaffName}</div>
                          {drawerStaff?.role && (
                            <div className="appt-drawer__client-detail" style={{ textTransform: "capitalize" }}>
                              {drawerStaff.role}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PAYMENT INFORMATION ──────────────────────────────── */}
                  <div className="appt-drawer__section">
                    <div className="appt-drawer__section-header">
                      <CurrencyRupee size={13} />
                      <span>Payment Information</span>
                    </div>
                    <div className="appt-drawer__totals">
                      {(drawerAppt.grandTotal > 0 || drawerAppt.subtotal > 0) && (
                        <div className="appt-drawer__total-row">
                          <span>Subtotal</span>
                          <span>{fmtMoney(drawerAppt.subtotal || drawerAppt.grandTotal || 0)}</span>
                        </div>
                      )}
                      {parseFloat(String(drawerAppt.discount_amount || drawerAppt.discountAmount || 0)) > 0 && (
                        <div className="appt-drawer__total-row appt-drawer__total-row--discount">
                          <span>Discount</span>
                          <span>−{fmtMoney(drawerAppt.discount_amount || drawerAppt.discountAmount)}</span>
                        </div>
                      )}
                      {parseFloat(String(drawerAppt.tax_amount || drawerAppt.taxAmount || 0)) > 0 && (
                        <div className="appt-drawer__total-row">
                          <span>Tax</span>
                          <span>{fmtMoney(drawerAppt.tax_amount || drawerAppt.taxAmount)}</span>
                        </div>
                      )}
                      <div className="appt-drawer__total-row appt-drawer__total-row--grand">
                        <span>Total</span>
                        <span>{fmtMoney(drawerAppt.grandTotal || drawerAppt.total_amount || 0)}</span>
                      </div>
                      <div className="appt-drawer__total-row mt-2">
                        <span>Payment status</span>
                        <span
                          className="appt-drawer__payment-badge"
                          style={{
                            color: PAYMENT_COLOR[(drawerAppt.payment_status || drawerAppt.paymentStatus || "unpaid").toLowerCase()] || "#6b7280",
                          }}
                        >
                          {PAYMENT_LABEL[(drawerAppt.payment_status || drawerAppt.paymentStatus || "unpaid").toLowerCase()]
                            || drawerAppt.payment_status
                            || "Unpaid"}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            {!isLoadingDetail && drawerAppt && (
              <div className="appt-drawer__footer">
                {isCancellable && (
                  <button
                    className="appt-drawer__btn appt-drawer__btn--cancel"
                    onClick={() => setCancelConfirmOpen(true)}
                  >
                    <XCircleFill size={14} />
                    Cancel Appointment
                  </button>
                )}
                <button
                  className="appt-drawer__btn appt-drawer__btn--edit"
                  onClick={handleEditAppointment}
                >
                  <PencilFill size={13} />
                  Edit Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= CANCEL CONFIRM MODAL ================= */}
      <Modal
        show={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        title="Cancel appointment?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              onClick={handleCancelAppointment}
              disabled={cancelLoading}
            >
              {cancelLoading ? "Cancelling…" : "Yes, cancel appointment"}
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => setCancelConfirmOpen(false)}
            >
              Keep appointment
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-0">
          Are you sure you want to cancel this appointment? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

// ── Small helper component ─────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="appt-drawer__info-row">
      <span className="appt-drawer__info-label">{label}</span>
      <span className="appt-drawer__info-value">{value}</span>
    </div>
  );
}
