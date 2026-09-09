export interface Permission {
  key: string;
  label: string;
  desc: string;
  category: string;
  group?: string;
  owner: boolean;
  staff: boolean;
  manager: boolean;
}

export const defaultPermissions: Permission[] = [
  // ── Dashboard ─────────────────────────────────────────────────────────────
  { key: "view_dashboard",      label: "View Dashboard",      desc: "Access the main dashboard",            category: "Dashboard",      owner: true,  staff: false, manager: true },

  // ── Quick Sale ────────────────────────────────────────────────────────────
  // Reconciled to the keys the backend actually enforces (sales.routes.ts
  // checks view_sales/create_sales) — previously this matrix showed
  // view_quick_sale/create_quick_sale/edit_quick_sale/delete_quick_sale,
  // none of which the backend ever checked, so any staff member with a
  // custom permission override silently lost all Sales access the moment
  // that override existed (customPerms["view_sales"] was always undefined).
  // There's no backend concept of a separate "edit"/"delete" quick sale
  // action — updates and deletes both go through the same create_sales key.
  { key: "view_sales",          label: "View Sales",          desc: "Access sales records and daily summaries", category: "Quick Sale",   owner: true,  staff: true,  manager: true },
  { key: "create_sales",        label: "Create Sales",        desc: "Create, edit and checkout sales",      category: "Quick Sale",     owner: true,  staff: true,  manager: true },

  // ── Calendar ──────────────────────────────────────────────────────────────
  { key: "view_calendar",       label: "View Calendar",       desc: "See all appointments on calendar",     category: "Calendar",       owner: true,  staff: true,  manager: true },
  { key: "manage_calendar",     label: "Manage Calendar",     desc: "Create, edit and cancel bookings",     category: "Calendar",       owner: true,  staff: false, manager: true },

  // ── Clients ───────────────────────────────────────────────────────────────
  { key: "view_clients",        label: "View Clients",        desc: "Access client profiles",               category: "Clients",        owner: true,  staff: true,  manager: true },
  { key: "create_clients",      label: "Create Clients",      desc: "Add new client records",               category: "Clients",        owner: true,  staff: true,  manager: true },
  { key: "edit_clients",        label: "Edit Clients",        desc: "Update client information",            category: "Clients",        owner: true,  staff: true,  manager: true },
  { key: "delete_clients",      label: "Delete Clients",      desc: "Remove client records",                category: "Clients",        owner: true,  staff: false, manager: true },

  // ── Catalog › Services ────────────────────────────────────────────────────
  { key: "view_services",       label: "View Services",       desc: "See all salon services",               category: "Catalog", group: "Services",    owner: true, staff: true,  manager: true },
  { key: "create_services",     label: "Create Services",     desc: "Add new services",                     category: "Catalog", group: "Services",    owner: true, staff: false, manager: true },
  { key: "edit_services",       label: "Edit Services",       desc: "Modify service details and pricing",   category: "Catalog", group: "Services",    owner: true, staff: false, manager: true },

  // ── Catalog › Memberships ─────────────────────────────────────────────────
  { key: "view_memberships",    label: "View Memberships",    desc: "See membership plans",                 category: "Catalog", group: "Memberships", owner: true, staff: true,  manager: true },
  { key: "create_memberships",  label: "Create Memberships",  desc: "Add and manage membership plans",      category: "Catalog", group: "Memberships", owner: true, staff: false, manager: true },

  // ── Catalog › Products ────────────────────────────────────────────────────
  { key: "view_products",       label: "View Products",       desc: "See products available for sale",      category: "Catalog", group: "Products",    owner: true, staff: true,  manager: true },
  { key: "create_products",     label: "Create Products",     desc: "Add new products to the catalog",      category: "Catalog", group: "Products",    owner: true, staff: false, manager: true },

  // ── Catalog › Packages ────────────────────────────────────────────────────
  { key: "view_packages",       label: "View Packages",       desc: "See service packages and bundles",     category: "Catalog", group: "Packages",    owner: true, staff: true,  manager: true },
  { key: "create_packages",     label: "Create Packages",     desc: "Create and edit service packages",     category: "Catalog", group: "Packages",    owner: true, staff: false, manager: true },

  // ── Catalog › Inventory ───────────────────────────────────────────────────
  { key: "view_inventory",      label: "View Inventory",      desc: "See current stock levels",             category: "Catalog", group: "Inventory",   owner: true, staff: true,  manager: true },
  { key: "manage_inventory",    label: "Manage Inventory",    desc: "Adjust stock and reorder products",    category: "Catalog", group: "Inventory",   owner: true, staff: false, manager: true },
  { key: "stock_adjustment",    label: "Stock Adjustment",    desc: "Manually adjust stock quantities",     category: "Catalog", group: "Inventory",   owner: true, staff: false, manager: true },

  // ── Online Booking ────────────────────────────────────────────────────────
  { key: "view_booking",        label: "View Booking",        desc: "See online booking settings",          category: "Online Booking", owner: true, staff: true,  manager: true },
  { key: "manage_booking",      label: "Manage Booking",      desc: "Configure online booking options",     category: "Online Booking", owner: true, staff: false, manager: true },

  // ── Marketing ─────────────────────────────────────────────────────────────
  { key: "view_campaigns",      label: "View Campaigns",      desc: "See marketing campaigns",              category: "Marketing",      owner: true, staff: false, manager: true },
  { key: "create_campaigns",    label: "Create Campaigns",    desc: "Create and send campaigns",            category: "Marketing",      owner: true, staff: false, manager: true },
  { key: "design_coupons",      label: "Design Coupons",      desc: "Create and edit coupon artwork",       category: "Marketing",      owner: true, staff: false, manager: true },

  // ── Enquiries ─────────────────────────────────────────────────────────────
  { key: "view_enquiries",      label: "View Enquiries",      desc: "See and respond to client enquiries",  category: "Enquiries",      owner: true, staff: true,  manager: true },

  // ── Staff ─────────────────────────────────────────────────────────────────
  { key: "view_team",           label: "View Staff",           desc: "See team members and schedules",       category: "Staff",          owner: true, staff: true,  manager: true },
  { key: "add_team_member",     label: "Add Staff Member",     desc: "Invite and add new staff",             category: "Staff",          owner: true, staff: false, manager: true },
  { key: "edit_team_member",    label: "Edit Staff Member",    desc: "Update team member details",           category: "Staff",          owner: true, staff: false, manager: true },
  { key: "manage_shifts",       label: "Manage Shifts",       desc: "Create and edit scheduled shifts",     category: "Staff",          owner: true, staff: false, manager: true },
  { key: "view_payroll",        label: "View Payroll",        desc: "Access pay runs and payroll data",     category: "Staff",          owner: true, staff: false, manager: true },

  // ── Reports ───────────────────────────────────────────────────────────────
  { key: "view_reports",        label: "View Reports",        desc: "Access business reports",              category: "Reports",        owner: true, staff: false, manager: true },
  { key: "export_reports",      label: "Export Reports",      desc: "Download and export report data",      category: "Reports",        owner: true, staff: false, manager: true },

  // ── Settings ──────────────────────────────────────────────────────────────
  { key: "general_settings",    label: "General Settings",    desc: "Access and update business settings",  category: "Settings",       owner: true, staff: false, manager: true },
  { key: "permission_settings", label: "Permission Settings", desc: "Manage staff roles and permissions",   category: "Settings",       owner: true, staff: false, manager: true },
  { key: "manage_pos_payments", label: "POS / Payment Machine", desc: "Connect payment terminals and merchant credentials", category: "Settings", owner: true, staff: false, manager: true },

  // ── Help ──────────────────────────────────────────────────────────────────
  { key: "access_help_center",  label: "Access Help Center",  desc: "Use the help center and support",      category: "Help",           owner: true, staff: true,  manager: true },
];

export const PERM_CATEGORIES = [...new Set(defaultPermissions.map(p => p.category))];

export function permsToRecord(perms: Permission[]): Record<string, boolean> {
  return Object.fromEntries(perms.map(p => [p.key, p.staff]));
}

export function buildPermissions(
  globalPerms: Permission[],
  customPerms: Record<string, boolean> | null | undefined
): Permission[] {
  if (!customPerms) return globalPerms.map(p => ({ ...p }));
  return globalPerms.map(p => ({ ...p, staff: customPerms[p.key] ?? p.staff }));
}
