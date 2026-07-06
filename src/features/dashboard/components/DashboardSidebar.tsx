import { NavLink, useNavigate } from "react-router-dom";
import {
  House,
  Lightning,
  Calendar,
  Tag,
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
  | "sales"
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
  const navigate = useNavigate();
  const { can } = usePermissions();

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

      {can("view_sales") && can("create_sales") && (
        <button
          type="button"
          className="nav-btn"
          onClick={() => {
            onMenuChange(null);
            navigate("/dashboard/sales/quick");
          }}
        >
          <Lightning size={26} />
          <span className="nav-label">Quick Sale</span>
        </button>
      )}

      {can("view_appointments") && (
        <NavLink
          to="calendar"
          className={({ isActive }) => navClass(isActive)}
          onClick={() => onMenuChange(null)}
        >
          <Calendar size={26} />
          <span className="nav-label">Calendar</span>
        </NavLink>
      )}

      {can("view_sales") && (
        <button
          type="button"
          className={menuClass("sales")}
          onClick={() => {
            onMenuChange("sales");
            navigate("/dashboard/sales");
          }}
        >
          <Tag size={26} />
          <span className="nav-label">Sales</span>
        </button>
      )}

      {can("view_clients") && (
        <button
          type="button"
          className={menuClass("clients")}
          onClick={() => onMenuChange(openMenu === "clients" ? null : "clients")}
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

      {can("view_appointments") && (
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

      {can("view_marketing") && (
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
          onClick={() => onMenuChange(openMenu === "team" ? null : "team")}
        >
          <People size={26} />
          <span className="nav-label">Team</span>
        </button>
      )}

      {can("view_analytics") && (
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

      {can("view_settings") && (
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
