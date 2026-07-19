import { NavLink } from "react-router-dom";
import { ChevronLeft } from "react-bootstrap-icons";

interface Props { onClose: () => void; }

export default function MarketingSubSidebar({ onClose }: Props) {
  return (
    <div className="sub-sidebar sub-sidebar--marketing">
      <div className="sub-header">
        <h3>Marketing</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        <div className="sub-category">WhatsApp</div>

        <NavLink to="/dashboard/marketing" end className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-layout-dashboard" aria-hidden="true" /> Dashboard
        </NavLink>

        <NavLink to="/dashboard/marketing/analytics" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-chart-bar" aria-hidden="true" /> Analytics
        </NavLink>

        <NavLink to="/dashboard/marketing/templates" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-template" aria-hidden="true" /> Templates
        </NavLink>

        <NavLink to="/dashboard/marketing/campaigns/create" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-send" aria-hidden="true" /> Blast Campaigns
        </NavLink>
        <NavLink to="/dashboard/marketing/campaigns/history" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-history" aria-hidden="true" /> Campaign History
        </NavLink>
        <NavLink to="/dashboard/marketing/inbox" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-message-circle" aria-hidden="true" /> Inbox
        </NavLink>
        <NavLink to="/dashboard/marketing/quick-whatsapp" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-brand-whatsapp" aria-hidden="true" /> Quick WhatsApp
        </NavLink>
        <NavLink to="/dashboard/marketing/webhooks" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-activity" aria-hidden="true" /> Message Logs
        </NavLink>

        <hr className="sub-divider" />
        <div className="sub-category">Automation</div>

        <NavLink to="/dashboard/marketing/wa-automation" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-robot" aria-hidden="true" /> WA Automation
        </NavLink>

        <hr className="sub-divider" />
        <div className="sub-category">Configuration</div>

        <NavLink to="/dashboard/marketing/config" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-settings" aria-hidden="true" /> WhatsApp Config
        </NavLink>
      </div>
    </div>
  );
}