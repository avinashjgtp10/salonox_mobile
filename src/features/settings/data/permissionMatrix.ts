export interface Permission {
  key: string;
  label: string;
  desc: string;
  category: string;
  owner: boolean;
  staff: boolean;
}

export const defaultPermissions: Permission[] = [
  // Dashboard
  { key: "view_dashboard",  label: "View Dashboard",  desc: "Access the main dashboard",        category: "Dashboard",    owner: true, staff: true  },
  { key: "view_analytics",  label: "View Analytics",  desc: "Access reports and analytics",     category: "Dashboard",    owner: true, staff: false },

  // Appointments
  { key: "view_appointments",   label: "View Appointments",   desc: "See all appointments",        category: "Appointments", owner: true, staff: true  },
  { key: "create_appointments", label: "Create Appointments", desc: "Book new appointments",        category: "Appointments", owner: true, staff: true  },
  { key: "edit_appointments",   label: "Edit Appointments",   desc: "Modify existing bookings",     category: "Appointments", owner: true, staff: false },
  { key: "cancel_appointments", label: "Cancel Appointments", desc: "Cancel client bookings",       category: "Appointments", owner: true, staff: false },

  // Clients
  { key: "view_clients",   label: "View Clients",   desc: "Access client profiles",          category: "Clients",      owner: true, staff: true  },
  { key: "edit_clients",   label: "Edit Clients",   desc: "Update client information",       category: "Clients",      owner: true, staff: false },
  { key: "delete_clients", label: "Delete Clients", desc: "Remove client records",           category: "Clients",      owner: true, staff: false },

  // Sales
  { key: "view_sales",      label: "View Sales",      desc: "See sales transactions",          category: "Sales",        owner: true, staff: true  },
  { key: "create_sales",    label: "Create Sales",    desc: "Process sales and payments",      category: "Sales",        owner: true, staff: true  },
  { key: "apply_discounts", label: "Apply Discounts", desc: "Give discounts to clients",       category: "Sales",        owner: true, staff: false },
  { key: "void_sales",      label: "Void / Refund",   desc: "Cancel or refund transactions",   category: "Sales",        owner: true, staff: false },

  // Catalog
  { key: "view_catalog",    label: "View Catalog",    desc: "See services and products",       category: "Catalog",      owner: true, staff: true  },
  { key: "edit_catalog",    label: "Edit Catalog",    desc: "Manage services and pricing",     category: "Catalog",      owner: true, staff: false },
  { key: "manage_inventory",label: "Manage Inventory",desc: "Update product stock",            category: "Catalog",      owner: true, staff: false },

  // Team
  { key: "view_team",    label: "View Team",    desc: "See team members",                 category: "Team",         owner: true, staff: false },
  { key: "manage_team",  label: "Manage Team",  desc: "Add, edit, or remove staff",       category: "Team",         owner: true, staff: false },
  { key: "manage_shifts",label: "Manage Shifts",desc: "Control schedules and shifts",     category: "Team",         owner: true, staff: false },
  { key: "view_payroll", label: "View Payroll", desc: "Access pay runs and wages",        category: "Team",         owner: true, staff: false },

  // Marketing
  { key: "view_marketing",   label: "View Marketing",   desc: "See campaigns and templates", category: "Marketing",    owner: true, staff: false },
  { key: "manage_marketing", label: "Manage Marketing", desc: "Create and send campaigns",   category: "Marketing",    owner: true, staff: false },

  // Settings
  { key: "view_settings",   label: "View Settings",   desc: "Access settings pages",          category: "Settings",     owner: true, staff: false },
  { key: "manage_settings", label: "Manage Settings", desc: "Change business settings",       category: "Settings",     owner: true, staff: false },
  { key: "manage_billing",  label: "Manage Billing",  desc: "Control subscriptions and billing",category: "Settings",  owner: true, staff: false },
];

export const PERM_CATEGORIES = [...new Set(defaultPermissions.map((p) => p.category))];

/** Convert a Permission[] to a flat Record<key, boolean> for the staff column. */
export function permsToRecord(perms: Permission[]): Record<string, boolean> {
  return Object.fromEntries(perms.map((p) => [p.key, p.staff]));
}

/** Build a Permission[] seeded from custom overrides (or global defaults). */
export function buildPermissions(
  globalPerms: Permission[],
  customPerms: Record<string, boolean> | null | undefined
): Permission[] {
  if (!customPerms) return globalPerms.map((p) => ({ ...p }));
  return globalPerms.map((p) => ({
    ...p,
    staff: customPerms[p.key] ?? p.staff,
  }));
}
