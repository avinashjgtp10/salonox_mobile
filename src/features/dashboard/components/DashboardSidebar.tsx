import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  House,
  Lightning,
  Calendar,
  EmojiSmile,
  Book,
  Globe2,
  Megaphone,
  People,
  GraphUpArrow,
  Grid3x3Gap,
  Gear,
  QuestionCircle,
  Cash,
} from "react-bootstrap-icons";

import { usePermissions } from "../../../hooks/usePermissions";

type MenuKey =
  | "clients"
  | "catalog"
  | "onlineBooking"
  | "marketing"
  | "team";

interface Props {
  openMenu: string | null;
  onMenuChange: (menu: MenuKey | null) => void;
}

export default function DashboardSidebar({ openMenu, onMenuChange }: Props) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  function navClass(isActive: boolean) {
    return isActive ? "nav-btn route-active" : "nav-btn";
  }

  function menuClass(key: MenuKey) {
    return `nav-btn ${openMenu === key ? "menu-active" : ""}`;
  }

  return (
    <aside className="sidebar">
      {can("view_dashboard") && (
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <House size={26} />
          <span className="nav-label">Home</span>
        </NavLink>
      )}

      {can("create_quick_sale") && (
        <NavLink
          to="/dashboard/sales/quick"
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <Lightning size={26} />
          <span className="nav-label">Quick Sale</span>
        </NavLink>
      )}

      {can("view_calendar") && (
        <NavLink
          to="/dashboard/calendar"
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <Calendar size={26} />
          <span className="nav-label">Calendar</span>
        </NavLink>
      )}

      {can("view_clients") && (
        <button
          type="button"
          className={menuClass("clients")}
          onClick={() => {
            const opening = openMenu !== "clients";
            onMenuChange(opening ? "clients" : null);
            // Same pattern as Team below — jump to the section's default page
            // when entering it from elsewhere (e.g. Calendar). Without this,
            // clicking Clients from another page only opened the flyout
            // submenu and left the underlying page unchanged.
            if (opening && !location.pathname.startsWith("/dashboard/clients")) {
              navigate("/dashboard/clients/list");
            }
          }}
        >
          <EmojiSmile size={26} />
          <span className="nav-label">Clients</span>
        </button>
      )}

      {can("view_catalog") && (
        <button
          type="button"
          className={menuClass("catalog")}
          onClick={() => {
            const opening = openMenu !== "catalog";
            onMenuChange(opening ? "catalog" : null);
            // Same pattern as Clients above — jump to the section's default
            // page (Service menu) when entering it from elsewhere, instead of
            // just opening the flyout submenu and leaving the current page.
            if (opening && !location.pathname.startsWith("/dashboard/catalog")) {
              navigate("/dashboard/catalog/services");
            }
          }}
        >
          <Book size={26} />
          <span className="nav-label">Catalog</span>
        </button>
      )}

      {can("view_booking") && (
        <button
          type="button"
          className={menuClass("onlineBooking")}
          onClick={() =>
            onMenuChange(openMenu === "onlineBooking" ? null : "onlineBooking")
          }
        >
          <Globe2 size={26} />
          <span className="nav-label">Online booking</span>
        </button>
      )}

      {can("view_sales") && (
        <NavLink
          to={{
            pathname: "/dashboard/cash-management",
          }}
          state={{ autoloadCashManagement: Date.now() }}
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <Cash  size={26} />
          <span className="nav-label">Cash Management</span>
        </NavLink>
      )}

      {can("view_campaigns") && (
        <button
          type="button"
          className={menuClass("marketing")}
          onClick={() => {
            const opening = openMenu !== "marketing";
            onMenuChange(opening ? "marketing" : null);
            // Same pattern as Clients/Catalog/Staff above — jump to the
            // section's default page when entering it from elsewhere. Without
            // this, clicking Marketing only opened the flyout submenu and left
            // whatever page you were on underneath it. Targets the section
            // root, whose index route is the Marketing dashboard (see
            // MarketingRoutes.tsx); a salon that hasn't finished WhatsApp
            // setup still lands on onboarding from there, which is intended.
            if (opening && !location.pathname.startsWith("/dashboard/marketing")) {
              navigate("/dashboard/marketing");
            }
          }}
        >
          <Megaphone size={26} />
          <span className="nav-label">Marketing</span>
        </button>
      )}

      {can("view_team") && (
        <button
          type="button"
          className={menuClass("team")}
          onClick={() => {
            const opening = openMenu !== "team";
            onMenuChange(opening ? "team" : null);
            // Only jump to the default Team page when entering the section
            // from elsewhere (e.g. Calendar) — re-toggling the flyout while
            // already on a Team page (Attendance, Commissions, …) shouldn't
            // reset navigation back to Team members.
            if (opening && !location.pathname.startsWith("/dashboard/team")) {
              navigate("/dashboard/team/members");
            }
          }}
        >
          <People size={26} />
          <span className="nav-label">Staff</span>
        </button>
      )}

      {can("view_reports") && (
        <NavLink
          to="/reports"
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <GraphUpArrow size={26} />
          <span className="nav-label">Reports</span>
        </NavLink>
      )}

      <NavLink
        to="/dashboard/apps"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <Grid3x3Gap size={26} />
        <span className="nav-label">Apps</span>
      </NavLink>

      <div className="nav-spacer" />

      {can("general_settings") && (
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <Gear size={26} />
          <span className="nav-label">Settings</span>
        </NavLink>
      )}

      <NavLink
        to="/dashboard/help"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <QuestionCircle size={26} />
        <span className="nav-label">Help</span>
      </NavLink>
    </aside>
  );
}
