import { useState, useRef, useEffect } from "react"
import {
  ChevronDown,
  ArrowRepeat
} from "react-bootstrap-icons"
import QuickSaleDrawer from "../components/QuickSaleDrawer"
import "../styles/MembershipsPage.scss"

export default function MembershipsPage() {
  const [showOptions, setShowOptions] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)

  // Close overlays on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
  }, [])

  return (
    <div className="memberships-page container-fluid">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-semibold mb-1">Memberships sold</h3>
          <p className="text-muted small mb-0">
            View and filter memberships purchased by your clients. <a href="#" className="text-primary text-decoration-none">Learn more</a>
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
            <div className="membership-options-menu">
              <div className="dropdown-item d-flex align-items-center">
                <span>Export to CSV</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EMPTY STATE */}
      <div className="card text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-5 d-flex align-items-center justify-content-center flex-grow-1" style={{ minHeight: '400px' }}>
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-center mx-auto empty-state-icon" style={{
            width: '60px',
            height: '60px',
            borderRadius: '15px',
            background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)'
          }}>
            <ArrowRepeat size={30} className="text-white" />
          </div>
        </div>
        <h4 className="fw-bold mb-3 text-dark">No membership sales yet</h4>
        <div className="mt-2">
          <button
            className="btn btn-outline-secondary rounded-pill fw-semibold px-4"
            onClick={() => setDrawerOpen(true)}
          >
            Create new sale
          </button>
        </div>
      </div>

      <QuickSaleDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
