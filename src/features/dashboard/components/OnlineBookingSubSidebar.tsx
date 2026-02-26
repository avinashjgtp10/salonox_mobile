import { ChevronLeft } from "react-bootstrap-icons"

interface Props {
  onClose: () => void
}

export default function OnlineBookingSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
        <h3>Online booking</h3>
        <button className="close-btn" onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="sub-link">Marketplace profile</div>
      <div className="sub-link">Reserve with Google</div>
      <div className="sub-link">Facebook and Instagram bookings</div>
      <div className="sub-link">Link builder</div>

    </div>
  )
}