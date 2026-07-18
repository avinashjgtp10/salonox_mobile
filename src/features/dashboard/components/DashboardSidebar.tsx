import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  House,
  Lightning,
  Calendar,
  EmojiSmile,
  Book,
  Person,
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
          to="calendar"
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
          onClick={() => onMenuChange(openMenu === "catalog" ? null : "catalog")}
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
          <Person size={26} />
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
          onClick={() =>
            onMenuChange(openMenu === "marketing" ? null : "marketing")
          }
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
          <span className="nav-label">Team</span>
        </button>
      )}

      {can("view_reports") && (
        <NavLink
          to="analytics"
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <GraphUpArrow size={26} />
          <span className="nav-label">Reports</span>
        </NavLink>
      )}

      <NavLink
        to="apps"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <Grid3x3Gap size={26} />
        <span className="nav-label">Apps</span>
      </NavLink>

      <div className="nav-spacer" />

      {can("general_settings") && (
        <NavLink
          to="settings"
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <Gear size={26} />
          <span className="nav-label">Settings</span>
        </NavLink>
      )}

      <NavLink
        to="help"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <QuestionCircle size={26} />
        <span className="nav-label">Help</span>
      </NavLink>
    </aside>
  );
}
