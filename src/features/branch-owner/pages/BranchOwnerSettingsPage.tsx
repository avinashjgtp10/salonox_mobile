import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, User, ShieldCheck, Bell, Sliders, Building2, Database, Settings, CreditCard } from "lucide-react";
import SettingsHomePage, { type SettingsHomeGroup } from "../../settings/pages/SettingsHomePage";
import BranchOwnerProfileSection from "../settings/ProfileSection";
import BranchOwnerAccountSecuritySection from "../settings/AccountSecuritySection";
import BranchOwnerNotificationsSection from "../settings/NotificationsSection";
import BranchOwnerPreferencesSection from "../settings/PreferencesSection";
import BranchOwnerSubscriptionSection from "../settings/SubscriptionSection";
import BranchOwnerBranchManagementSection from "../settings/BranchManagementSection";
import BranchOwnerDataPrivacySection from "../settings/DataPrivacySection";
import "../../settings/styles/SettingsPage.scss";
import "../styles/BranchOwnerSettings.scss";

interface NavItem {
  id: string;
  label: string;
  description: string;
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
      { id: "profile", label: "Profile", description: "Manage your personal details and profile photo.", icon: <User size={18} />, Component: BranchOwnerProfileSection },
      { id: "account", label: "Account & Security", description: "Change your password and manage sessions.", icon: <ShieldCheck size={18} />, Component: BranchOwnerAccountSecuritySection },
    ],
  },
  {
    groupLabel: "Preferences",
    items: [
      { id: "notifications", label: "Notifications", description: "Choose which alerts and updates you receive.", icon: <Bell size={18} />, Component: BranchOwnerNotificationsSection },
      { id: "display", label: "Preferences", description: "Branch defaults, currency, timezone, and language.", icon: <Sliders size={18} />, Component: BranchOwnerPreferencesSection },
    ],
  },
  {
    groupLabel: "Billing",
    items: [
      { id: "subscription", label: "Subscription", description: "View the billing plan and invoices for a salon you manage.", icon: <CreditCard size={18} />, Component: BranchOwnerSubscriptionSection },
    ],
  },
  {
    groupLabel: "Branches",
    items: [
      { id: "branches", label: "Branch Management", description: "Request access to a salon or leave one you manage.", icon: <Building2 size={18} />, Component: BranchOwnerBranchManagementSection },
    ],
  },
  {
    groupLabel: "Data",
    items: [
      { id: "data-privacy", label: "Data & Privacy", description: "Export your data or deactivate your account.", icon: <Database size={18} />, Component: BranchOwnerDataPrivacySection },
    ],
  },
];

const allItems: NavItem[] = navGroups.flatMap((g) => g.items);
const homeGroups: SettingsHomeGroup[] = navGroups.map((g) => ({ groupLabel: g.groupLabel, items: g.items }));

function sectionIdFromPath(pathname: string): string | null {
  const requested = pathname.split("/").filter(Boolean).pop();
  return requested && allItems.some((i) => i.id === requested) ? requested : null;
}

export default function BranchOwnerSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(() => sectionIdFromPath(location.pathname));

  useEffect(() => {
    setActiveId(sectionIdFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeId]);

  const handleSelect = (id: string) => navigate(`/branch-owner/settings/${id}`);

  const activeItem = activeId ? allItems.find((i) => i.id === activeId) : null;
  const ActiveComponent = activeItem?.Component;

  return (
    <div className="settings-wrapper">
      <div className="settings-sticky-header d-flex align-items-center gap-2">
        {activeItem ? (
          <button type="button" className="settings-back-link" onClick={() => navigate("/branch-owner/settings")}>
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
            <ActiveComponent key={activeId} />
          ) : (
            <div className="bo-settings-home">
              <SettingsHomePage groups={homeGroups} onSelect={handleSelect} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
