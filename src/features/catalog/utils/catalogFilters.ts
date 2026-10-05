export type CatalogTab = "services" | "products" | "packages" | "memberships" | "consumables";

export type FilterableCatalogItem = {
  category: string;
  durationMinutes?: number | null;
  isActive: boolean;
  price: number;
  serviceCount?: number | null;
  stockQuantity?: number | null;
};

export type CatalogFilters = {
  categories: string[];
  maxDuration: string;
  maxPrice: string;
  maxServiceCount: string;
  maxStock: string;
  minDuration: string;
  minPrice: string;
  minServiceCount: string;
  minStock: string;
  statuses: ("active" | "inactive")[];
};

type RangeBound = Extract<keyof CatalogFilters, `${"min" | "max"}${string}`>;

type RangeField = {
  label: string;
  max: RangeBound;
  min: RangeBound;
  read: (item: FilterableCatalogItem) => number | null | undefined;
  unit: string;
};

export const CATALOG_RANGES = {
  price: { label: "Price Range", max: "maxPrice", min: "minPrice", read: (item) => item.price, unit: "Rs." },
  duration: { label: "Duration", max: "maxDuration", min: "minDuration", read: (item) => item.durationMinutes, unit: "minutes" },
  stock: { label: "Stock Quantity", max: "maxStock", min: "minStock", read: (item) => item.stockQuantity, unit: "units" },
  serviceCount: { label: "Services Included", max: "maxServiceCount", min: "minServiceCount", read: (item) => item.serviceCount, unit: "services" },
} satisfies Record<string, RangeField>;

export type CatalogRangeKey = keyof typeof CATALOG_RANGES;

export const CATALOG_TAB_RANGES: Record<CatalogTab, CatalogRangeKey[]> = {
  consumables: ["price", "stock"],
  memberships: ["price"],
  packages: ["price", "serviceCount"],
  products: ["price", "stock"],
  services: ["price", "duration"],
};

export const emptyCatalogFilters = (): CatalogFilters => ({
  categories: [],
  maxDuration: "",
  maxPrice: "",
  maxServiceCount: "",
  maxStock: "",
  minDuration: "",
  minPrice: "",
  minServiceCount: "",
  minStock: "",
  statuses: [],
});

export const emptyCatalogFiltersByTab = (): Record<CatalogTab, CatalogFilters> => ({
  consumables: emptyCatalogFilters(),
  memberships: emptyCatalogFilters(),
  packages: emptyCatalogFilters(),
  products: emptyCatalogFilters(),
  services: emptyCatalogFilters(),
});

export const catalogCategoryLabel = (category: string | null | undefined) => category?.trim() || "Uncategorized";

export const catalogStatusLabel = (tab: CatalogTab, status: "active" | "inactive") => {
  if (tab === "memberships") return status === "active" ? "Sold online" : "Not sold online";
  return status === "active" ? "Active" : "Inactive";
};

export function validateCatalogFilters(filters: CatalogFilters, tab: CatalogTab): string | null {
  for (const key of CATALOG_TAB_RANGES[tab]) {
    const range = CATALOG_RANGES[key];
    const min = filters[range.min].trim();
    const max = filters[range.max].trim();

    for (const value of [min, max]) {
      if (value && (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))) {
        return `${range.label} must be a valid non-negative number.`;
      }
    }

    if (min && max && Number(min) > Number(max)) return `${range.label} minimum cannot exceed maximum.`;
  }

  return null;
}

export function countCatalogFilters(filters: CatalogFilters, tab: CatalogTab): number {
  const activeRanges = CATALOG_TAB_RANGES[tab].filter((key) =>
    Boolean(filters[CATALOG_RANGES[key].min].trim() || filters[CATALOG_RANGES[key].max].trim()),
  );

  return Number(filters.categories.length > 0) + Number(filters.statuses.length > 0) + activeRanges.length;
}

export function matchesCatalogFilters(item: FilterableCatalogItem, filters: CatalogFilters, tab: CatalogTab): boolean {
  if (validateCatalogFilters(filters, tab)) return false;
  if (filters.categories.length && !filters.categories.includes(catalogCategoryLabel(item.category))) return false;
  if (filters.statuses.length && !filters.statuses.includes(item.isActive ? "active" : "inactive")) return false;

  for (const key of CATALOG_TAB_RANGES[tab]) {
    const range = CATALOG_RANGES[key];
    const min = filters[range.min].trim();
    const max = filters[range.max].trim();
    if (!min && !max) continue;

    const value = range.read(item);
    if (value == null) return false;
    if (min && value < Number(min)) return false;
    if (max && value > Number(max)) return false;
  }

  return true;
}
