export const SERVICE_SORT_OPTIONS = [
  "Newest",
  "Name (A-Z)",
  "Price (Low-High)",
  "Price (High-Low)",
] as const;

export type ServiceSortOption = (typeof SERVICE_SORT_OPTIONS)[number];
