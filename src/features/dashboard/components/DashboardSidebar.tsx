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
} from "react-bootstrap-icons";

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

  function navClass(isActive: boolean) {
    return isActive ? "nav-btn route-active" : "nav-btn";
  }

  function menuClass(key: MenuKey) {
    return `nav-btn ${openMenu === key ? "menu-active" : ""}`;
  }

  return (
    <aside className="sidebar">
      <NavLink
        to="/dashboard"
        end
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <House size={26} />
        <span className="nav-label">Home</span>
      </NavLink>

      <NavLink
        to="/dashboard/sales/quick"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <Lightning size={26} />
        <span className="nav-label">Quick Sale</span>
      </NavLink>

      <NavLink
        to="calendar"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <Calendar size={26} />
        <span className="nav-label">Calendar</span>
      </NavLink>

      <button
        type="button"
        className={menuClass("sales")}
        onClick={() => {
          if (openMenu !== "sales") {
            onMenuChange("sales");
            navigate("/dashboard/sales/appointments");
          } else {
            onMenuChange(null);
          }
        }}
      >
        <Tag size={26} />
        <span className="nav-label">Sales</span>
      </button>

      <button
        type="button"
        className={menuClass("clients")}
        onClick={() => {
          if (openMenu !== "clients") {
            onMenuChange("clients");
            navigate("/dashboard/clients/list");
          } else {
            onMenuChange(null);
          }
        }}
      >
        <EmojiSmile size={26} />
        <span className="nav-label">Clients</span>
      </button>

      <button
        type="button"
        className={menuClass("catalog")}
        onClick={() => {
          if (openMenu !== "catalog") {
            onMenuChange("catalog");
            navigate("/dashboard/catalog/services");
          } else {
            onMenuChange(null);
          }
        }}
      >
        <Book size={26} />
        <span className="nav-label">Catalog</span>
      </button>

      <button
        type="button"
        className={menuClass("onlineBooking")}
        onClick={() => {
          if (openMenu !== "onlineBooking") {
            onMenuChange("onlineBooking");
            navigate("/dashboard/online-booking/marketplace");
          } else {
            onMenuChange(null);
          }
        }}
      >
        <Person size={26} />
        <span className="nav-label">Online booking</span>
      </button>

      <button
        type="button"
        className={menuClass("marketing")}
        onClick={() => {
          if (openMenu !== "marketing") {
            onMenuChange("marketing");
            navigate("/dashboard/marketing");
          } else {
            onMenuChange(null);
          }
        }}
      >
        <Megaphone size={26} />
        <span className="nav-label">Marketing</span>
      </button>

      <button
        type="button"
        className={menuClass("team")}
        onClick={() => {
          if (openMenu !== "team") {
            onMenuChange("team");
            navigate("/dashboard/team/members");
          } else {
            onMenuChange(null);
          }
        }}
      >
        <People size={26} />
        <span className="nav-label">Team</span>
      </button>

      <NavLink
        to="analytics"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <GraphUpArrow size={26} />
        <span className="nav-label">Reports</span>
      </NavLink>

      <NavLink
        to="apps"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <Grid3x3Gap size={26} />
        <span className="nav-label">Apps</span>
      </NavLink>

      <div className="nav-spacer" />

      <NavLink
        to="settings"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <Gear size={26} />
        <span className="nav-label">Settings</span>
      </NavLink>

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
