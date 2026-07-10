import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  Clock,
} from "lucide-react";
import "../styles/SettingsPage.scss";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Account",
    items: [
      { label: "Profile", path: "profile", icon: <User size={15} /> },
      { label: "Business", path: "business", icon: <Building2 size={15} /> },
      { label: "Account & Security", path: "account", icon: <ShieldCheck size={15} /> },
    ],
  },
  {
    groupLabel: "Preferences",
    items: [
      { label: "Notifications", path: "notifications", icon: <Bell size={15} /> },
      { label: "Roles & Permissions", path: "roles", icon: <Users size={15} /> },
    ],
  },
  {
    groupLabel: "Tools",
    items: [
      { label: "Integrations", path: "integrations", icon: <Puzzle size={15} /> },
      { label: "Billing & Plans", path: "billing", icon: <CreditCard size={15} /> },
    ],
  },
  {
    groupLabel: "Configuration",
    items: [
      { label: "Tax Mapping", path: "tax-mapping", icon: <SlidersHorizontal size={15} /> },
      { label: "Reward Points", path: "reward-points", icon: <Gift size={15} /> },
      { label: "Refer & Earn", path: "referral", icon: <Share2 size={15} /> },
      { label: "Coupons", path: "coupons", icon: <Tag size={15} /> },
      { label: "Half Day Rule", path: "half-day-rule", icon: <Clock size={15} /> },
    ],
  },
  {
    groupLabel: "Data",
    items: [
      { label: "Data & Privacy", path: "data-privacy", icon: <Database size={15} /> },
    ],
  },
];

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="settings-wrapper">
      {/* Page-level header */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <Settings size={20} color="#111827" />
        <h1 className="settings-heading">Settings</h1>
      </div>

      <div className="settings-root">
        {/* ── Left Nav ── */}
        <nav className="settings-nav">
          {navGroups.map((group, gi) => (
            <div className="settings-nav-group" key={gi}>
              <p className="settings-nav-label">{group.groupLabel}</p>
              {group.items.map((item) => {
                const fullPath = `/dashboard/settings/${item.path}`;
                const isActive =
                  location.pathname === fullPath ||
                  location.pathname.startsWith(fullPath + "/");
                return (
                  <NavLink
                    key={item.path}
                    to={fullPath}
                    className={`settings-nav-item ${isActive ? "active" : ""}`}
                  >
                    <span className="settings-nav-icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                );
              })}
              {gi < navGroups.length - 1 && (
                <hr className="settings-nav-divider" />
              )}
            </div>
          ))}
        </nav>

        {/* ── Right Content ── */}
        <div className="settings-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
