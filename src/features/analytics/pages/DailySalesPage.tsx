import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { format, addDays, subDays, parseISO } from "date-fns"
import "../styles/DailySalesPage.scss"
import {
  FileEarmarkPdf,
  FileEarmarkText,
  FileEarmarkExcel
} from "react-bootstrap-icons"
import TransactionSummary from "../components/TransactionSummary";
import CashMovementSummary from "../components/CashMovementSummary";
import QuickSaleDrawer from "../components/QuickSaleDrawer";

// UI Components
import Button from "../../../components/ui/Button";

export default function DailySalesPage() {

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // ================= DATE LOGIC =================
  const urlDate = searchParams.get("report-date")

  const initialDate = urlDate
    ? parseISO(urlDate)
    : new Date()

  const [selectedDate, setSelectedDate] = useState(initialDate)

  useEffect(() => {
    if (urlDate) {
      setSelectedDate(parseISO(urlDate))
    }
  }, [urlDate])

  const updateDate = (newDate: Date) => {
    const formatted = format(newDate, "yyyy-MM-dd")
    navigate(`/dashboard/sales/daily?report-date=${formatted}`)
  }

  const handlePrev = () => {
    const newDate = subDays(selectedDate, 1)
    setSelectedDate(newDate)
    updateDate(newDate)
  }

  const handleNext = () => {
    const newDate = addDays(selectedDate, 1)
    setSelectedDate(newDate)
    updateDate(newDate)
  }

  const handleToday = () => {
    const today = new Date()
    setSelectedDate(today)
    updateDate(today)
  }

  // ================= DRAWER =================
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ================= EXPORT DROPDOWN =================
  const [showExport, setShowExport] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportRef.current &&
        !exportRef.current.contains(event.target as Node)
      ) {
        setShowExport(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="sales-layout">
      <div className="sales-container">

        {/* ================= HEADER ================= */}
        <div className="sales-header d-flex align-items-center justify-content-between mb-4">
          <div>
            <h2 className="h3 fw-bold mb-1">Daily sales</h2>
            <p className="text-muted small mb-0">
              View, filter and export the transactions and cash movement for the day.
            </p>
          </div>

          <div className="header-actions d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>

            {/* ===== Export Dropdown ===== */}
            <div className="export-wrapper position-relative" ref={exportRef}>
              <Button
                variant="outline-dark"
                onClick={() => setShowExport(!showExport)}
                iconRight={<span className={`ms-1 transition-all ${showExport ? 'rotate-180' : ''}`}>▾</span>}
              >
                Export
              </Button>

              {showExport && (
                <div className="export-dropdown shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden" style={{ minWidth: '150px' }}>
                  <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => setShowExport(false)}>
                    <FileEarmarkPdf size={18} className="text-danger me-2" />
                    <span>PDF</span>
                  </Button>
                  <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => setShowExport(false)}>
                    <FileEarmarkText size={18} className="text-primary me-2" />
                    <span>CSV</span>
                  </Button>
                  <Button variant="ghost" fullWidth className="text-start p-2 rounded-0" onClick={() => setShowExport(false)}>
                    <FileEarmarkExcel size={18} className="text-success me-2" />
                    <span>Excel</span>
                  </Button>
                </div>
              )}
            </div>

            {/* ===== Add New ===== */}
            <Button
              variant="dark"
              pill
              className="px-4"
              onClick={() => setDrawerOpen(true)}
            >
              Add new
            </Button>

          </div>
        </div>

        {/* ================= DATE BAR ================= */}
        <div className="date-bar mb-4">
          <div className="date-pill-container d-inline-flex align-items-center bg-light rounded-pill p-1 gap-1">
            <Button
              variant="ghost"
              className="rounded-circle p-1"
              onClick={handlePrev}
              iconLeft={<span>&#8249;</span>}
            />

            <div className="vr mx-1" style={{ height: '20px', opacity: 0.1 }}></div>

            <Button
              variant="ghost"
              className="px-3 small fw-bold"
              onClick={handleToday}
            >
              Today
            </Button>

            <div className="vr mx-1" style={{ height: '20px', opacity: 0.1 }}></div>

            <span className="date-text px-3 small fw-bold">
              {format(selectedDate, "EEEE d MMM, yyyy")}
            </span>

            <div className="vr mx-1" style={{ height: '20px', opacity: 0.1 }}></div>

            <Button
              variant="ghost"
              className="rounded-circle p-1"
              onClick={handleNext}
              iconLeft={<span>&#8250;</span>}
            />
          </div>
        </div>

        {/* ================= GRID ================= */}
        <div className="sales-grid">
          <TransactionSummary selectedDate={selectedDate} />
          <CashMovementSummary selectedDate={selectedDate} />
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