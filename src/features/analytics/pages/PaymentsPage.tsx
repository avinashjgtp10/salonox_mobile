import { useState, useRef, useEffect } from "react"
import {
  Search,
  Calendar3,
  Sliders,
  ChevronDown,
  FileEarmarkText,
  CreditCard2Back,
  Pencil
} from "react-bootstrap-icons";

// UI Components
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import Card from "../../../components/ui/Card";
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
            iconRight={<ChevronDown size={14} className={`ms-1 transition-all ${showOptions ? 'rotate-180' : ''}`} />}
          >
            Options
          </Button>
          
          {showOptions && (
            <div className="payment-options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden" style={{ minWidth: '200px' }}>
              <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => setShowOptions(false)}>
                <Pencil size={16} className="me-2 text-muted" />
                <span>Manage payments</span>
              </Button>
              <div className="bg-light px-3 py-1 small fw-bold text-muted border-bottom">Export</div>
              <Button variant="ghost" fullWidth className="text-start p-2 rounded-0" onClick={() => setShowOptions(false)}>
                <FileEarmarkText size={16} className="text-primary me-2" />
                <span>CSV</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar mb-4">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div style={{ maxWidth: '350px', flex: 1 }}>
            <Input
              placeholder="Search by Sale or Client"
              className="mb-0"
              containerClass="mb-0"
              iconLeft={<Search size={16} />}
            />
          </div>

          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowCalendar(true)}
            iconLeft={<Calendar3 size={16} />}
            iconRight={<ChevronDown size={14} />}
          >
            {getButtonLabel()}
          </Button>

          <Button
            variant="outline-dark"
            pill
            onClick={() => setShowFilters(true)}
            iconRight={<Sliders size={14} />}
          >
            Filters
          </Button>
        </div>
      </div>

      {/* EMPTY STATE */}
      <Card className="text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-2 flex-grow-1 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
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
        <h4 className="fw-bold mb-2 text-dark h5">No results found</h4>
        <p className="text-muted small">Try adjusting your search and filters.</p>
      </Card>

      {/* CALENDAR MODAL */}
      <Modal
        show={showCalendar}
        onClose={cancelDateRange}
        title="Date range"
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-3 w-100">
            <Button variant="ghost" pill className="px-5" onClick={cancelDateRange}>Cancel</Button>
            <Button variant="dark" pill className="px-5" onClick={applyDateRange}>Apply</Button>
          </div>
        }
      >
        <div className="payment-calendar-modal-content">
          <div className="mb-4">
            <label className="form-label small fw-bold">Select preset</label>
            <select
              className="form-select rounded-3 p-2"
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

          <div className="row mb-4">
            <div className="col">
              <label className="form-label small fw-bold">Starting Date</label>
              <Input readOnly value={format(tempRange[0].startDate || new Date(), "yyyy-MM-dd")} className="mb-0" containerClass="mb-0" />
            </div>
            <div className="col">
              <label className="form-label small fw-bold">Ending Date</label>
              <Input readOnly value={format(tempRange[0].endDate || new Date(), "yyyy-MM-dd")} className="mb-0" containerClass="mb-0" />
            </div>
          </div>

          <div className="d-flex justify-content-center overflow-auto">
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
        </div>
      </Modal>

      {/* FILTER MODAL */}
      <Modal
        show={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        footer={
          <div className="d-flex justify-content-end gap-3 w-100">
            <Button variant="ghost" pill className="px-4" onClick={() => setShowFilters(false)}>Clear filters</Button>
            <Button variant="dark" pill className="px-4" onClick={() => setShowFilters(false)}>Apply</Button>
          </div>
        }
      >
        <div className="payment-filters-modal-content">
          <div className="mb-4">
            <label className="form-label small fw-bold">Location</label>
            <select className="form-select rounded-3 p-2">
              <option>All locations</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold">Team member</label>
            <select className="form-select rounded-3 p-2">
              <option>All team members</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold">Type</label>
            <select className="form-select rounded-3 p-2">
              <option>All types</option>
            </select>
          </div>

          <div className="row mb-4">
            <div className="col">
              <label className="form-label small fw-bold">From amount</label>
              <Input readOnly value="0" iconLeft={<span className="text-muted small fw-bold">INR</span>} className="mb-0" containerClass="mb-0" />
            </div>
            <div className="col">
              <label className="form-label small fw-bold">To amount</label>
              <Input readOnly value="0" iconLeft={<span className="text-muted small fw-bold">INR</span>} className="mb-0" containerClass="mb-0" />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold">Vouchers</label>
            <select className="form-select rounded-3 p-2">
              <option>Exclude voucher redemptions</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="form-label small fw-bold">Deposits</label>
            <select className="form-select rounded-3 p-2">
              <option>Exclude deposit redemptions</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
