import { NavLink } from "react-router-dom"
import { ChevronLeft } from "react-bootstrap-icons"

interface Props {
  onClose: () => void
}

export default function MarketingSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar">

      <div className="sub-header">
        <h3>Marketing</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <h4 className="sub-section-title">WhatsApp</h4>

      <NavLink
        to="/dashboard/marketing"
        end
        className={({ isActive }) => `sub-link${isActive ? ' active' : ''}`}
      >
        📊 Dashboard
      </NavLink>

      <NavLink
        to="/dashboard/marketing/templates/create"
        className={({ isActive }) => `sub-link${isActive ? ' active' : ''}`}
      >
        📐 Templates
      </NavLink>

      <NavLink
        to="/dashboard/marketing/campaigns/create"
        className={({ isActive }) => `sub-link${isActive ? ' active' : ''}`}
      >
        📣 Blast Campaigns
      </NavLink>

      

      <NavLink
        to="/dashboard/marketing/webhooks"
        className={({ isActive }) => `sub-link${isActive ? ' active' : ''}`}
      >
        📡 Message Logs
      </NavLink>

      <hr />

      <h4 className="sub-section-title">Configuration</h4>

      <NavLink
        to="/dashboard/marketing/config"
        className={({ isActive }) => `sub-link${isActive ? ' active' : ''}`}
      >
        ⚙️ WhatsApp Config
      </NavLink>

    </div>
  )
}