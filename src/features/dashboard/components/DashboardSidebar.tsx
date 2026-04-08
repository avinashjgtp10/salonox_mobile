import { NavLink, useNavigate } from "react-router-dom";
import {
  House,
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
        to="calendar"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <Calendar size={26} />
        <span className="nav-label">Calendar</span>
      </NavLink>

      <div
        className={menuClass("sales")}
        onClick={() => {
          onMenuChange("sales");
          navigate("/dashboard/sales");
        }}
      >
        <Tag size={26} />
        <span className="nav-label">Sales</span>
      </div>

      <div
        className={menuClass("clients")}
        onClick={() => onMenuChange(openMenu === "clients" ? null : "clients")}
      >
        <EmojiSmile size={26} />
        <span className="nav-label">Clients</span>
      </div>

      <div
        className={menuClass("catalog")}
        onClick={() => onMenuChange(openMenu === "catalog" ? null : "catalog")}
      >
        <Book size={26} />
        <span className="nav-label">Catalog</span>
      </div>

      <div
        className={menuClass("onlineBooking")}
        onClick={() =>
          onMenuChange(openMenu === "onlineBooking" ? null : "onlineBooking")
        }
      >
        <Person size={26} />
        <span className="nav-label">Online booking</span>
      </div>

      <div
        className={menuClass("marketing")}
        onClick={() =>
          onMenuChange(openMenu === "marketing" ? null : "marketing")
        }
      >
        <Megaphone size={26} />
        <span className="nav-label">Marketing</span>
      </div>

      <div
        className={menuClass("team")}
        onClick={() => onMenuChange(openMenu === "team" ? null : "team")}
      >
        <People size={26} />
        <span className="nav-label">Team</span>
      </div>

      <NavLink
        to="analytics"
        className={({ isActive }) => navClass(isActive)}
        onClick={() => onMenuChange(null)}
      >
        <GraphUpArrow size={26} />
        <span className="nav-label">Analytics</span>
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
