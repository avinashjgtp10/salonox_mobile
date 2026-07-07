export const SERVICE_FILTERS = ["All", "Active", "Inactive"] as const;

export const SERVICE_SORT_OPTIONS = [
  "Newest",
  "Name (A-Z)",
  "Price (Low-High)",
  "Price (High-Low)",
] as const;

export type ServiceFilter = (typeof SERVICE_FILTERS)[number];
export type ServiceSortOption = (typeof SERVICE_SORT_OPTIONS)[number];
