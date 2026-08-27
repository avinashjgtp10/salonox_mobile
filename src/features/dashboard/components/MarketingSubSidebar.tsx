import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft } from "react-bootstrap-icons";

interface Props { onClose: () => void; }

// Grouped by what a new user is trying to DO, not by internal architecture.
export default function MarketingSubSidebar({ onClose }: Props) {
  // Campaigns now covers two routes (create/history) merged into one page
  // with tabs — NavLink's own prefix match only covers "create", so this
  // link's active state is derived manually to also stay lit on "history".
  const { pathname } = useLocation();
  const campaignsActive = pathname.startsWith("/dashboard/marketing/campaigns");

  return (
    <div className="sub-sidebar sub-sidebar--marketing">
      <div className="sub-header">
        <h3>Marketing</h3>
        <button className="floating-close" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="sub-sidebar-body">
        <div className="sub-category">Overview</div>

        <NavLink to="/dashboard/marketing" end className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-layout-dashboard" aria-hidden="true" /> Dashboard
        </NavLink>
        <NavLink to="/dashboard/marketing/analytics" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-chart-bar" aria-hidden="true" /> Analytics
        </NavLink>

        <hr className="sub-divider" />
        <div className="sub-category">Campaigns</div>

        <NavLink to="/dashboard/marketing/campaigns/create" className={`sub-link${campaignsActive ? " active" : ""}`}>
          <i className="ti ti-send" aria-hidden="true" /> Campaigns
        </NavLink>
        <NavLink to="/dashboard/marketing/templates" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-template" aria-hidden="true" /> Templates
        </NavLink>

        <hr className="sub-divider" />
        <div className="sub-category">Conversations</div>

        <NavLink to="/dashboard/marketing/inbox" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-message-circle" aria-hidden="true" /> Inbox
        </NavLink>

        <hr className="sub-divider" />
        <div className="sub-category">Setup</div>

        <NavLink to="/dashboard/marketing/config" className={({ isActive }) => `sub-link${isActive ? " active" : ""}`}>
          <i className="ti ti-settings" aria-hidden="true" /> WhatsApp Config
        </NavLink>
      </div>
    </div>
  );
}
