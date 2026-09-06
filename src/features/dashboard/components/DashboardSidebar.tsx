import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
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
  ChatSquareText,
  Stars,
  List,
} from "react-bootstrap-icons";
// Custom icon, not from any installed icon pack — see WarehouseIcon.tsx for
// why (matched to a specific reference design: peaked roof, roof vent, open
// doorway with stacked crates).
import WarehouseIcon from "../../../components/icons/WarehouseIcon";

import { usePermissions } from "../../../hooks/usePermissions";
import Modal from "../../../components/ui/Modal";
import { preloadCashManagementPage, preloadScheduler } from "../../../routes/dashboardPreloaders";
import "../styles/ComingSoonModal.scss";

type MenuKey =
  | "clients"
  | "catalog"
  | "inventory"
  | "onlineBooking"
  | "marketing"
  | "team";

interface Props {
  openMenu: string | null;
  onMenuChange: (menu: MenuKey | null) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function DashboardSidebar({ openMenu, onMenuChange, collapsed, onToggleCollapsed }: Props) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);
  const [showAppsComingSoon, setShowAppsComingSoon] = useState(false);

  // No scrollbar, ever — but labels must stay readable and never disappear,
  // which the old version of this effect didn't guarantee (it shrank label
  // font as low as 7px and hid labels below a 34px item height). This only
  // ever compresses ITEM HEIGHT/SPACING to make everything fit; the label's
  // own font size and visibility are fixed constants in DashboardPage.scss,
  // never touched here. Re-runs whenever the sidebar's own box resizes
  // (viewport/topbar/deployment-banner height changes) or its children
  // change (permissions resolving after mount changes item count).
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const fit = () => {
      const items = Array.from(el.children).filter((c) =>
        c.classList.contains("nav-btn")
      );
      const count = items.length;
      if (count === 0) return;

      const perItem = Math.floor(el.clientHeight / count);
      // Rows are a single line now (icon + label side by side, not stacked),
      // so this floor only needs to keep the icon/label from feeling
      // cramped against the row's own edges — not accommodate a wrapped
      // 2-line label like the old icon-on-top layout did.
      const itemH = Math.max(38, Math.min(48, perItem));
      el.style.setProperty("--nav-item-h", `${itemH}px`);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    const mo = new MutationObserver(fit);
    mo.observe(el, { childList: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  function navClass(isActive: boolean) {
    return isActive ? "nav-btn route-active" : "nav-btn";
  }

  function handleRouteClick(event: MouseEvent<HTMLAnchorElement>, targetPath: string) {
    onMenuChange(null);
    if (location.pathname === targetPath) {
      event.preventDefault();
    }
  }

  function menuClass(key: MenuKey) {
    return `nav-btn ${openMenu === key ? "menu-active" : ""}`;
  }

  // Rendered items vary with permissions, so the item list is read from the
  // DOM at keypress time rather than tracked separately in state/refs.
  function handleSidebarKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const el = sidebarRef.current;
    if (!el) return;

    const items = Array.from(el.querySelectorAll<HTMLElement>(".nav-btn"));
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    event.preventDefault();
    const nextIndex =
      event.key === "ArrowDown"
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <aside className="sidebar" ref={sidebarRef} onKeyDown={handleSidebarKeyDown}>
      <button
        type="button"
        className="nav-btn sidebar-collapse-btn"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <List size={18} />
        <span className="nav-label">{collapsed ? "Expand" : "Collapse"}</span>
      </button>

      {can("view_dashboard") && (
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard")}
        >
          <House size={22} />
          <span className="nav-label">Home</span>
        </NavLink>
      )}

      {can("create_quick_sale") && (
        <NavLink
          to="/dashboard/sales/quick"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/sales/quick")}
        >
          <Lightning size={22} />
          <span className="nav-label">Quick Sale</span>
        </NavLink>
      )}

      {can("view_calendar") && (
        <NavLink
          to="/dashboard/calendar"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/calendar")}
          onMouseEnter={preloadScheduler}
          onFocus={preloadScheduler}
        >
          <Calendar size={22} />
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
          <EmojiSmile size={22} />
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
          <Book size={22} />
          <span className="nav-label">Catalog</span>
        </button>
      )}

      {can("view_inventory") && (
        <button
          type="button"
          className={menuClass("inventory")}
          onClick={() => {
            const opening = openMenu !== "inventory";
            onMenuChange(opening ? "inventory" : null);
            // Same pattern as Clients/Catalog above — jump to the section's
            // default page (Suppliers) when entering it from elsewhere,
            // instead of just opening the flyout submenu over the current page.
            if (opening && !location.pathname.startsWith("/dashboard/inventory")) {
              navigate("/dashboard/inventory/suppliers");
            }
          }}
        >
          <WarehouseIcon size={22} />
          <span className="nav-label">Warehouse</span>
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
          <People size={22} />
          <span className="nav-label">Staff</span>
        </button>
      )}

      <NavLink
        to="/dashboard/cash-management"
        className={({ isActive }) => navClass(isActive)}
        onClick={(event) => handleRouteClick(event, "/dashboard/cash-management")}
        onMouseEnter={preloadCashManagementPage}
        onFocus={preloadCashManagementPage}
      >
        <Cash  size={22} />
        <span className="nav-label">Cash Management</span>
      </NavLink>

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
          <Megaphone size={22} />
          <span className="nav-label">Marketing</span>
        </button>
      )}

      {can("view_booking") && (
        <button
          type="button"
          className={menuClass("onlineBooking")}
          onClick={() => {
            const opening = openMenu !== "onlineBooking";
            onMenuChange(opening ? "onlineBooking" : null);
            // Same pattern as Clients/Catalog/Staff/Marketing — jump to the
            // section's default page when entering from elsewhere instead of
            // only opening the flyout over the current page. The section root's
            // index route is the Marketplace profile (OnlineBookingRoutes.tsx).
            if (opening && !location.pathname.startsWith("/dashboard/online-booking")) {
              navigate("/dashboard/online-booking");
            }
          }}
        >
          <Globe2 size={22} />
          <span className="nav-label">Online booking</span>
        </button>
      )}

      {can("view_enquiries") && (
        <NavLink
          to="/dashboard/enquiries"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/enquiries")}
        >
          <ChatSquareText size={22} />
          <span className="nav-label">Enquiries</span>
        </NavLink>
      )}

      {can("view_reports") && (
        <NavLink
          to="/reports"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/reports")}
        >
          <GraphUpArrow size={22} />
          <span className="nav-label">Reports</span>
        </NavLink>
      )}

      <button
        type="button"
        className={navClass(false)}
        onClick={() => {
          onMenuChange(null);
          setShowAppsComingSoon(true);
        }}
      >
        <Grid3x3Gap size={22} />
        <span className="nav-label">Apps</span>
      </button>

      {can("general_settings") && (
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/settings")}
        >
          <Gear size={22} />
          <span className="nav-label">Settings</span>
        </NavLink>
      )}

      <NavLink
        to="/dashboard/spotlight"
        className={({ isActive }) => navClass(isActive)}
        onClick={(event) => handleRouteClick(event, "/dashboard/spotlight")}
      >
        <Stars size={22} />
        <span className="nav-label">Spotlight</span>
      </NavLink>

      <NavLink
        to="/dashboard/help"
        className={({ isActive }) => navClass(isActive)}
        onClick={(event) => handleRouteClick(event, "/dashboard/help")}
      >
        <QuestionCircle size={22} />
        <span className="nav-label">Help</span>
      </NavLink>

      <Modal show={showAppsComingSoon} onClose={() => setShowAppsComingSoon(false)} size="sm">
        <div className="coming-soon">
          <div className="coming-soon__badge">
            <Stars size={28} />
          </div>
          <h5 className="coming-soon__title">Coming Soon</h5>
          <p className="coming-soon__desc">
            This feature is currently under development and will be available soon.
          </p>
          <button type="button" className="coming-soon__btn" onClick={() => setShowAppsComingSoon(false)}>
            Got it
          </button>
        </div>
      </Modal>
    </aside>
  );
}
