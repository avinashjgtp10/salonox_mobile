import { useState, useRef, useEffect } from "react"
import {
  Search,
  Calendar3,
  Sliders,
  ChevronDown,
  FileEarmarkText,
  CreditCard2Back,
  Pencil
} from "react-bootstrap-icons"
import { DateRangePicker } from "react-date-range"
import type { RangeKeyDict, Range } from "react-date-range"
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths
} from "date-fns"

import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"
import "../styles/PaymentsPage.scss"

export default function PaymentsPage() {
  const [showCalendar, setShowCalendar] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  const calendarRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  const [dateRangeDropdown, setDateRangeDropdown] = useState("Custom")

  const [tempRange, setTempRange] = useState<Range[]>([
    { startDate: subDays(new Date(), 30), endDate: new Date(), key: "selection" }
  ])

  const [appliedRange, setAppliedRange] = useState<Range[]>([
    { startDate: subDays(new Date(), 30), endDate: new Date(), key: "selection" }
  ])

  // Close overlays on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false)
        setTempRange(appliedRange)
      }
      if (
        optionsRef.current &&
        !optionsRef.current.contains(event.target as Node)
      ) {
        setShowOptions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [appliedRange])

  // Calendar presets logic
  const handleSelectDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setDateRangeDropdown(val)

    const today = new Date()
    let start = today
    let end = today

    switch (val) {
      case "Yesterday":
        start = subDays(today, 1)
        end = subDays(today, 1)
        break
      case "This week":
        start = startOfWeek(today, { weekStartsOn: 1 })
        end = endOfWeek(today, { weekStartsOn: 1 })
        break
      case "Last week":
        start = startOfWeek(subDays(today, 7), { weekStartsOn: 1 })
        end = endOfWeek(subDays(today, 7), { weekStartsOn: 1 })
        break
      case "This month":
        start = startOfMonth(today)
        end = endOfMonth(today)
        break
      case "Last month":
        start = startOfMonth(subMonths(today, 1))
        end = endOfMonth(subMonths(today, 1))
        break
    }

    setTempRange([{ startDate: start, endDate: end, key: "selection" }])
  }

  const handleDateChange = (item: RangeKeyDict) => {
    setTempRange([item.selection])
    setDateRangeDropdown("Custom")
  }

  const applyDateRange = () => {
    setAppliedRange(tempRange)
    setShowCalendar(false)
  }

  const cancelDateRange = () => {
    setTempRange(appliedRange)
    setShowCalendar(false)
  }

  const getButtonLabel = () => {
    const start = appliedRange[0].startDate
    const end = appliedRange[0].endDate

    if (start && end && start.getTime() === end.getTime())
      return format(start, "dd MMM yyyy")

    if (start && end)
      return `${format(start, "dd MMM, yyyy")} - ${format(end, "dd MMM, yyyy")}`

    return "Date range"
  }

  return (
    <div className="payments-page container-fluid">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-semibold mb-1">Payment transactions</h3>
          <p className="text-muted small mb-0">
            View, filter and export the history of your payments.
          </p>
        </div>

        <div className="position-relative" ref={optionsRef}>
          <button
            className="btn btn-outline-secondary rounded-pill px-3 fw-semibold text-dark d-flex align-items-center"
            onClick={() => setShowOptions(!showOptions)}
          >
            Options <ChevronDown size={14} className="ms-1 fw-bold" />
          </button>
          
          {showOptions && (
            <div className="payment-options-menu">
              <div className="dropdown-item d-flex align-items-center">
                <Pencil size={16} className="me-2 text-muted" />
                <span>Manage payments</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-section-title">Export</div>
              <div className="dropdown-item d-flex align-items-center">
                <FileEarmarkText size={16} className="me-2 text-muted" />
                <span>CSV</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar card p-3 mb-3 border-0 shadow-sm rounded-4">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div className="search-input d-flex align-items-center px-3 py-2 bg-light rounded-pill flex-grow-1" style={{ maxWidth: '300px' }}>
            <Search size={16} className="me-2 text-muted" />
            <input
              type="text"
              placeholder="Search by Sale or Client"
              className="border-0 bg-transparent outline-0 w-100"
            />
          </div>

          <button
            className="btn btn-outline-secondary rounded-pill px-3 d-flex align-items-center"
            onClick={() => setShowCalendar(true)}
          >
            {getButtonLabel()} <ChevronDown size={14} className="ms-2" />
          </button>

          <button
            className="btn btn-outline-secondary rounded-pill px-3 d-flex align-items-center"
            onClick={() => setShowFilters(true)}
          >
            Filters <Sliders size={14} className="ms-2" />
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      <div className="card text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-2 flex-grow-1 d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-center mx-auto empty-state-icon" style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '15px', 
            background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' 
          }}>
            <CreditCard2Back size={30} className="text-white" />
          </div>
        </div>
        <h4 className="fw-bold mb-2 text-dark">No results found</h4>
        <p className="text-muted">Try adjusting your search and filters.</p>
      </div>

      {/* CALENDAR MODAL */}
      {showCalendar && (
        <div className="payment-calendar-overlay">
          <div className="payment-calendar-modal" ref={calendarRef}>
            <div className="modal-header-section mb-4">
              <label className="fw-bold small mb-2 text-dark">Date range</label>
              <select
                className="form-select border-1 rounded-3 px-3 py-2"
                value={dateRangeDropdown}
                onChange={handleSelectDropdown}
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

            <div className="d-flex gap-3 mb-4">
              <div className="flex-fill">
                <label className="fw-bold small mb-2 text-dark">Starting Date</label>
                <input 
                  type="text" 
                  className="form-control rounded-3 px-3 py-2" 
                  value={format(tempRange[0].startDate || new Date(), "yyyy-MM-dd")} 
                  readOnly 
                />
              </div>
              <div className="flex-fill">
                <label className="fw-bold small mb-2 text-dark">Ending Date</label>
                <input 
                  type="text" 
                  className="form-control rounded-3 px-3 py-2" 
                  value={format(tempRange[0].endDate || new Date(), "yyyy-MM-dd")} 
                  readOnly 
                />
              </div>
            </div>

            <div className="calendar-container">
              <DateRangePicker
                onChange={handleDateChange}
                moveRangeOnFirstSelection={false}
                months={2}
                ranges={tempRange}
                direction="horizontal"
                showMonthAndYearPickers={false}
                showDateDisplay={false}
                rangeColors={["#000000"]}
                staticRanges={[]}
                inputRanges={[]}
              />
            </div>

            <div className="d-flex justify-content-end gap-3 mt-4 pt-4 border-top">
              <button
                className="btn btn-light rounded-pill px-5 fw-semibold"
                onClick={cancelDateRange}
              >
                Cancel
              </button>
              <button
                className="btn btn-dark rounded-pill px-5 fw-semibold"
                onClick={applyDateRange}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER MODAL */}
      {showFilters && (
        <div className="payment-filters-overlay">
          <div className="payment-filters-modal">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-semibold mb-0">Filters</h5>
              <button
                className="btn-close"
                onClick={() => setShowFilters(false)}
              />
            </div>

            <div className="mb-3">
              <label className="fw-semibold small mb-2">Location</label>
              <select className="form-select rounded-3">
                <option>All locations</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="fw-semibold small mb-2">Team member</label>
              <select className="form-select rounded-3">
                <option>All team members</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="fw-semibold small mb-2">Type</label>
              <select className="form-select rounded-3">
                <option>All types</option>
              </select>
            </div>

            <div className="row mb-3">
              <div className="col">
                <label className="fw-semibold small mb-2">From amount</label>
                <div className="input-group">
                  <span className="input-group-text">INR</span>
                  <input className="form-control" value="0" readOnly />
                </div>
              </div>
              <div className="col">
                <label className="fw-semibold small mb-2">To amount</label>
                <div className="input-group">
                  <span className="input-group-text">INR</span>
                  <input className="form-control" value="0" readOnly />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="fw-semibold small mb-2">Vouchers</label>
              <select className="form-select rounded-3">
                <option>Exclude voucher redemptions</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="fw-semibold small mb-2">Deposits</label>
              <select className="form-select rounded-3">
                <option>Exclude deposit redemptions</option>
              </select>
            </div>

            <div className="d-flex justify-content-end gap-3 mt-4">
              <button
                className="btn btn-light rounded-pill px-4"
                onClick={() => setShowFilters(false)}
              >
                Clear filters
              </button>
              <button
                className="btn btn-dark rounded-pill px-4"
                onClick={() => setShowFilters(false)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
