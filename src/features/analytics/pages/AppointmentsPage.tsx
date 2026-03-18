import { useState, useMemo, useEffect } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import {
  Calendar3,
  ChevronDown,
  Search,
  Sliders,
  FileEarmarkArrowDown,
  X,
  ChevronLeft,
  ChevronRight,
  SortDown,
  FiletypePdf,
  FiletypeCsv,
  FiletypeXlsx
} from "react-bootstrap-icons"
import { DateRange } from "react-date-range"
import { subDays, format, isWithinInterval, parseISO } from "date-fns"
import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"
import "../styles/AppointmentsPage.scss"
import { useSchedulerContext } from "../../bookings/store/SchedulerContext"
import { STAFF_LIST } from "../../bookings/utils/schedulerMockData"

export default function AppointmentsPage() {
  const { bookings } = useSchedulerContext();
  
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
    status: "all"
  });
  const [appliedFilters, setAppliedFilters] = useState({
    staffId: "all",
    channel: "all",
    status: "all"
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
      key: "selection"
    }
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
        setRange([{ startDate: yesterday, endDate: yesterday, key: "selection" }]);
        break;
      case "Last 7 days":
        setRange([{ startDate: subDays(today, 6), endDate: today, key: "selection" }]);
        break;
      case "Last 30 days":
        setRange([{ startDate: subDays(today, 29), endDate: today, key: "selection" }]);
        break;
      case "Month to date":
        setRange([{
          startDate: new Date(today.getFullYear(), today.getMonth(), 1),
          endDate: today,
          key: "selection"
        }]);
        break;
    }
  };

  const handleApplyRange = () => {
    const formatted = `${format(range[0].startDate, "dd MMM")} – ${format(
      range[0].endDate,
      "dd MMM"
    )}`;
    setSelectedLabel(formatted);
    setShowPicker(false);
  };

  const applyFilters = () => {
    setAppliedFilters(tempFilters);
    setShowFiltersModal(false);
  };

  const clearFilters = () => {
    const cleared = { staffId: "all", channel: "all", status: "all" };
    setTempFilters(cleared);
    setAppliedFilters(cleared);
    setShowFiltersModal(false);
  };

  const handleExport = (type: string) => {
    console.log(`Exporting as ${type}...`);
    setShowExport(false);
    // Placeholder for actual export logic
    // e.g., if type === 'csv', build string and download
  };

  // Sorting/Filtering Logic
  const filteredAppointments = useMemo(() => {
    let result = bookings.filter(booking => {
      // Search filter
      const matchesSearch = 
        booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date range filter
      const bookingDate = parseISO(booking.date);
      const start = range[0].startDate;
      const end = range[0].endDate;
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      const matchesDate = isWithinInterval(bookingDate, { start, end });
      
      // Modal filters
      const matchesStaff = appliedFilters.staffId === "all" || booking.services.some(s => s.staffId === appliedFilters.staffId);
      const matchesStatus = appliedFilters.status === "all" || booking.status.toLowerCase() === appliedFilters.status.toLowerCase();
      const matchesChannel = appliedFilters.channel === "all"; 

      return matchesSearch && matchesDate && matchesStaff && matchesStatus && matchesChannel;
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
          return parseISO(a.billDate || a.date).getTime() - parseISO(b.billDate || b.date).getTime();
        case "created_newest":
          return parseISO(b.billDate || b.date).getTime() - parseISO(a.billDate || a.date).getTime();
        case "scheduled_oldest":
          return parseISO(a.date + "T" + a.startTime).getTime() - parseISO(b.date + "T" + b.startTime).getTime();
        case "scheduled_newest":
          return parseISO(b.date + "T" + b.startTime).getTime() - parseISO(a.date + "T" + a.startTime).getTime();
        case "duration_shortest":
          return getDuration(a) - getDuration(b);
        case "duration_longest":
          return getDuration(b) - getDuration(a);
        default: return 0;
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

  const getStatusClass = (status: string) => {
    switch(status.toLowerCase()) {
      case "confirmed": return "status-booked";
      case "completed": return "status-completed";
      case "cancelled": return "status-cancelled";
      default: return "status-pending";
    }
  }

  const sortOptions = [
    { label: "Created Date (oldest first)", value: "created_oldest" },
    { label: "Created Date (newest first)", value: "created_newest" },
    { label: "Scheduled Date (oldest first)", value: "scheduled_oldest" },
    { label: "Scheduled Date (newest first)", value: "scheduled_newest" },
    { label: "Duration (shortest first)", value: "duration_shortest" },
    { label: "Duration (longest first)", value: "duration_longest" },
  ];

  const currentSortLabel = sortOptions.find(o => o.value === sortConfig)?.label;

  return (
    <div className="appointments-page">
      {/* ================= HEADER ================= */}
      <div className="appointments-header d-flex justify-content-between align-items-end">
        <div>
          <h2>Appointments</h2>
          <p>View, filter and export appointments booked by your clients.</p>
        </div>

        <div className="position-relative">
          <button 
            className="btn-export d-flex align-items-center gap-2"
            onClick={() => setShowExport(!showExport)}
          >
            Export <ChevronDown size={14} />
          </button>
          
          {showExport && (
            <div className="custom-dropdown shadow" style={{ right: 0, left: 'auto', top: '100%', marginTop: '5px', minWidth: '150px' }}>
              <div className="dropdown-item-custom d-flex align-items-center gap-2" onClick={() => handleExport('pdf')}>
                <FiletypePdf size={18} /> PDF
              </div>
              <div className="dropdown-item-custom d-flex align-items-center gap-2" onClick={() => handleExport('csv')}>
                <FiletypeCsv size={18} /> CSV
              </div>
              <div className="dropdown-item-custom d-flex align-items-center gap-2" onClick={() => handleExport('xlsx')}>
                <FiletypeXlsx size={18} /> Excel
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="appointments-toolbar">
        <div className="search-container">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search by Reference or Client"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="position-relative">
          <button
            className={`date-filter-btn ${showPicker ? 'active' : ''}`}
            onClick={() => setShowPicker(!showPicker)}
          >
            <Calendar3 size={16} />
            {selectedLabel}
            <ChevronDown size={14} />
          </button>

          {showPicker && (
            <div className="fresha-calendar-popup shadow">
              <div className="preset-selector">
                <div 
                  className="custom-select d-flex justify-content-between align-items-center"
                  onClick={() => setShowPresets(!showPresets)}
                >
                  {selectedLabel}
                  <ChevronDown size={14} />
                </div>
                
                {showPresets && (
                  <div className="custom-dropdown shadow" style={{ width: 'calc(100% - 32px)', left: '16px', top: '65px' }}>
                    {["Today", "Yesterday", "Last 7 days", "Last 30 days", "Month to date"].map(p => (
                      <div key={p} className="dropdown-item-custom" onClick={() => handlePreset(p)}>
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="calendar-content">
                <div className="d-flex gap-2 mb-3">
                  <input className="form-control form-control-sm" value={format(range[0].startDate, "yyyy-MM-dd")} readOnly />
                  <input className="form-control form-control-sm" value={format(range[0].endDate, "yyyy-MM-dd")} readOnly />
                </div>
                <DateRange
                  ranges={range}
                  onChange={(item: any) => setRange([item.selection])}
                  months={2}
                  direction="horizontal"
                  rangeColors={['#000']}
                />
              </div>

              <div className="calendar-footer">
                <button className="btn-cancel" onClick={() => setShowPicker(false)}>Cancel</button>
                <button className="btn-apply" onClick={handleApplyRange}>Apply</button>
              </div>
            </div>
          )}
        </div>

        <button 
          className="filter-btn"
          onClick={() => setShowFiltersModal(true)}
        >
          <Sliders size={16} />
          Filters {(appliedFilters.staffId !== "all" || appliedFilters.status !== "all" || appliedFilters.channel !== "all") && "•"}
        </button>

        {/* Sorting Dropdown */}
        <div className="sort-container position-relative">
          <button 
            className={`sort-btn ${showSort ? 'active' : ''}`}
            onClick={() => setShowSort(!showSort)}
          >
            {currentSortLabel}
            <SortDown size={18} />
          </button>

          {showSort && (
            <div className="custom-dropdown shadow" style={{ right: 0, left: 'auto', top: '100%', marginTop: '5px', width: '220px' }}>
              {sortOptions.map(opt => (
                <div 
                  key={opt.value} 
                  className={`dropdown-item-custom ${sortConfig === opt.value ? 'active' : ''}`}
                  onClick={() => {
                    setSortConfig(opt.value);
                    setShowSort(false);
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= FILTERS MODAL ================= */}
      {showFiltersModal && (
        <div className="modal-overlay">
          <div className="filters-modal">
            <X className="modal-close" size={24} onClick={() => setShowFiltersModal(false)} />
            <h3>Filters</h3>
            
            <div className="filter-group">
              <label>Team member</label>
              <select 
                className="custom-select"
                value={tempFilters.staffId}
                onChange={(e) => setTempFilters({...tempFilters, staffId: e.target.value})}
              >
                <option value="all">All team members</option>
                {STAFF_LIST.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Channel</label>
              <select 
                className="custom-select"
                value={tempFilters.channel}
                onChange={(e) => setTempFilters({...tempFilters, channel: e.target.value})}
              >
                <option value="all">All channels</option>
                <option value="online">All online channels</option>
                <option value="fresha">Marketplace - Fresha</option>
                <option value="book_now">Book now link</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="google">Marketplace - Google Reserve</option>
                <option value="automation">Marketing - Automations</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select 
                className="custom-select"
                value={tempFilters.status}
                onChange={(e) => setTempFilters({...tempFilters, status: e.target.value})}
              >
                <option value="all">All statuses</option>
                <option value="booked">Booked</option>
                <option value="confirmed">Confirmed</option>
                <option value="arrived">Arrived</option>
                <option value="started">Started</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No-show</option>
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn-clear" onClick={clearFilters}>Clear filters</button>
              <button className="btn-apply" onClick={applyFilters}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TABLE ================= */}
      <div className="table-card">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Client</th>
              <th>Service</th>
              <th>Created by</th>
              <th>Created Date</th>
              <th>Scheduled Date</th>
              <th>Duration</th>
              <th>Team member</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAppointments.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="no-results">No appointments found matching your filters</div>
                </td>
              </tr>
            ) : (
              paginatedAppointments.map((booking) => {
                const serviceNames = booking.services.map(s => s.service).join(", ");
                const teamMember = booking.services[0]?.staff || "N/A";
                
                const start = parseISO(booking.date + "T" + booking.startTime);
                const end = parseISO(booking.date + "T" + booking.endTime);
                const durMs = end.getTime() - start.getTime();
                const durMins = Math.floor(durMs / (1000 * 60));
                const durationStr = durMins >= 60 
                  ? `${Math.floor(durMins / 60)}h ${durMins % 60}min` 
                  : `${durMins}min`;

                return (
                  <tr key={booking.id}>
                    <td><a href="#" className="ref-link">#{booking.id.toUpperCase()}</a></td>
                    <td><a href="#" className="client-link">{booking.clientName}</a></td>
                    <td>{serviceNames}</td>
                    <td>dhumal dipak</td>
                    <td>{format(parseISO(booking.billDate || booking.date), "dd MMM yyyy, h:mma").toLowerCase()}</td>
                    <td>{format(parseISO(booking.date + "T" + booking.startTime), "dd MMM yyyy, h:mma").toLowerCase()}</td>
                    <td>{durationStr}</td>
                    <td>{teamMember}</td>
                    <td>₹{booking.grandTotal.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= PAGINATION ================= */}
      <div className="pagination-container">
        <div className="page-size-selector">
          Rows per page:
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
          </select>
        </div>

        <div className="pagination-info">
          Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAppointments.length)} to {Math.min(currentPage * pageSize, filteredAppointments.length)} of {filteredAppointments.length} results
        </div>

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button 
              className="page-btn prev-btn" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i + 1} 
                className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}

            <button 
              className="page-btn next-btn" 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}