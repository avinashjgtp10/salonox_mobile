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
} from "react-bootstrap-icons";
// Custom icon, not from any installed icon pack — see WarehouseIcon.tsx for
// why (matched to a specific reference design: peaked roof, roof vent, open
// doorway with stacked crates).
import WarehouseIcon from "../../../components/icons/WarehouseIcon";

import { usePlanFeatures } from "../../../hooks/usePlanFeatures";
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

// Route prefix each flyout section owns — the same strings each button's
// onClick already uses to decide whether to jump to the section's default
// page. Reused here so the main-nav highlight is driven by isActive (current
// route) rather than isSubmenuOpen (openMenu) alone — closing the sub-side
// panel while still on, say, a Clients page must not clear the highlight.
const SECTION_ROUTE_PREFIX: Record<MenuKey, string> = {
  clients: "/dashboard/clients",
  catalog: "/dashboard/catalog",
  inventory: "/dashboard/inventory",
  onlineBooking: "/dashboard/online-booking",
  marketing: "/dashboard/marketing",
  team: "/dashboard/team",
};

interface Props {
  openMenu: string | null;
  onMenuChange: (menu: MenuKey | null) => void;
}

export default function DashboardSidebar({ openMenu, onMenuChange }: Props) {
  const { hasFeature } = usePlanFeatures();
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

  // isActive (current route belongs to this section) and isSubmenuOpen
  // (openMenu === key) are deliberately independent — either one alone is
  // enough to highlight the button, but closing the panel (isSubmenuOpen
  // going false) must never clear a highlight that isActive still justifies.
  function menuClass(key: MenuKey) {
    const isActive = location.pathname.startsWith(SECTION_ROUTE_PREFIX[key]);
    const isSubmenuOpen = openMenu === key;
    return `nav-btn ${isActive || isSubmenuOpen ? "menu-active" : ""}`;
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
      {/* Every nav item below renders regardless of staff PERMISSION —
          hiding a section from navigation isn't a security boundary (the
          route is still reachable by URL) and just makes it harder for
          staff to understand what they can't do; PermissionGuard's in-page
          "Access Denied" handles that axis instead. hasFeature(...) is a
          DIFFERENT axis (the salon's own plan tier, not staff permissions —
          see usePlanFeatures.ts) and IS still checked here: a feature the
          salon's plan doesn't include should never appear in navigation at
          all, matching PlanFeatureGuard on the route side. */}
      {hasFeature("dashboard") && (
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard")}
          title="Home"
        >
          <House size={22} />
          <span className="nav-label">Home</span>
        </NavLink>
      )}

      {hasFeature("quick_sale") && (
        <NavLink
          to="/dashboard/sales/quick"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/sales/quick")}
          title="Quick Sale"
        >
          <Lightning size={22} />
          <span className="nav-label">Quick Sale</span>
        </NavLink>
      )}

      {hasFeature("calendar") && (
        <NavLink
          to="/dashboard/calendar"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/calendar")}
          onMouseEnter={preloadScheduler}
          onFocus={preloadScheduler}
          title="Calendar"
        >
          <Calendar size={22} />
          <span className="nav-label">Calendar</span>
        </NavLink>
      )}

      {hasFeature("clients") && (
        <button
          type="button"
          className={menuClass("clients")}
          title="Clients"
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

      {(hasFeature("services") || hasFeature("products") || hasFeature("packages") || hasFeature("memberships")) && (
        <button
          type="button"
          className={menuClass("catalog")}
          title="Catalog"
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

      {hasFeature("inventory") && (
        <button
          type="button"
          className={menuClass("inventory")}
          title="Warehouse"
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

      {(hasFeature("staff") || hasFeature("payroll")) && (
        <button
          type="button"
          className={menuClass("team")}
          title="Staff"
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

      {hasFeature("cash_management") && (
        <NavLink
          to="/dashboard/cash-management"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/cash-management")}
          onMouseEnter={preloadCashManagementPage}
          onFocus={preloadCashManagementPage}
          title="Cash Management"
        >
          <Cash  size={22} />
          <span className="nav-label">Cash Management</span>
        </NavLink>
      )}

      {/* Whole Marketing section gated on featureKey "marketing" — previously
          only the Campaigns route inside it was gated server-side (see
          campaigns.routes.ts), leaving the nav entry and the rest of the
          section (dashboard/inbox/templates) visible even without the
          feature. */}
      {hasFeature("marketing") && (
        <button
          type="button"
          className={menuClass("marketing")}
          title="Marketing"
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

      {hasFeature("online_booking") && (
        <button
          type="button"
          className={menuClass("onlineBooking")}
          title="Online booking"
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

      {hasFeature("enquiries") && (
        <NavLink
          to="/dashboard/enquiries"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/dashboard/enquiries")}
          title="Enquiries"
        >
          <ChatSquareText size={22} />
          <span className="nav-label">Enquiries</span>
        </NavLink>
      )}

      {hasFeature("reports") && (
        <NavLink
          to="/reports"
          className={({ isActive }) => navClass(isActive)}
          onClick={(event) => handleRouteClick(event, "/reports")}
          title="Reports"
        >
          <GraphUpArrow size={22} />
          <span className="nav-label">Reports</span>
        </NavLink>
      )}

      <button
        type="button"
        className={navClass(false)}
        title="Apps"
        onClick={() => {
          onMenuChange(null);
          setShowAppsComingSoon(true);
        }}
      >
        <Grid3x3Gap size={22} />
        <span className="nav-label">Apps</span>
      </button>

      <NavLink
        to="/dashboard/settings"
        className={({ isActive }) => navClass(isActive)}
        onClick={(event) => handleRouteClick(event, "/dashboard/settings")}
        title="Settings"
      >
        <Gear size={22} />
        <span className="nav-label">Settings</span>
      </NavLink>

      <NavLink
        to="/dashboard/spotlight"
        className={({ isActive }) => navClass(isActive)}
        onClick={(event) => handleRouteClick(event, "/dashboard/spotlight")}
        title="Spotlight"
      >
        <Stars size={22} />
        <span className="nav-label">Spotlight</span>
      </NavLink>

      <NavLink
        to="/dashboard/help"
        className={({ isActive }) => navClass(isActive)}
        onClick={(event) => handleRouteClick(event, "/dashboard/help")}
        title="Help"
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
