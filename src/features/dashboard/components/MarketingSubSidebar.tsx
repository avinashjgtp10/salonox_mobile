import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft } from "react-bootstrap-icons";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";

interface Props { onClose: () => void; }

// Grouped by what a new user is trying to DO, not by internal architecture.
export default function MarketingSubSidebar({ onClose }: Props) {
  // Campaigns now covers two routes (create/history) merged into one page
  // with tabs — NavLink's own prefix match only covers "create", so this
  // link's active state is derived manually to also stay lit on "history".
  const { pathname } = useLocation();
  const campaignsActive = pathname.startsWith("/dashboard/marketing/campaigns");
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

  const link = (
    to: string,
    permKey: string,
    icon: string,
    label: string,
    isActiveOverride?: boolean,
  ) => {
    const allowed = can(permKey);
    if (allowed) {
      return (
        <NavLink
          to={to}
          end={to === "/dashboard/marketing"}
          className={
            isActiveOverride !== undefined
              ? `sub-link${isActiveOverride ? " active" : ""}`
              : ({ isActive }) => `sub-link${isActive ? " active" : ""}`
          }
        >
          <i className={`ti ${icon}`} aria-hidden="true" /> {label}
        </NavLink>
      );
    }
    return (
      <button
        type="button"
        className="sub-link"
        style={{ opacity: 0.5, cursor: "not-allowed", background: "none", border: "none", textAlign: "left" }}
        onClick={() => denyPerm(permKey)}
      >
        <i className={`ti ${icon}`} aria-hidden="true" /> {label}
      </button>
    );
  };

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

        {link("/dashboard/marketing", "view_marketing_dashboard", "ti-layout-dashboard", "Dashboard")}
        {link("/dashboard/marketing/analytics", "view_marketing_analytics", "ti-chart-bar", "Analytics")}

        <hr className="sub-divider" />
        <div className="sub-category">Campaigns</div>

        {link("/dashboard/marketing/campaigns/history", "view_campaigns", "ti-send", "Campaigns", campaignsActive)}
        {link("/dashboard/marketing/templates", "view_templates", "ti-template", "Templates")}
        {link("/dashboard/marketing/scheduled-templates", "view_scheduled_templates", "ti-calendar-time", "Scheduled Templates")}

        <hr className="sub-divider" />
        <div className="sub-category">Conversations</div>

        {link("/dashboard/marketing/inbox", "view_inbox", "ti-message-circle", "Inbox")}

        <hr className="sub-divider" />
        <div className="sub-category">Setup</div>

        {link("/dashboard/marketing/message-settings", "view_templates", "ti-adjustments", "Message Settings")}
        {link("/dashboard/marketing/config", "view_whatsapp_config", "ti-settings", "WhatsApp Config")}
      </div>
    </div>
  );
}
