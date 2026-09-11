// Display order for permission-catalog "module" categories in the Roles &
// Permissions editors (StaffPermissionEditor.tsx, RolePermissionPanel.tsx) —
// matches DashboardSidebar's nav sequence so the picker reads the same way
// the app itself is laid out, instead of the DB's alphabetical `ORDER BY
// module` (roles.repository.ts's listPermissions query). "Sales" (the real
// view_sales/create_sales keys) has no sidebar entry of its own, so it's
// placed right after "Quick Sale", the nav item it actually belongs to.
const MODULE_DISPLAY_ORDER = [
  "Dashboard",
  "Quick Sale",
  "Sales",
  "Calendar",
  "Clients",
  "Catalog",
  "Staff",
  "Cash Management",
  "Marketing",
  "Online Booking",
  "Enquiries",
  "Reports",
  "Settings",
  "Help",
];

/** Sorts module names into sidebar order; anything not in the list keeps its
 *  relative order and sinks to the end. */
export function sortModuleNames<T>(items: T[], getModule: (item: T) => string): T[] {
  const indexOf = (name: string) => {
    const i = MODULE_DISPLAY_ORDER.indexOf(name);
    return i === -1 ? MODULE_DISPLAY_ORDER.length : i;
  };
  return [...items].sort((a, b) => indexOf(getModule(a)) - indexOf(getModule(b)));
}

// Display order for the sub-group drill-down within a module that has more
// than one `group_name` (e.g. Warehouse splits into Suppliers/Orders/etc.) —
// matches InventorySubSidebar's tab sequence, instead of the DB's
// alphabetical `ORDER BY group_name` (Consumable Inventory would otherwise
// sort before Suppliers). Modules not listed here keep catalog order.
const GROUP_DISPLAY_ORDER: Record<string, string[]> = {
  Warehouse: [
    "Suppliers",
    "Orders",
    "Product Inventory",
    "Consumable Inventory",
    "Product Audit",
    "Stock Ledger",
  ],
  // Matches the Reports permissions ticket's own listed category order,
  // General first since it's the top-level "can enter Reports at all"
  // master toggle every other group depends on.
  Reports: [
    "General",
    "Sales",
    "Payments",
    "Clients",
    "Appointments",
    "Inventory",
    "Staff",
    "Package & Membership",
    "Marketing",
  ],
};

/** Sorts a module's sub-groups into that module's display order (if one is
 *  defined above); anything not listed — including the null/ungrouped
 *  bucket — keeps its relative order and sinks to the end. */
export function sortGroupNames<T>(module: string, items: T[], getGroupName: (item: T) => string | null): T[] {
  const order = GROUP_DISPLAY_ORDER[module];
  if (!order) return items;
  const indexOf = (name: string | null) => {
    const i = name == null ? -1 : order.indexOf(name);
    return i === -1 ? order.length : i;
  };
  return [...items].sort((a, b) => indexOf(getGroupName(a)) - indexOf(getGroupName(b)));
}
