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
  Printer,
  Smartphone,
  MapPin,
  Upload,
} from "lucide-react";
import ProfileSettingsPage from "../pages/ProfileSettingsPage";
import BranchesPage from "../pages/BranchesPage";
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
import PrintSettingsPage from "../pages/PrintSettingsPage";
import DataPrivacyPage from "../pages/DataPrivacyPage";
import BulkBillingImportPage from "../pages/BulkBillingImportPage";
import SettingsHomePage, { type SettingsHomeGroup } from "../pages/SettingsHomePage";
import { usePermissions } from "../../../hooks/usePermissions";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
import NoPermissionPage from "../../../components/guards/NoPermissionPage";
import "../styles/SettingsPage.scss";

interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  Component: React.ComponentType;
  /** Routable and deep-linkable, but not listed on the Settings home grid. */
  hidden?: boolean;
  /** "Add Individual Permissions for All Settings Sections" ticket — gates
   *  whether this card/section can be opened at all. Every section gets its
   *  own key; coupons-manage shares "coupons"'s since it's the same section
   *  reached via a different deep link, not a distinct one. */
  permKey: string;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Account",
    items: [
      { id: "profile",  label: "Profile & Business",  description: "Manage your personal details, profile photo, and your salon's public profile.", icon: <User size={18} />,        Component: ProfileSettingsPage,   permKey: "view_settings_profile" },
      // Not shown on the Settings home grid (see hidden below) — Profile and
      // Business used to be two separate cards/pages; they're now one merged
      // page (ProfileSettingsPage renders both sections). This entry only
      // keeps old deep links (e.g. the GST module's link in
      // SettingsManagementPage.tsx) and anyone whose role only has the
      // "view_settings_business" permission — not "view_settings_profile" —
      // still able to reach the merged page.
      { id: "business", label: "Business",            description: "",                                                                 icon: <Building2 size={18} />,   Component: ProfileSettingsPage,   hidden: true, permKey: "view_settings_business" },
      { id: "account",  label: "Account & Security",  description: "Update your password and manage account security.",               icon: <ShieldCheck size={18} />, Component: AccountSettingsPage,   permKey: "view_settings_account_security" },
      { id: "branches", label: "Business Hours",       description: "Manage your salon's business hours.",       icon: <MapPin size={18} />,      Component: BranchesPage,          permKey: "view_branches" },
    ],
  },
  {
    groupLabel: "Preferences",
    items: [
      { id: "notifications", label: "Notifications",        description: "Choose which alerts and updates you receive.",     icon: <Bell size={18} />,  Component: NotificationsPage,       permKey: "view_settings_notifications" },
      { id: "roles",         label: "Roles & Permissions",  description: "Control what each staff role can see and do.",     icon: <Users size={18} />, Component: RolesPermissionsPage,    permKey: "view_roles" },
    ],
  },
  {
    groupLabel: "Tools",
    items: [
      { id: "integrations", label: "Integrations",   description: "Connect third-party tools and services.",       icon: <Puzzle size={18} />,     Component: IntegrationsPage,          permKey: "view_settings_integrations" },
      { id: "pos-payments", label: "POS / Payment Machine", description: "Connect a payment terminal so invoices can be paid — and marked PAID — directly on the machine.", icon: <Smartphone size={18} />, Component: PaymentMachineSettingsPage, permKey: "view_settings_pos_payments" },
      { id: "billing",      label: "Billing & Plans", description: "View and manage your subscription and billing.", icon: <CreditCard size={18} />, Component: BillingPage,               permKey: "view_settings_billing" },
    ],
  },
  {
    groupLabel: "Configuration",
    items: [
      { id: "currency",     label: "Currency",       description: "Set your business currency and country.",             icon: <CreditCard size={18} />,        Component: CurrencySettingsPage,    permKey: "view_settings_currency" },
      { id: "tax-mapping",  label: "Tax Mapping",    description: "Configure the GST module and manage tax mappings.",   icon: <SlidersHorizontal size={18} />, Component: SettingsManagementPage,  permKey: "view_settings_tax_mapping" },
      { id: "reward-points", label: "Reward Points", description: "Set up client reward points and redemption rules.",   icon: <Gift size={18} />,              Component: RewardsSettingsPage,     permKey: "view_settings_reward_points" },
      { id: "referral",     label: "Refer & Earn",   description: "Configure referral rewards for clients.",             icon: <Share2 size={18} />,            Component: ReferralSettingsPage,    permKey: "view_settings_referral" },
      { id: "coupons",      label: "Coupons",        description: "Create and manage discount coupons.",                 icon: <Tag size={18} />,               Component: CouponsSettingsPage,     permKey: "view_coupons" },
      { id: "print",        label: "Print Settings", description: "Customize invoice and receipt print templates.",      icon: <Printer size={18} />,           Component: PrintSettingsPage,       permKey: "view_settings_print" },
      // Not shown on the Settings home grid (see hidden below) — it's the
      // coupon management list, reached from the designer's "Manage coupons" link.
      // Shares Coupons' own permKey — it's a deep link into the same section,
      // not a distinct one of the 18.
      { id: "coupons-manage", label: "Manage Coupons", description: "", icon: <Tag size={18} />, Component: CouponsSettingsPage, hidden: true, permKey: "view_coupons" },
    ],
  },
  {
    groupLabel: "Migration",
    items: [
      { id: "bulk-billing-import", label: "Bulk Billing Import", description: "Import historical billing records from an Excel or CSV file.", icon: <Upload size={18} />, Component: BulkBillingImportPage, permKey: "view_settings_bulk_billing_import" },
    ],
  },
  {
    groupLabel: "Data",
    items: [
      { id: "data-privacy", label: "Data & Privacy", description: "Manage your data and privacy preferences.", icon: <Database size={18} />, Component: DataPrivacyPage, permKey: "view_settings_data_privacy" },
    ],
  },
];

const allItems: NavItem[] = navGroups.flatMap((g) => g.items);

function sectionIdFromPath(pathname: string): string | null {
  const requested = pathname.split("/").filter(Boolean).pop();
  return requested && allItems.some((i) => i.id === requested) ? requested : null;
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));
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

  // Cards for denied sections stay on the home grid (never hidden) but are
  // greyed out and denyPerm() on click instead of navigating — computed here
  // (not as a module-level constant, since it depends on can()) and passed
  // down to the otherwise permission-unaware SettingsHomePage.
  const homeGroups: SettingsHomeGroup[] = navGroups.map((g) => ({
    groupLabel: g.groupLabel,
    items: g.items.filter((item) => !item.hidden).map((item) => ({
      ...item,
      disabled: !can(item.permKey),
    })),
  }));

  const handleSelect = (id: string) => {
    const item = allItems.find((i) => i.id === id);
    if (item && !can(item.permKey)) { denyPerm(item.permKey); return; }
    navigate(`/dashboard/settings/${id}`);
  };

  const activeItem = activeId ? allItems.find((i) => i.id === activeId) : null;
  const activeAllowed = activeItem ? can(activeItem.permKey) : true;
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
          {ActiveComponent ? (
            activeAllowed ? (
              <ActiveComponent key={activeId} />
            ) : (
              <NoPermissionPage permKey={activeItem!.permKey} />
            )
          ) : (
            <SettingsHomePage groups={homeGroups} onSelect={handleSelect} />
          )}
        </div>
      </div>
    </div>
  );
}
