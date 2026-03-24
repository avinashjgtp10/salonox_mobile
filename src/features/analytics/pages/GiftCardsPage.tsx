import { useState, useRef, useEffect } from "react"
import {
  ChevronDown,
  Gift,
  Gear
} from "react-bootstrap-icons";

// UI Components
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import "../styles/GiftCardsPage.scss"

export default function GiftCardsPage() {
  const [showOptions, setShowOptions] = useState(false)
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
    <div className="gift-cards-page container-fluid">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="h4 fw-bold mb-1">Gift cards sold</h3>
          <p className="text-muted small mb-0">
            View, filter and export gift cards purchased by your clients. <a href="#" className="text-primary text-decoration-none">Learn more</a>
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
            <div className="gift-options-menu shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden" style={{ minWidth: '200px' }}>
              <Button variant="ghost" fullWidth className="text-start p-2 rounded-0" onClick={() => setShowOptions(false)}>
                <Gear size={16} className="me-2 text-muted" />
                <span>Gift cards settings</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* EMPTY STATE */}
      <Card className="text-center py-5 border-0 rounded-4 empty-state-card shadow-sm mt-5 flex-grow-1 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '400px' }}>
        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-center mx-auto empty-state-icon" style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '15px', 
            background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' 
          }}>
            <Gift size={30} className="text-white" />
          </div>
        </div>
        <h4 className="fw-bold mb-2 text-dark h5">No results found</h4>
        <p className="text-muted small">You haven't sold any gift cards yet.</p>
      </Card>

    </div>
  )
}
