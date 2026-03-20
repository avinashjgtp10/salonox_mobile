import { useState, useRef, useEffect } from "react"
import "../styles/SalesListPage.scss"

import {
  Search,
  Calendar3,
  Sliders,
  ArrowDownUp,
  Plus,
  ThreeDots,
  ChevronDown,
  TagFill,
  Gear,
  FileEarmarkPdf,
  FileEarmarkText,
  FileEarmarkExcel,
  Receipt
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

import QuickSaleDrawer from "../components/QuickSaleDrawer"

export default function SalesListPage() {
  const [showCalendar, setShowCalendar] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  const [dateRangeDropdown, setDateRangeDropdown] = useState("Today")

  const [tempRange, setTempRange] = useState<Range[]>([
    { startDate: new Date(), endDate: new Date(), key: "selection" }
  ])

  const [appliedRange, setAppliedRange] = useState<Range[]>([
    { startDate: new Date(), endDate: new Date(), key: "selection" }
  ])

  // Tab State
  const [activeTab, setActiveTab] = useState<"sales" | "drafts">("sales")

  // Dropdown states
  const [showOptions, setShowOptions] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false)
        setTempRange(appliedRange)
      }
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false)
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSort(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () =>
      document.removeEventListener("mousedown", handleClickOutside)
  }, [appliedRange])

  // Preset logic
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
      return `${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy")}`

    return "Today"
  }

  return (
    <div className="sales-list container-fluid">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-semibold mb-1">Sales</h3>
          <p className="text-muted small mb-0">
            View, filter and export the history of your sales.
          </p>
        </div>

        <div className="d-flex gap-2">
          {/* Options Dropdown */}
          <div className="position-relative" ref={optionsRef}>
            <button 
              className="btn btn-outline-secondary rounded-pill px-3 fw-semibold text-dark"
              onClick={() => setShowOptions(!showOptions)}
            >
              Options <ChevronDown size={14} className="ms-1 fw-bold" />
            </button>
            {showOptions && (
              <div className="sales-dropdown-menu options-menu">
                <div className="dropdown-item d-flex align-items-center">
                  <Gear size={16} className="me-2 text-muted" />
                  <span>Sales settings</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-section-title">Export</div>
                <div className="dropdown-item d-flex align-items-center">
                  <FileEarmarkPdf size={16} className="me-2 text-muted" />
                  <span>PDF</span>
                </div>
                <div className="dropdown-item d-flex align-items-center">
                  <FileEarmarkText size={16} className="me-2 text-muted" />
                  <span>CSV</span>
                </div>
                <div className="dropdown-item d-flex align-items-center">
                  <FileEarmarkExcel size={16} className="me-2 text-muted" />
                  <span>Excel</span>
                </div>
              </div>
            )}
          </div>

          <button 
            className="btn btn-dark rounded-pill px-4 fw-semibold shadow-sm"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus size={18} className="me-1" />
            Add new
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="sales-tabs mb-4 d-flex gap-2 align-items-center">
        <button 
          className={`btn rounded-pill px-4 fw-semibold ${activeTab === "sales" ? "btn-dark shadow-sm" : "text-muted border-0"}`}
          onClick={() => setActiveTab("sales")}
        >
          Sales
        </button>
        <button 
          className={`btn rounded-pill px-4 fw-semibold ${activeTab === "drafts" ? "btn-dark shadow-sm" : "text-muted border-0"}`}
          onClick={() => setActiveTab("drafts")}
        >
          Drafts
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar card p-3 mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">

          <div className="d-flex gap-2 align-items-center flex-wrap">

            {/* Search */}
            <div className="search-input d-flex align-items-center px-3 py-2">
              <Search size={16} className="me-2 text-muted" />
              <input
                type="text"
                placeholder={activeTab === "sales" ? "Search by Sale or Client" : "Search by Draft ID"}
                className="border-0 outline-0"
              />
            </div>

            {/* Date */}
            <button
              className="btn btn-outline-secondary rounded-pill"
              onClick={() => setShowCalendar(true)}
            >
              {getButtonLabel()} <Calendar3 size={14} className="ms-1" />
            </button>

            {/* Filters */}
            <button
              className="btn btn-outline-secondary rounded-pill"
              onClick={() => setShowFilters(true)}
            >
              Filters <Sliders size={14} className="ms-1" />
            </button>

          </div>

          {/* Sort Dropdown */}
          <div className="position-relative" ref={sortRef}>
            <button 
              className="btn btn-outline-secondary rounded-pill px-3"
              onClick={() => setShowSort(!showSort)}
            >
              Sort by <ArrowDownUp size={14} className="ms-1" />
            </button>
            {showSort && (
              <div className="sales-dropdown-menu sort-menu">
                <div className="dropdown-item">Sale # (Z-A)</div>
                <div className="dropdown-item">Sale # (A-Z)</div>
                <div className="dropdown-item">Client (Z-A)</div>
                <div className="dropdown-item">Client (A-Z)</div>
                <div className="dropdown-item">Sale date (newest first)</div>
                <div className="dropdown-item">Sale date (oldest first)</div>
                <div className="dropdown-item">Location (Z-A)</div>
                <div className="dropdown-item">Location (A-Z)</div>
                <div className="dropdown-item">Tips (highest first)</div>
                <div className="dropdown-item">Tips (lowest first)</div>
                <div className="dropdown-item">Gross total (highest first)</div>
                <div className="dropdown-item">Gross total (lowest first)</div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CALENDAR MODAL */}
      {showCalendar && (
        <div className="calendar-overlay">
          <div className="calendar-modal" ref={calendarRef}>

            <div className="mb-3">
              <label className="fw-semibold small mb-1">Date range</label>
              <select
                className="form-select rounded-3"
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

            <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
              <button
                className="btn btn-light rounded-pill px-4"
                onClick={cancelDateRange}
              >
                Cancel
              </button>
              <button
                className="btn btn-dark rounded-pill px-4"
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
        <div className="filters-overlay">
          <div className="filters-modal">

            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-semibold mb-0">Filters</h5>
              <button
                className="btn-close"
                onClick={() => setShowFilters(false)}
              />
            </div>

            <div className="mb-4">
              <label className="fw-semibold small mb-2">Status</label>
              <select className="form-select rounded-3">
                <option>All statuses</option>
              </select>
            </div>

            <div className="row mb-4">
              <div className="col">
                <label className="fw-semibold small mb-2">From amount</label>
                <div className="input-group">
                  <span className="input-group-text">₹</span>
                  <input className="form-control" placeholder="From" />
                </div>
              </div>

              <div className="col">
                <label className="fw-semibold small mb-2">To amount</label>
                <div className="input-group">
                  <span className="input-group-text">₹</span>
                  <input className="form-control" placeholder="To" />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="fw-semibold small mb-2">Including items</label>
              <select className="form-select rounded-3">
                <option>Select item type</option>
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

      {/* EMPTY STATE */}
      <div className="card text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-2 flex-grow-1 align-items-center justify-content-center" style={{ minHeight: '400px' }}>
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-center mx-auto empty-state-icon" style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '15px', 
            background: activeTab === "sales" 
              ? 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' 
              : 'linear-gradient(135deg, #d8b4fe 0%, #e879f9 100%)' 
          }}>
            {activeTab === "sales" ? (
              <TagFill size={30} className="text-white" />
            ) : (
              <Receipt size={30} className="text-white" />
            )}
          </div>
        </div>
        <h4 className="fw-bold mb-3 text-dark">
          {activeTab === "sales" ? "No sales yet" : "No draft sales yet"}
        </h4>
        <div className="mt-2">
          <button 
            className="btn btn-outline-secondary rounded-pill fw-semibold px-4"
            onClick={() => setDrawerOpen(true)}
          >
            Create new sale
          </button>
        </div>
      </div>

      {/* ================= QUICK SALE DRAWER ================= */}
      <QuickSaleDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

    </div>
  )
}