import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { format, addDays, subDays, parseISO } from "date-fns"
import "../styles/DailySalesPage.scss"
import {
  FileEarmarkPdf,
  FileEarmarkText,
  FileEarmarkExcel
} from "react-bootstrap-icons"
import TransactionSummary from "../components/TransactionSummary"
import CashMovementSummary from "../components/CashMovementSummary"
import QuickSaleDrawer from "../components/QuickSaleDrawer"

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
        <div className="sales-header">
          <div>
            <h2>Daily sales</h2>
            <p>
              View, filter and export the transactions and cash movement for the day.
            </p>
          </div>

          <div className="header-actions">

            {/* ===== Export Dropdown ===== */}
            <div className="export-wrapper" ref={exportRef}>
              <button
                className="export-btn"
                onClick={() => setShowExport(!showExport)}
              >
                Export
                <span className={`arrow ${showExport ? "rotate" : ""}`}>
                  ▾
                </span>
              </button>

              {showExport && (
                <div className="export-dropdown">

                  <div className="export-item">
                    <FileEarmarkPdf size={18} className="export-icon pdf" />
                    <span>PDF</span>
                  </div>

                  <div className="export-item">
                    <FileEarmarkText size={18} className="export-icon csv" />
                    <span>CSV</span>
                  </div>

                  <div className="export-item">
                    <FileEarmarkExcel size={18} className="export-icon xls" />
                    <span>Excel</span>
                  </div>

                </div>
              )}
            </div>

            {/* ===== Add New ===== */}
            <button
              className="add-btn"
              onClick={() => setDrawerOpen(true)}
            >
              Add new
            </button>

          </div>
        </div>

        {/* ================= DATE BAR ================= */}
        <div className="date-bar">
          <div className="date-pill-container">

            <button className="date-arrow" onClick={handlePrev}>
              &#8249;
            </button>

            <div className="date-divider"></div>

            <button className="today-btn" onClick={handleToday}>
              Today
            </button>

            <div className="date-divider"></div>

            <span className="date-text">
              {format(selectedDate, "EEEE d MMM, yyyy")}
            </span>

            <div className="date-divider"></div>

            <button className="date-arrow" onClick={handleNext}>
              &#8250;
            </button>

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