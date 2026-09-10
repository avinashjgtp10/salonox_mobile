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
