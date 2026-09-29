// Hand-maintained mirror of DashboardSidebar.tsx's 13 gated top-level nav
// items, for the Roles & Permissions Preview feature (Permission audit
// ticket). DashboardSidebar.tsx inlines each item's hasFeature()+can() check
// directly in JSX rather than iterating a data array, so there's no existing
// canonical list to import — this duplicates DATA (label/permKey/featureKey),
// not the gating LOGIC itself, which the preview re-evaluates independently
// against a draft permission map via canWith() (permissionPreview.ts).
//
// Keep in sync with DashboardSidebar.tsx if a top-level nav item is added,
// renamed, or re-gated — this list changes rarely (roughly once per new
// module), so the duplication is a deliberate, low-risk tradeoff versus
// parsing JSX or refactoring the live sidebar to a data-driven shape.
export interface SidebarPreviewItem {
  label: string;
  /** One or more plan-feature keys — ANY satisfies (matches DashboardSidebar's
   *  own OR'd hasFeature checks, e.g. Catalog's services||products||...). */
  featureKeys: string[];
  /** The permission key gating this item, per DashboardSidebar.tsx. */
  permKey: string;
}

export const SIDEBAR_PREVIEW_ITEMS: SidebarPreviewItem[] = [
  { label: "Home", featureKeys: ["dashboard"], permKey: "view_dashboard" },
  { label: "Quick Sale", featureKeys: ["quick_sale"], permKey: "create_sales" },
  { label: "Calendar", featureKeys: ["calendar"], permKey: "view_calendar" },
  { label: "Clients", featureKeys: ["clients"], permKey: "view_clients" },
  { label: "Catalog", featureKeys: ["services", "products", "packages", "memberships"], permKey: "view_catalog" },
  { label: "Warehouse", featureKeys: ["inventory"], permKey: "access_warehouse" },
  { label: "Staff", featureKeys: ["staff", "payroll"], permKey: "access_staff" },
  { label: "Cash Management", featureKeys: ["cash_management"], permKey: "view_cash_management" },
  { label: "Marketing", featureKeys: ["marketing"], permKey: "view_marketing" },
  { label: "Online booking", featureKeys: ["online_booking"], permKey: "view_booking" },
  { label: "Enquiries", featureKeys: ["enquiries"], permKey: "view_enquiries" },
  { label: "Reports", featureKeys: ["reports"], permKey: "view_reports" },
  // Settings has no hasFeature gate in DashboardSidebar.tsx — always shown
  // once view_roles/other Settings sub-permissions decide what's inside.
  { label: "Settings", featureKeys: [], permKey: "access_settings" },
];
