import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  User,
  Building2,
  ShieldCheck,
  Bell,
  Users,
  Puzzle,
  CreditCard,
  Database,
  Settings,
  SlidersHorizontal,
  Gift,
  Share2,
  Tag,
} from "lucide-react";
import ProfileSettingsPage from "../pages/ProfileSettingsPage";
import BusinessSettingsPage from "../pages/BusinessSettingsPage";
import AccountSettingsPage from "../pages/AccountSettingsPage";
import NotificationsPage from "../pages/NotificationsPage";
import RolesPermissionsPage from "../pages/RolesPermissionsPage";
import IntegrationsPage from "../pages/IntegrationsPage";
import BillingPage from "../pages/BillingPage";
import CurrencySettingsPage from "../pages/CurrencySettingsPage";
import SettingsManagementPage from "../pages/SettingsManagementPage";
import RewardsSettingsPage from "../pages/RewardsSettingsPage";
import ReferralSettingsPage from "../pages/ReferralSettingsPage";
import CouponsSettingsPage from "../pages/CouponsSettingsPage";
import DataPrivacyPage from "../pages/DataPrivacyPage";
import "../styles/SettingsPage.scss";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  Component: React.ComponentType;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Account",
    items: [
      { id: "profile",  label: "Profile",             icon: <User size={15} />,        Component: ProfileSettingsPage },
      { id: "business", label: "Business",            icon: <Building2 size={15} />,   Component: BusinessSettingsPage },
      { id: "account",  label: "Account & Security",  icon: <ShieldCheck size={15} />, Component: AccountSettingsPage },
    ],
  },
  {
    groupLabel: "Preferences",
    items: [
      { id: "notifications", label: "Notifications",        icon: <Bell size={15} />,  Component: NotificationsPage },
      { id: "roles",         label: "Roles & Permissions",  icon: <Users size={15} />, Component: RolesPermissionsPage },
    ],
  },
  {
    groupLabel: "Tools",
    items: [
      { id: "integrations", label: "Integrations",  icon: <Puzzle size={15} />,     Component: IntegrationsPage },
      { id: "billing",      label: "Billing & Plans", icon: <CreditCard size={15} />, Component: BillingPage },
    ],
  },
  {
    groupLabel: "Configuration",
    items: [
      { id: "currency",     label: "Currency",       icon: <CreditCard size={15} />,        Component: CurrencySettingsPage },
      { id: "tax-mapping",  label: "Tax Mapping",    icon: <SlidersHorizontal size={15} />, Component: SettingsManagementPage },
      { id: "reward-points", label: "Reward Points", icon: <Gift size={15} />,              Component: RewardsSettingsPage },
      { id: "referral",     label: "Refer & Earn",   icon: <Share2 size={15} />,            Component: ReferralSettingsPage },
      { id: "coupons",      label: "Coupons",        icon: <Tag size={15} />,               Component: CouponsSettingsPage },
    ],
  },
  {
    groupLabel: "Data",
    items: [
      { id: "data-privacy", label: "Data & Privacy", icon: <Database size={15} />, Component: DataPrivacyPage },
    ],
  },
];

const allItems: NavItem[] = navGroups.flatMap((g) => g.items);
const DEFAULT_ID = allItems[0]?.id ?? "";

function sectionIdFromPath(pathname: string): string | null {
  const requested = pathname.split("/").filter(Boolean).pop();
  return requested && allItems.some((i) => i.id === requested) ? requested : null;
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(() => sectionIdFromPath(location.pathname) ?? DEFAULT_ID);

  // Keep activeId in sync with the URL for browser back/forward and any
  // in-app link that navigates straight to a section (e.g. cross-links
  // between sections), not just sidebar clicks.
  useEffect(() => {
    const match = sectionIdFromPath(location.pathname);
    if (match && match !== activeId) setActiveId(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Only one section is ever mounted at a time, so switching sections always
  // means starting that section scrolled to its own top.
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeId]);

  const handleNavClick = (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
    navigate(`/dashboard/settings/${id}`, { replace: true });
  };

  const ActiveComponent = allItems.find((i) => i.id === activeId)?.Component ?? allItems[0].Component;

  return (
    <div className="settings-wrapper">
      {/* Page-level header — a normal, non-scrolling flex child of
          .settings-wrapper (see SettingsPage.scss). It physically cannot
          move on scroll since only .settings-content has a scrollbar. */}
      <div className="settings-sticky-header d-flex align-items-center gap-2">
        <Settings size={20} color="#111827" />
        <h1 className="settings-heading">Settings</h1>
      </div>

      <div className="settings-root">
        {/* ── Left Nav ── */}
        <nav className="settings-nav">
          {navGroups.map((group, gi) => (
            <div className="settings-nav-group" key={gi}>
              <p className="settings-nav-label">{group.groupLabel}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-nav-item ${activeId === item.id ? "active" : ""}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <span className="settings-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
              {gi < navGroups.length - 1 && (
                <hr className="settings-nav-divider" />
              )}
            </div>
          ))}
        </nav>

        {/* ── Right Content — only the active section is rendered, and it's
            the only thing that scrolls. Keyed by id so switching sections
            unmounts the old one instead of leaving its state/scroll behind. ── */}
        <div className="settings-content" ref={contentRef}>
          <ActiveComponent key={activeId} />
        </div>
      </div>
    </div>
  );
}
