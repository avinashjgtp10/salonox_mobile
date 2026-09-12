import {
  Home, Zap, Calendar, LayoutGrid, Users, ClipboardList, Megaphone,
  Globe, MessageSquare, TrendingUp, Settings as SettingsIcon, Tag,
  Bell, Server, HelpCircle, Warehouse, Smile,
} from "lucide-react";

// Shared across every Roles & Permissions editor (RolePermissionPanel.tsx
// for Manager/Staff, StaffPermissionEditor.tsx, IndividualStaffPermissionsPage.tsx)
// so all three show identical module icon badges instead of drifting —
// single source of truth here rather than one copy per file.
export const MODULE_ICON: Record<string, { icon: typeof Home; bg: string; color: string }> = {
  Dashboard: { icon: Home, bg: "#dbeafe", color: "#2563eb" },
  "Quick Sale": { icon: Zap, bg: "#ede9fe", color: "#7c3aed" },
  Calendar: { icon: Calendar, bg: "#dcfce7", color: "#16a34a" },
  Clients: { icon: Smile, bg: "#dbeafe", color: "#2563eb" },
  Catalog: { icon: LayoutGrid, bg: "#ffedd5", color: "#ea580c" },
  Warehouse: { icon: Warehouse, bg: "#e0e7ff", color: "#4f46e5" },
  Staff: { icon: Users, bg: "#fce7f3", color: "#db2777" },
  "Cash Management": { icon: ClipboardList, bg: "#dcfce7", color: "#16a34a" },
  Marketing: { icon: Megaphone, bg: "#fef3c7", color: "#d97706" },
  "Online Booking": { icon: Globe, bg: "#cffafe", color: "#0891b2" },
  Enquiries: { icon: MessageSquare, bg: "#e0e7ff", color: "#4f46e5" },
  Reports: { icon: TrendingUp, bg: "#dcfce7", color: "#16a34a" },
  Settings: { icon: SettingsIcon, bg: "#e5e7eb", color: "#374151" },
  Coupons: { icon: Tag, bg: "#fef3c7", color: "#d97706" },
  Notifications: { icon: Bell, bg: "#fee2e2", color: "#dc2626" },
  System: { icon: Server, bg: "#e5e7eb", color: "#374151" },
  Help: { icon: HelpCircle, bg: "#e5e7eb", color: "#374151" },
};
export const DEFAULT_MODULE_ICON = { icon: LayoutGrid, bg: "#f3f4f6", color: "#6b7280" };

// One-line description shown under each module's name in the Roles list
// (Roles & Permissions redesign). Purely cosmetic copy, not tied to any
// permission logic.
export const MODULE_DESCRIPTION: Record<string, string> = {
  Dashboard: "View business overview and key metrics",
  "Quick Sale": "Create sales and take walk-in payments",
  Calendar: "Manage appointments and schedules",
  Clients: "View and manage client records",
  Catalog: "Manage services and products",
  Warehouse: "Manage suppliers, stock, and inventory",
  Staff: "Add and manage staff members",
  "Cash Management": "Track cash register and expenses",
  Marketing: "Manage campaigns and offers",
  "Online Booking": "Configure online booking settings",
  Enquiries: "View and manage enquiries",
  Reports: "Access reports and analytics",
  Settings: "Access system settings",
  Coupons: "Create and manage discount coupons",
  Notifications: "Use the notification bell and feed",
  System: "Legacy export/import fallback permissions",
  Help: "Access the help center",
};
export const DEFAULT_MODULE_DESCRIPTION = "Manage permissions for this module";
