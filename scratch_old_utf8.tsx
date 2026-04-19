import { useState, useMemo, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Calendar3,
  Search,
  Sliders,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SortDown,
  FiletypePdf,
  FiletypeCsv,
  FiletypeXlsx,
} from "react-bootstrap-icons";

// UI Components
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import Card from "../../../components/ui/Card";
import { DateRange } from "react-date-range";
import { subDays, format, isWithinInterval, parseISO } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/AppointmentsPage.scss";

import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { fetchBookingsThunk, exportBookingsThunk } from "../../../middleware/booking/booking.thunk";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { Booking } from "../../../types/booking.types";

export default function AppointmentsPage() {
  const dispatch = useDispatch<AppDispatch>();

  // ΓöÇΓöÇ Redux: real data from backend ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const allBookings = useSelector((state: RootState) => (state.booking as any).items as Booking[]);
  const staffList   = useSelector((state: RootState) => (state.staff as any).items as any[]);
  const isLoading   = useSelector((state: RootState) => (state.booking as any).loading?.fetchAll as boolean ?? false);
  const isExporting = useSelector((state: RootState) => (state.booking as any).loading?.export   as boolean ?? false);

  // Fetch on mount
  useEffect(() => {
    dispatch(fetchBookingsThunk());
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("Month to date");
  const [showExport, setShowExport] = useState(false);

  // Filters Modal State
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    staffId: "all",
    channel: "all",
    status: "all",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    staffId: "all",
    channel: "all",
    status: "all",
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting State
  const [sortConfig, setSortConfig] = useState("scheduled_newest");
  const [showSort, setShowSort] = useState(false);

  const today = new Date();

  const [range, setRange] = useState([
    {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: today,
      key: "selection",
    },
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, range, appliedFilters, pageSize, sortConfig]);

  const handlePreset = (label: string) => {
    setSelectedLabel(label);
    setShowPresets(false);

    switch (label) {
      case "Today":
        setRange([{ startDate: today, endDate: today, key: "selection" }]);
        break;
      case "Yesterday":
        const yesterday = subDays(today, 1);
        setRange([
          { startDate: yesterday, endDate: yesterday, key: "selection" },
        ]);
        break;
      case "Last 7 days":
        setRange([
          { startDate: subDays(today, 6), endDate: today, key: "selection" },
        ]);
        break;
      case "Last 30 days":
        setRange([
          { startDate: subDays(today, 29), endDate: today, key: "selection" },
        ]);
        break;
      case "Month to date":
        setRange([
          {
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            endDate: today,
            key: "selection",
          },
        ]);
        break;
    }
  };

  const handleApplyRange = () => {
    const formatted = `${format(range[0].startDate, "dd MMM")} ΓÇô ${format(
      range[0].endDate,
      "dd MMM",
    )}`;
    setSelectedLabel(formatted);
    setShowPicker(false);
  };

  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    setShowFiltersModal(false);
    dispatch(fetchBookingsThunk({
      staffId: tempFilters.staffId,
      status:  tempFilters.status,
    }));
  };

  const clearFilters = () => {
    const cleared = { staffId: "all", channel: "all", status: "all" };
    setTempFilters(cleared);
    setAppliedFilters(cleared);
    setShowFiltersModal(false);
    dispatch(fetchBookingsThunk());
  };

  const handleExport = (type: string) => {
    setShowExport(false);
    if (type === "pdf") {
      // Client-side PDF: print the table
      window.print();
      return;
    }
    const fmt = type === "xlsx" ? "excel" : "csv";
    dispatch(
      exportBookingsThunk({
        format: fmt as "excel" | "csv",
        filters: {
          status: appliedFilters.status !== "all" ? appliedFilters.status : undefined,
          start_date: format(range[0].startDate, "yyyy-MM-dd"),
          end_date:   format(range[0].endDate,   "yyyy-MM-dd"),
        },
      })
    );
  };

  // Build a quick id ΓåÆ full name lookup for staff
  const staffById = useMemo<Record<string, string>>(
    () => Object.fromEntries(
      staffList.map((s: any) => [s.id, `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()])
    ),
    [staffList],
  );

  // Map backend Appointment records to table-friendly shape
  const bookings = useMemo(() =>
    allBookings.map((b: Booking) => ({
      id:           b.id,
      clientName:   b.client_id ?? "Walk-in",
      services:     [{ staffId: b.staff_id ?? "", staff: b.staff_id ?? "", service: b.title ?? "" }],
      status:       b.status,
      date:         b.scheduled_at?.split("T")[0] ?? "",
      startTime:    b.scheduled_at?.split("T")[1]?.slice(0, 5) ?? "00:00",
      endTime:      b.ends_at?.split("T")[1]?.slice(0, 5) ?? "00:00",
      billDate:     b.created_at,
      createdById:  b.created_by ?? "",
      grandTotal:   0,
    })),
  [allBookings]);

  // Sorting/Filtering Logic
  const filteredAppointments = useMemo(() => {
    let result = bookings.filter((booking) => {
      // Search filter
      const matchesSearch =
        String(booking.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.clientName.toLowerCase().includes(searchTerm.toLowerCase());

      // Date range filter
      const bookingDate = parseISO(booking.date);
      const start = range[0].startDate;
      const end = range[0].endDate;
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const matchesDate = isWithinInterval(bookingDate, { start, end });

      // Modal filters
      const matchesStaff =
        appliedFilters.staffId === "all" ||
        booking.services.some((s) => s.staffId === appliedFilters.staffId);
      const matchesStatus =
        appliedFilters.status === "all" ||
        booking.status.toLowerCase() === appliedFilters.status.toLowerCase();
      const matchesChannel = appliedFilters.channel === "all";

      return (
        matchesSearch &&
        matchesDate &&
        matchesStaff &&
        matchesStatus &&
        matchesChannel
      );
    });

    // Sort result
    result.sort((a, b) => {
      const getDuration = (bk: any) => {
        const s = parseISO(bk.date + "T" + bk.startTime);
        const e = parseISO(bk.date + "T" + bk.endTime);
        return e.getTime() - s.getTime();
      };

      switch (sortConfig) {
        case "created_oldest":
          return (
            parseISO(a.billDate || a.date).getTime() -
            parseISO(b.billDate || b.date).getTime()
          );
        case "created_newest":
          return (
            parseISO(b.billDate || b.date).getTime() -
            parseISO(a.billDate || a.date).getTime()
          );
        case "scheduled_oldest":
          return (
            parseISO(a.date + "T" + a.startTime).getTime() -
            parseISO(b.date + "T" + b.startTime).getTime()
          );
        case "scheduled_newest":
          return (
            parseISO(b.date + "T" + b.startTime).getTime() -
            parseISO(a.date + "T" + a.startTime).getTime()
          );
        case "duration_shortest":
          return getDuration(a) - getDuration(b);
        case "duration_longest":
          return getDuration(b) - getDuration(a);
        default:
          return 0;
      }
    });

    return result;
  }, [bookings, searchTerm, range, appliedFilters, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAppointments.length / pageSize);
  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, currentPage, pageSize]);

  const sortOptions = [
    { label: "Created Date (oldest first)", value: "created_oldest" },
    { label: "Created Date (newest first)", value: "created_newest" },
    { label: "Scheduled Date (oldest first)", value: "scheduled_oldest" },
    { label: "Scheduled Date (newest first)", value: "scheduled_newest" },
    { label: "Duration (shortest first)", value: "duration_shortest" },
    { label: "Duration (longest first)", value: "duration_longest" },
  ];

  const currentSortLabel = sortOptions.find(
    (o) => o.value === sortConfig,
  )?.label;

  return (
    <div className="appointments-page">
      {/* ================= HEADER ================= */}
      <div className="appointments-header d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="h3 fw-bold mb-1">Appointments</h2>
          <p className="text-muted small mb-0">
            View, filter and export appointments booked by your clients.
          </p>
        </div>

        <div className="position-relative">
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
                disabled={isExporting}
                onClick={() => handleExport("csv")}
              >
                <FiletypeCsv size={18} className="text-primary me-2" />
                {isExporting ? "ExportingΓÇª" : "CSV"}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="text-start p-2 rounded-0"
                disabled={isExporting}
                onClick={() => handleExport("xlsx")}
              >
                <FiletypeXlsx size={18} className="text-success me-2" />
                {isExporting ? "ExportingΓÇª" : "Excel"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="appointments-toolbar mb-4 d-flex gap-2 align-items-center flex-wrap">
        <div style={{ maxWidth: "300px", flex: 1 }}>
          <Input
            placeholder="Search by Reference or Client"
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
            <div
              className="salonox-calendar-popup shadow-lg border position-absolute start-0 mt-2 bg-white z-2 p-3 rounded-4"
              style={{ minWidth: "400px" }}
            >
              <div className="preset-selector mb-3 position-relative">
                <Button
                  variant="outline-dark"
                  fullWidth
                  className="d-flex justify-content-between align-items-center"
                  onClick={() => setShowPresets(!showPresets)}
                  iconRight={
                    <ChevronDown
                      size={14}
                      className={`transition-all ${showPresets ? "rotate-180" : ""}`}
                    />
                  }
                >
                  {selectedLabel}
                </Button>

                {showPresets && (
                  <div className="custom-dropdown shadow border position-absolute start-0 w-100 mt-1 bg-white z-3 rounded-3 overflow-hidden">
                    {[
                      "Today",
                      "Yesterday",
                      "Last 7 days",
                      "Last 30 days",
                      "Month to date",
                    ].map((p) => (
                      <Button
                        key={p}
                        variant="ghost"
                        fullWidth
                        className="text-start p-2 rounded-0 border-bottom"
                        onClick={() => handlePreset(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="calendar-content">
                <div className="d-flex gap-2 mb-3">
                  <Input
                    readOnly
                    className="form-control-sm mb-0"
                    value={format(range[0].startDate, "yyyy-MM-dd")}
                    containerClass="flex-grow-1"
                  />
                  <Input
                    readOnly
                    className="form-control-sm mb-0"
                    value={format(range[0].endDate, "yyyy-MM-dd")}
                    containerClass="flex-grow-1"
                  />
                </div>
                <div className="overflow-auto" style={{ maxWidth: "100%" }}>
                  <DateRange
                    ranges={range}
                    onChange={(item: any) => setRange([item.selection])}
                    months={2}
                    direction="horizontal"
                    rangeColors={["#000"]}
                  />
                </div>
              </div>

              <div className="calendar-footer d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                <Button
                  variant="ghost"
                  pill
                  size="sm"
                  onClick={() => setShowPicker(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="dark"
                  pill
                  size="sm"
                  onClick={handleApplyRange}
                >
                  Apply
                </Button>
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
            appliedFilters.status !== "all" ||
            appliedFilters.channel !== "all") &&
            "ΓÇó"}
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
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-3 w-100">
            <Button
              variant="outline-dark"
              pill
              className="px-4"
              onClick={clearFilters}
            >
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
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, staffId: e.target.value })
                }
                style={{ appearance: "none" }}
              >
                <option value="all">All team members</option>
                {staffList.map((staff: any) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
                size={14}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold">Channel</label>
            <div className="position-relative">
              <select
                className="form-select rounded-3 p-2 pe-5"
                value={tempFilters.channel}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, channel: e.target.value })
                }
                style={{ appearance: "none" }}
              >
                <option value="all">All channels</option>
                <option value="online">All online channels</option>
                <option value="salonox">Marketplace - salonox</option>
                <option value="book_now">Book now link</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="google">Marketplace - Google Reserve</option>
                <option value="automation">Marketing - Automations</option>
                <option value="offline">Offline</option>
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
                value={tempFilters.status}
                onChange={(e) =>
                  setTempFilters({ ...tempFilters, status: e.target.value })
                }
                style={{ appearance: "none" }}
              >
                <option value="all">All statuses</option>
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-show</option>
              </select>
              <ChevronDown
                className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
                size={14}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= TABLE ================= */}
      {isLoading ? (
        <Card
          className="text-center py-5 border-0 rounded-4 shadow-sm mb-4 d-flex flex-column align-items-center justify-content-center"
          style={{ minHeight: "400px" }}
        >
          <div className="spinner-border text-muted" role="status" />
          <p className="text-muted small mt-3 mb-0">Loading appointmentsΓÇª</p>
        </Card>
      ) : (
        <Card noPadding className="mb-4">
          <Table
            columns={[
              {
                header: "Ref #",
                key: "id",
                render: (item: any) => (
                  <a
                    href="#"
                    className="text-primary text-decoration-none fw-bold"
                  >
                    #{String(item.id).substring(0, 8).toUpperCase()}
                  </a>
                ),
              },
              {
                header: "Client",
                key: "clientName",
                render: (item: any) => (
                  <a
                    href="#"
                    className="font-bold text-dark text-decoration-none"
                  >
                    {item.clientName}
                  </a>
                ),
              },
              {
                header: "Service",
                key: "services",
                render: (item: any) =>
                  item.services.map((s: any) => s.service).join(", "),
              },
              {
                header: "Created by",
                key: "createdById",
                render: (item: any) => staffById[item.createdById] || "ΓÇö",
              },
              {
                header: "Created Date",
                key: "billDate",
                render: (item: any) => item.billDate ?
                  format(
                    parseISO(item.billDate),
                    "dd MMM yyyy, h:mma",
                  ).toLowerCase() : "N/A",
              },
              {
                header: "Scheduled Date",
                key: "date",
                render: (item: any) => {
                  try {
                    return format(
                      parseISO(item.date + "T" + item.startTime),
                      "dd MMM yyyy, h:mma",
                    ).toLowerCase();
                  } catch (e) {
                    return "Invalid date";
                  }
                }
              },
              {
                header: "Duration",
                key: "duration",
                render: (item: any) => {
                  try {
                    const start = parseISO(item.date + "T" + item.startTime);
                    const end = parseISO(item.date + "T" + item.endTime);
                    const durMs = end.getTime() - start.getTime();
                    const durMins = Math.floor(durMs / (1000 * 60));
                    if (isNaN(durMins)) return "N/A";
                    return durMins >= 60
                      ? `${Math.floor(durMins / 60)}h ${durMins % 60}min`
                      : `${durMins}min`;
                  } catch (e) {
                    return "N/A";
                  }
                },
              },
              {
                header: "Team member",
                key: "staff",
                render: (item: any) =>
                  staffById[item.services[0]?.staffId] || "ΓÇö",
              },
              {
                header: "Price",
                key: "grandTotal",
                render: (item: any) => `Γé╣${Number(item.grandTotal || 0).toFixed(2)}`,
              },
              {
                header: "Status",
                key: "status",
                render: (item: any) => (
                  <Badge
                    variant={
                      item.status?.toLowerCase() === "confirmed"
                        ? "success"
                        : item.status?.toLowerCase() === "completed"
                          ? "info"
                          : item.status?.toLowerCase() === "cancelled"
                            ? "danger"
                            : "warning"
                    }
                  >
                    {item.status ? item.status.replace("_", " ") : "Unknown"}
                  </Badge>
                ),
              },
            ]}
            data={paginatedAppointments}
            emptyMessage="No appointments found matching your filters"
          />
        </Card>
      )}

      {/* ================= PAGINATION ================= */}
      <div className="pagination-container d-flex align-items-center justify-content-between p-3 bg-white border-top rounded-bottom-4">
        <div className="page-size-selector d-flex align-items-center gap-2 small text-muted">
          Rows per page:
          <select
            className="form-select form-select-sm rounded-3 w-auto"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>

        <div className="pagination-info small text-muted">
          Showing{" "}
          {Math.min(
            (currentPage - 1) * pageSize + 1,
            filteredAppointments.length,
          )}{" "}
          to {Math.min(currentPage * pageSize, filteredAppointments.length)} of{" "}
          {filteredAppointments.length} results
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls d-flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              pill
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              iconLeft={<ChevronLeft size={16} />}
            >
              Previous
            </Button>

            <div className="d-flex gap-1 px-2">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Basic logic to show limited pages
                if (pageNum < currentPage - 2 || pageNum > currentPage + 2)
                  return null;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "dark" : "ghost"}
                    size="sm"
                    pill
                    className="min-w-32px"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              pill
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              iconRight={<ChevronRight size={16} />}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
