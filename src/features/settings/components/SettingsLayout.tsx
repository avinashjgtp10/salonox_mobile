import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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
  PackageIcon,
  Printer,
  Smartphone,
} from "lucide-react";
import ProfileSettingsPage from "../pages/ProfileSettingsPage";
import BusinessSettingsPage from "../pages/BusinessSettingsPage";
import AccountSettingsPage from "../pages/AccountSettingsPage";
import NotificationsPage from "../pages/NotificationsPage";
import RolesPermissionsPage from "../pages/RolesPermissionsPage";
import IntegrationsPage from "../pages/IntegrationsPage";
import PaymentMachineSettingsPage from "../pages/PaymentMachineSettingsPage";
import BillingPage from "../pages/BillingPage";
import CurrencySettingsPage from "../pages/CurrencySettingsPage";
import SettingsManagementPage from "../pages/SettingsManagementPage";
import RewardsSettingsPage from "../pages/RewardsSettingsPage";
import ReferralSettingsPage from "../pages/ReferralSettingsPage";
import CouponsSettingsPage from "../pages/CouponsSettingsPage";
import PackageSettingsPage from "../pages/PackageSettingsPage";
import PrintSettingsPage from "../pages/PrintSettingsPage";
import DataPrivacyPage from "../pages/DataPrivacyPage";
import SettingsHomePage, { type SettingsHomeGroup } from "../pages/SettingsHomePage";
import "../styles/SettingsPage.scss";

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  Component: React.ComponentType;
  /** Routable and deep-linkable, but not listed on the Settings home grid. */
  hidden?: boolean;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Account",
    items: [
      { id: "profile",  label: "Profile",             description: "Manage your personal details and profile photo.",                icon: <User size={18} />,        Component: ProfileSettingsPage },
      { id: "business", label: "Business",            description: "Manage your salon's public profile, contact info, and hours.",    icon: <Building2 size={18} />,   Component: BusinessSettingsPage },
      { id: "account",  label: "Account & Security",  description: "Update your password and manage account security.",               icon: <ShieldCheck size={18} />, Component: AccountSettingsPage },
    ],
  },
  {
    groupLabel: "Preferences",
    items: [
      { id: "notifications", label: "Notifications",        description: "Choose which alerts and updates you receive.",     icon: <Bell size={18} />,  Component: NotificationsPage },
      { id: "roles",         label: "Roles & Permissions",  description: "Control what each staff role can see and do.",     icon: <Users size={18} />, Component: RolesPermissionsPage },
    ],
  },
  {
    groupLabel: "Tools",
    items: [
      { id: "integrations", label: "Integrations",   description: "Connect third-party tools and services.",       icon: <Puzzle size={18} />,     Component: IntegrationsPage },
      { id: "pos-payments", label: "POS / Payment Machine", description: "Connect a payment terminal so invoices can be paid — and marked PAID — directly on the machine.", icon: <Smartphone size={18} />, Component: PaymentMachineSettingsPage },
      { id: "billing",      label: "Billing & Plans", description: "View and manage your subscription and billing.", icon: <CreditCard size={18} />, Component: BillingPage },
    ],
  },
  {
    groupLabel: "Configuration",
    items: [
      { id: "currency",     label: "Currency",       description: "Set your business currency and country.",             icon: <CreditCard size={18} />,        Component: CurrencySettingsPage },
      { id: "tax-mapping",  label: "Tax Mapping",    description: "Configure the GST module and manage tax mappings.",   icon: <SlidersHorizontal size={18} />, Component: SettingsManagementPage },
      { id: "reward-points", label: "Reward Points", description: "Set up client reward points and redemption rules.",   icon: <Gift size={18} />,              Component: RewardsSettingsPage },
      { id: "referral",     label: "Refer & Earn",   description: "Configure referral rewards for clients.",             icon: <Share2 size={18} />,            Component: ReferralSettingsPage },
      { id: "coupons",      label: "Coupons",        description: "Create and manage discount coupons.",                 icon: <Tag size={18} />,               Component: CouponsSettingsPage },
      { id: "packages",     label: "Packages",       description: "Configure service package settings.",                 icon: <PackageIcon size={18} />,       Component: PackageSettingsPage },
      { id: "print",        label: "Print Settings", description: "Customize invoice and receipt print templates.",      icon: <Printer size={18} />,           Component: PrintSettingsPage },
      // Not shown on the Settings home grid (see hidden below) — it's the
      // coupon management list, reached from the designer's "Manage coupons" link.
      { id: "coupons-manage", label: "Manage Coupons", description: "", icon: <Tag size={18} />, Component: CouponsSettingsPage, hidden: true },
    ],
  },
  {
    groupLabel: "Data",
    items: [
      { id: "data-privacy", label: "Data & Privacy", description: "Manage your data and privacy preferences.", icon: <Database size={18} />, Component: DataPrivacyPage },
    ],
  },
];

const allItems: NavItem[] = navGroups.flatMap((g) => g.items);
const homeGroups: SettingsHomeGroup[] = navGroups.map((g) => ({
  groupLabel: g.groupLabel,
  items: g.items.filter((item) => !item.hidden),
}));

function sectionIdFromPath(pathname: string): string | null {
  const requested = pathname.split("/").filter(Boolean).pop();
  return requested && allItems.some((i) => i.id === requested) ? requested : null;
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  // null = show the Settings home grid; otherwise the active section's id.
  const [activeId, setActiveId] = useState<string | null>(() => sectionIdFromPath(location.pathname));

  // Keep activeId in sync with the URL for browser back/forward and any
  // in-app link that navigates straight to a section (e.g. cross-links
  // between sections), not just a card click on the home grid.
  useEffect(() => {
    setActiveId(sectionIdFromPath(location.pathname));
  }, [location.pathname]);

  // Only one section is ever mounted at a time, so switching sections always
  // means starting that section scrolled to its own top.
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeId]);

  const handleSelect = (id: string) => {
    navigate(`/dashboard/settings/${id}`);
  };

  const activeItem = activeId ? allItems.find((i) => i.id === activeId) : null;
  const ActiveComponent = activeItem?.Component;

  return (
    <div className="settings-wrapper">
      {/* Page-level header — a normal, non-scrolling flex child of
          .settings-wrapper (see SettingsPage.scss). It physically cannot
          move on scroll since only .settings-content has a scrollbar. */}
      <div className="settings-sticky-header d-flex align-items-center gap-2">
        {activeItem ? (
          <button type="button" className="settings-back-link" onClick={() => navigate("/dashboard/settings")}>
            <ArrowLeft size={16} /> Settings
          </button>
        ) : (
          <>
            <Settings size={20} color="#111827" />
            <h1 className="settings-heading">Settings</h1>
          </>
        )}
      </div>

      <div className="settings-root settings-root--full">
        <div className="settings-content" ref={contentRef}>
          {ActiveComponent ? <ActiveComponent key={activeId} /> : <SettingsHomePage groups={homeGroups} onSelect={handleSelect} />}
        </div>
      </div>
    </div>
  );
}
