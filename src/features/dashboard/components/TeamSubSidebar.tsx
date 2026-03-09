import { ChevronLeft } from "react-bootstrap-icons"

interface Props {
  onClose: () => void
}

export default function TeamSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
  <h3>Team</h3>

  <button className="floating-close" onClick={onClose}>
    <ChevronLeft size={16} />
  </button>
</div>

      <div className="sub-link">Team members</div>
      <div className="sub-link">Scheduled shifts</div>
      <div className="sub-link dot">Timesheets</div>
      <div className="sub-link dot">Pay runs</div>

    </div>
  )
}