import { useState, useRef, useEffect } from "react"
import "../styles/SalesListPage.scss"

import {
  Search,
  Calendar3,
  Sliders,
  ArrowDownUp,
  Plus,
  ChevronDown,
  TagFill,
  Gear,
  FileEarmarkPdf,
  FileEarmarkText,
  FileEarmarkExcel,
  Receipt
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

import QuickSaleDrawer from "../components/QuickSaleDrawer"
import { useSale } from "../context/SaleContext"

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
  const { drafts, cancelDraft } = useSale();
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null)
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1">Sales</h3>
          <p className="text-muted small mb-0">
            View, filter and export the history of your sales.
          </p>
        </div>

        <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Options Dropdown */}
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
              <div className="sales-dropdown-menu options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden" style={{ minWidth: '200px' }}>
                <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => setShowOptions(false)}>
                  <Gear size={16} className="me-2 text-muted" />
                  <span>Sales settings</span>
                </Button>
                <div className="bg-light px-3 py-1 small fw-bold text-muted border-bottom">Export</div>
                <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => setShowOptions(false)}>
                  <FileEarmarkPdf size={16} className="text-danger me-2" />
                  <span>PDF</span>
                </Button>
                <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => setShowOptions(false)}>
                  <FileEarmarkText size={16} className="text-primary me-2" />
                  <span>CSV</span>
                </Button>
                <Button variant="ghost" fullWidth className="text-start p-2 rounded-0" onClick={() => setShowOptions(false)}>
                  <FileEarmarkExcel size={16} className="text-success me-2" />
                  <span>Excel</span>
                </Button>
              </div>
            )}
          </div>

          <Button 
            variant="dark"
            pill
            className="px-4"
            onClick={() => setDrawerOpen(true)}
            iconLeft={<Plus size={18} />}
          >
            Add new
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="sales-tabs mb-4 d-flex gap-2 align-items-center">
        <Button 
          variant={activeTab === "sales" ? "dark" : "ghost"}
          pill
          className="px-4 fw-bold"
          onClick={() => setActiveTab("sales")}
        >
          Sales
        </Button>
        <Button 
          variant={activeTab === "drafts" ? "dark" : "ghost"}
          pill
          className="px-4 fw-bold"
          onClick={() => setActiveTab("drafts")}
        >
          Drafts
        </Button>
      </div>

      {/* FILTER BAR */}
      <div className="filter-bar mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">

          <div className="d-flex gap-2 align-items-center flex-wrap flex-grow-1">

            {/* Search */}
            <div style={{ maxWidth: '350px', flex: 1 }}>
              <Input
                placeholder={activeTab === "sales" ? "Search by Sale or Client" : "Search by Draft ID"}
                className="mb-0"
                containerClass="mb-0"
                iconLeft={<Search size={16} />}
              />
            </div>

            {/* Date */}
            <Button
              variant="outline-dark"
              pill
              onClick={() => setShowCalendar(true)}
              iconRight={<Calendar3 size={14} />}
            >
              {getButtonLabel()}
            </Button>

            {/* Filters */}
            <Button
              variant="outline-dark"
              pill
              onClick={() => setShowFilters(true)}
              iconRight={<Sliders size={14} />}
            >
              Filters
            </Button>

          </div>

          {/* Sort Dropdown */}
          <div className="position-relative" ref={sortRef}>
            <Button 
              variant="outline-dark"
              pill
              className="px-3"
              onClick={() => setShowSort(!showSort)}
              iconRight={<ArrowDownUp size={14} />}
            >
              Sort by
            </Button>
            {showSort && (
              <div className="sales-dropdown-menu sort-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-auto" style={{ maxHeight: '300px', width: '220px' }}>
                {["Sale # (Z-A)", "Sale # (A-Z)", "Client (Z-A)", "Client (A-Z)", "Sale date (newest first)", "Sale date (oldest first)", "Location (Z-A)", "Location (A-Z)", "Tips (highest first)", "Tips (lowest first)", "Gross total (highest first)", "Gross total (lowest first)"].map(opt => (
                  <Button key={opt} variant="ghost" fullWidth className="text-start p-2 rounded-0 small border-bottom" onClick={() => setShowSort(false)}>{opt}</Button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* CALENDAR MODAL */}
      <Modal
        show={showCalendar}
        onClose={cancelDateRange}
        title="Date range"
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-2 w-100">
            <Button
              variant="ghost"
              pill
              className="px-4"
              onClick={cancelDateRange}
            >
              Cancel
            </Button>
            <Button
              variant="dark"
              pill
              className="px-4"
              onClick={applyDateRange}
            >
              Apply
            </Button>
          </div>
        }
      >
        <div className="calendar-modal-content">
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
            <Button
              variant="ghost"
              pill
              className="px-4"
              onClick={() => setShowFilters(false)}
            >
              Clear filters
            </Button>

            <Button
              variant="dark"
              pill
              className="px-4"
              onClick={() => setShowFilters(false)}
            >
              Apply
            </Button>
          </div>
        }
      >
        <div className="filters-content">
          <div className="mb-4">
            <label className="form-label small fw-bold">Status</label>
            <select className="form-select rounded-3 p-2">
              <option>All statuses</option>
            </select>
          </div>

          <div className="row mb-4">
            <div className="col">
              <label className="form-label small fw-bold">From amount</label>
              <Input
                placeholder="From"
                className="mb-0"
                containerClass="mb-0"
                iconLeft={<span className="text-muted small fw-bold">₹</span>}
              />
            </div>

            <div className="col">
              <label className="form-label small fw-bold">To amount</label>
              <Input
                placeholder="To"
                className="mb-0"
                containerClass="mb-0"
                iconLeft={<span className="text-muted small fw-bold">₹</span>}
              />
            </div>
          </div>

          <div className="mb-2">
            <label className="form-label small fw-bold">Including items</label>
            <select className="form-select rounded-3 p-2">
              <option>Select item type</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* DRAFTS & SALES CONTENT */}
      <div className="sales-content-wrapper d-flex gap-4">
        <div className="table-container flex-grow-1">
          {activeTab === "sales" ? (
            <Card className="text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-2 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-center mx-auto empty-state-icon" style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '15px', 
                  background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' 
                }}>
                  <TagFill size={30} className="text-white" />
                </div>
              </div>
              <h4 className="fw-bold mb-3 text-dark h5">No sales yet</h4>
              <div className="mt-2 text-center w-100 d-flex justify-content-center">
                <Button variant="outline-dark" pill className="px-4" onClick={() => setDrawerOpen(true)}>Create new sale</Button>
              </div>
            </Card>
          ) : (
            drafts.length > 0 ? (
              <div className="drafts-table-wrapper bg-white rounded-4 shadow-sm overflow-hidden border">
                <table className="table mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="p-3 extra-small text-muted fw-bold text-uppercase border-0">Draft #</th>
                      <th className="p-3 extra-small text-muted fw-bold text-uppercase border-0">Client</th>
                      <th className="p-3 extra-small text-muted fw-bold text-uppercase border-0 text-center">Status</th>
                      <th className="p-3 extra-small text-muted fw-bold text-uppercase border-0">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((draft: any) => (
                      <tr 
                        key={draft.id} 
                        className={`cursor-pointer transition-all ${selectedDraft?.id === draft.id ? 'bg-light fw-bold' : 'hover-bg-light'}`}
                        onClick={() => setSelectedDraft(draft)}
                      >
                        <td className="p-3 text-primary small fw-bold">{draft.id}</td>
                        <td className="p-3 small fw-bold">{draft.client}</td>
                        <td className="p-3 text-center">
                          <span className="badge rounded-pill px-3 bg-light text-muted border small">Draft</span>
                        </td>
                        <td className="p-3 small text-muted">{draft.created}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card className="text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-2 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-center mx-auto empty-state-icon" style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '15px', 
                    background: 'linear-gradient(135deg, #d8b4fe 0%, #e879f9 100%)' 
                  }}>
                    <Receipt size={30} className="text-white" />
                  </div>
                </div>
                <h4 className="fw-bold mb-3 text-dark h5">No draft sales yet</h4>
                <div className="mt-2 text-center w-100 d-flex justify-content-center">
                  <Button variant="outline-dark" pill className="px-4" onClick={() => setDrawerOpen(true)}>Create new sale</Button>
                </div>
              </Card>
            )
          )}
        </div>

        {/* DETAIL PANE */}
        {activeTab === "drafts" && selectedDraft && (
          <div className="draft-detail-pane bg-white rounded-4 shadow-sm border p-4" style={{ width: '400px', display: 'flex', flexDirection: 'column' }}>
            <div className="detail-header d-flex justify-content-between align-items-start mb-4">
              <div>
                <span className="badge bg-light text-muted border rounded-pill px-3 extra-small mb-2">Unpaid</span>
                <h4 className="fw-bold h5 mb-0">Draft sale</h4>
                <p className="extra-small text-muted">{selectedDraft.created.split(',')[0]}</p>
              </div>
              <div className="d-flex gap-2">
                <Button variant="dark" size="sm" pill className="px-3 py-1">Checkout</Button>
                <Button variant="ghost" size="sm" className="p-1 border rounded-circle"><ChevronDown size={14} /></Button>
              </div>
            </div>

            <div className="client-info-card border rounded-4 p-3 d-flex align-items-center justify-content-between mb-4 bg-light bg-opacity-10">
              <div className="d-flex align-items-center gap-2">
                <div className="avatar rounded-circle bg-light text-primary d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                  <Receipt size={16} />
                </div>
                <span className="small fw-bold">{selectedDraft.client}</span>
              </div>
              <Button variant="ghost" size="sm" className="p-1"><ChevronDown size={14} /></Button>
            </div>

            <div className="items-list flex-grow-1">
              <div className="d-flex justify-content-between mb-3">
                <span className="extra-small text-muted fw-bold text-uppercase">{selectedDraft.id}</span>
                <span className="extra-small text-muted">{selectedDraft.created.split(',')[0]}</span>
              </div>
              
              {selectedDraft.items.map((item: any, idx: number) => (
                <div key={idx} className="draft-item d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="small fw-bold">{item.name}</div>
                    <div className="extra-small text-muted">1h 15min · dhumal dipak</div>
                  </div>
                  <div className="small fw-bold">₹{item.price * (item.quantity || 1)}</div>
                </div>
              ))}
            </div>

            <div className="detail-footer border-top pt-3 mt-auto">
              <div className="d-flex justify-content-between mb-2">
                <span className="small text-muted fw-bold">Subtotal</span>
                <span className="small text-muted fw-bold">₹{selectedDraft.total}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="small text-dark fw-bold">Total</span>
                <span className="small text-dark fw-bold">₹{selectedDraft.total}</span>
              </div>
              <div className="d-flex justify-content-between pt-2">
                <span className="small text-dark fw-bold">Balance</span>
                <span className="small text-dark fw-bold">₹{selectedDraft.total}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-top">
              <Button variant="outline-danger" fullWidth pill size="sm" className="py-2" onClick={() => {
                cancelDraft(selectedDraft.id);
                setSelectedDraft(null);
              }}>Cancel draft</Button>
            </div>
          </div>
        )}
      </div>

      {/* ================= QUICK SALE DRAWER ================= */}
      <QuickSaleDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

    </div>
  )
}