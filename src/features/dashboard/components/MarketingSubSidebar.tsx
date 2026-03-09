import { ChevronLeft } from "react-bootstrap-icons"

interface Props {
  onClose: () => void
}

export default function MarketingSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
  <h3>Messaging</h3>

  <button className="floating-close" onClick={onClose}>
    <ChevronLeft size={16} />
  </button>
</div>

      <div className="sub-link">Blast campaigns</div>
      <div className="sub-link">Automations</div>
      <div className="sub-link">Messages history</div>

      <hr />

      <h4 className="sub-section-title">Promotion</h4>
      <div className="sub-link">Deals</div>
      <div className="sub-link">Smart pricing</div>

      <hr />

      <h4 className="sub-section-title">Engage</h4>
      <div className="sub-link">Reviews</div>

    </div>
  )
}