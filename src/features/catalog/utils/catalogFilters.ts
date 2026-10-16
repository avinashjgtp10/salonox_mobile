export type CatalogTab = "services" | "products" | "packages" | "memberships" | "consumables";

export type FilterableCatalogItem = {
  appliesTo?: string | null; // memberships — "services" | "products" | "both"
  assignedServices?: string[]; // consumables — names of services that use it
  brand?: string | null; // products, consumables
  category: string;
  durationMinutes?: number | null; // services
  isActive: boolean;
  isOnlineBooking?: boolean | null; // services
  lowStockThreshold?: number | null; // products, consumables (qty alert)
  price: number;
  pricingType?: string | null; // memberships — "value" | "percentage" | "loyalty"
  productType?: string | null; // products, consumables — "retail" | "consumable" | "both"
  rawStatus?: string | null; // consumables — raw backend stock status, if sent
  serviceCount?: number | null; // packages, display only
  status?: string | null; // packages — "Active" | "Draft" | "Inactive"
  stockQuantity?: number | null; // products, consumables
  supplier?: string | null; // consumables
  unit?: string | null; // consumables
  validFor?: string | null; // memberships
};

// ---- Per-tab filter shapes, matching the web app's catalog filter panels field-for-field. ----

export type ServiceCatalogFilters = {
  category: string[];
  durationRange: string[]; // "0-30" | "30-60" | "60-120" | "120+"
  onlineBooking: string[]; // "Enabled" | "Disabled"
};

export type ProductCatalogFilters = {
  brand: string;
  category: string;
  productType: string; // "" | "retail" | "consumable" | "both"
  stock: string; // "" | "in" | "low" | "out"
};

export type PackageCatalogFilters = {
  category: string;
  status: string; // "" | "Active" | "Draft" | "Inactive"
};

export type MembershipCatalogFilters = {
  appliesTo: string[]; // "services" | "products" | "both"
  pricingType: string[]; // "value" | "percentage" | "loyalty"
  validFor: string[];
};

export type ConsumableCatalogFilters = {
  brand: string[];
  category: string[];
  productType: string[]; // "consumable" | "both"
  service: string[]; // assigned service names
  status: string[]; // "healthy" | "low" | "out_of_stock" | "deactivated"
  supplier: string[];
  unit: string[]; // "ml" | "l" | "g" | "kg" | "pcs"
};

export type CatalogFilterValue =
  | ServiceCatalogFilters
  | ProductCatalogFilters
  | PackageCatalogFilters
  | MembershipCatalogFilters
  | ConsumableCatalogFilters;

export type CatalogFilterOption = { id: string; label: string };

export const DURATION_RANGE_OPTIONS: CatalogFilterOption[] = [
  { id: "0-30", label: "Under 30 min" },
  { id: "30-60", label: "30 – 60 min" },
  { id: "60-120", label: "1 – 2 hours" },
  { id: "120+", label: "Over 2 hours" },
];

export const ONLINE_BOOKING_OPTIONS: CatalogFilterOption[] = [
  { id: "Enabled", label: "Online" },
  { id: "Disabled", label: "Offline" },
];

export const PRODUCT_STOCK_OPTIONS: CatalogFilterOption[] = [
  { id: "in", label: "In stock" },
  { id: "low", label: "Low in stock" },
  { id: "out", label: "Out of stock" },
];

export const PRODUCT_TYPE_OPTIONS: CatalogFilterOption[] = [
  { id: "retail", label: "Retail" },
  { id: "consumable", label: "Consumable" },
  { id: "both", label: "Both" },
];

export const PACKAGE_STATUS_OPTIONS: CatalogFilterOption[] = [
  { id: "Active", label: "Active" },
  { id: "Draft", label: "Draft" },
  { id: "Inactive", label: "Inactive" },
];

export const MEMBERSHIP_PRICING_TYPE_OPTIONS: CatalogFilterOption[] = [
  { id: "value", label: "Wallet" },
  { id: "percentage", label: "Discount Balance" },
  { id: "loyalty", label: "Loyalty" },
];

export const MEMBERSHIP_APPLIES_TO_OPTIONS: CatalogFilterOption[] = [
  { id: "services", label: "Services" },
  { id: "products", label: "Products" },
  { id: "both", label: "Services & Products" },
];

export const CONSUMABLE_STATUS_OPTIONS: CatalogFilterOption[] = [
  { id: "healthy", label: "Healthy" },
  { id: "low", label: "Low Stock" },
  { id: "out_of_stock", label: "Out of Stock" },
  { id: "deactivated", label: "Deactivated" },
];

export const CONSUMABLE_UNIT_OPTIONS: CatalogFilterOption[] = ["ml", "l", "g", "kg", "pcs"].map((unit) => ({ id: unit, label: unit }));

export const CONSUMABLE_PRODUCT_TYPE_OPTIONS: CatalogFilterOption[] = [
  { id: "consumable", label: "Consumable" },
  { id: "both", label: "Both" },
];

export const emptyServiceCatalogFilters = (): ServiceCatalogFilters => ({
  category: [],
  durationRange: [],
  onlineBooking: [],
});

export const emptyProductCatalogFilters = (): ProductCatalogFilters => ({
  brand: "",
  category: "",
  productType: "",
  stock: "",
});

export const emptyPackageCatalogFilters = (): PackageCatalogFilters => ({
  category: "",
  status: "",
});

export const emptyMembershipCatalogFilters = (): MembershipCatalogFilters => ({
  appliesTo: [],
  pricingType: [],
  validFor: [],
});

export const emptyConsumableCatalogFilters = (): ConsumableCatalogFilters => ({
  brand: [],
  category: [],
  productType: [],
  service: [],
  status: [],
  supplier: [],
  unit: [],
});

export const emptyCatalogFilterForTab = (tab: CatalogTab): CatalogFilterValue => {
  switch (tab) {
    case "services":
      return emptyServiceCatalogFilters();
    case "products":
      return emptyProductCatalogFilters();
    case "packages":
      return emptyPackageCatalogFilters();
    case "memberships":
      return emptyMembershipCatalogFilters();
    case "consumables":
      return emptyConsumableCatalogFilters();
  }
};

export const emptyCatalogFiltersByTab = (): Record<CatalogTab, CatalogFilterValue> => ({
  consumables: emptyConsumableCatalogFilters(),
  memberships: emptyMembershipCatalogFilters(),
  packages: emptyPackageCatalogFilters(),
  products: emptyProductCatalogFilters(),
  services: emptyServiceCatalogFilters(),
});

export const catalogCategoryLabel = (category: string | null | undefined) => category?.trim() || "Uncategorized";

export const catalogStatusLabel = (tab: CatalogTab, status: "active" | "inactive") => {
  if (tab === "memberships") return status === "active" ? "Sold online" : "Not sold online";
  return status === "active" ? "Active" : "Inactive";
};

// Upper bound is exclusive so the buckets don't overlap — a 60 min service
// belongs to "30 – 60", not to both that and "1 – 2 hours". Mirrors the web
// app's matchesDuration in ServicesListPage.tsx.
const matchesDurationBucket = (duration: number | null | undefined, range: string): boolean => {
  if (duration == null) return false;

  switch (range) {
    case "0-30":
      return duration < 30;
    case "30-60":
      return duration >= 30 && duration < 60;
    case "60-120":
      return duration >= 60 && duration < 120;
    case "120+":
      return duration >= 120;
    default:
      return true;
  }
};

const matchesStockBucket = (
  quantity: number | null | undefined,
  lowStockThreshold: number | null | undefined,
  bucket: string,
): boolean => {
  const qty = quantity ?? 0;
  const threshold = lowStockThreshold ?? 0;

  if (bucket === "out") return qty <= 0;
  if (bucket === "low") return qty > 0 && qty <= threshold;
  if (bucket === "in") return qty > 0;

  return true;
};

export function matchesServiceFilters(item: FilterableCatalogItem, filters: ServiceCatalogFilters): boolean {
  if (filters.category.length && !filters.category.includes(catalogCategoryLabel(item.category))) return false;
  if (filters.durationRange.length && !filters.durationRange.some((range) => matchesDurationBucket(item.durationMinutes, range))) {
    return false;
  }

  // The web app's onlineBooking is multi-select but the field itself is a
  // single boolean, so only a one-sided selection narrows anything — picking
  // both Online and Offline means "either", same as no filter at all.
  if (filters.onlineBooking.length === 1) {
    const wantsOnline = filters.onlineBooking[0] === "Enabled";
    if (Boolean(item.isOnlineBooking) !== wantsOnline) return false;
  }

  return true;
}

export function matchesProductFilters(item: FilterableCatalogItem, filters: ProductCatalogFilters): boolean {
  if (filters.category && catalogCategoryLabel(item.category) !== filters.category) return false;
  if (filters.brand && (item.brand ?? "") !== filters.brand) return false;
  if (filters.stock && !matchesStockBucket(item.stockQuantity, item.lowStockThreshold, filters.stock)) return false;
  if (filters.productType && (item.productType ?? "") !== filters.productType) return false;

  return true;
}

export function matchesPackageFilters(item: FilterableCatalogItem, filters: PackageCatalogFilters): boolean {
  if (filters.category && catalogCategoryLabel(item.category) !== filters.category) return false;
  if (filters.status && (item.status ?? "") !== filters.status) return false;

  return true;
}

export function matchesMembershipFilters(item: FilterableCatalogItem, filters: MembershipCatalogFilters): boolean {
  if (filters.pricingType.length && !filters.pricingType.includes(item.pricingType ?? "")) return false;
  if (filters.appliesTo.length && !filters.appliesTo.includes(item.appliesTo ?? "")) return false;
  if (filters.validFor.length && !filters.validFor.includes(item.validFor ?? "")) return false;

  return true;
}

// Mirrors the status logic already used in app/consumables/index.tsx and
// [id].tsx: prefer the backend's own status string when it's sent, otherwise
// derive a bucket from stock quantity vs. the qty-alert threshold.
export const consumableStatusBucket = (item: FilterableCatalogItem): string => {
  if (!item.isActive) return "deactivated";
  if (item.rawStatus === "out_of_stock") return "out_of_stock";
  if (item.rawStatus === "low_stock") return "low";
  if (item.rawStatus === "healthy") return "healthy";

  const qty = item.stockQuantity ?? 0;
  if (qty <= 0) return "out_of_stock";
  if (item.lowStockThreshold != null && qty <= item.lowStockThreshold) return "low";

  return "healthy";
};

export function matchesConsumableFilters(item: FilterableCatalogItem, filters: ConsumableCatalogFilters): boolean {
  if (filters.category.length && !filters.category.includes(catalogCategoryLabel(item.category))) return false;
  if (filters.brand.length && !filters.brand.includes(item.brand ?? "")) return false;
  if (filters.supplier.length && !filters.supplier.includes(item.supplier ?? "")) return false;
  if (filters.service.length && !(item.assignedServices ?? []).some((name) => filters.service.includes(name))) return false;
  if (filters.status.length && !filters.status.includes(consumableStatusBucket(item))) return false;
  if (filters.unit.length && !filters.unit.includes(item.unit ?? "")) return false;
  if (filters.productType.length && !filters.productType.includes(item.productType ?? "")) return false;

  return true;
}

export function matchesCatalogFilters(tab: CatalogTab, item: FilterableCatalogItem, filters: CatalogFilterValue): boolean {
  switch (tab) {
    case "services":
      return matchesServiceFilters(item, filters as ServiceCatalogFilters);
    case "products":
      return matchesProductFilters(item, filters as ProductCatalogFilters);
    case "packages":
      return matchesPackageFilters(item, filters as PackageCatalogFilters);
    case "memberships":
      return matchesMembershipFilters(item, filters as MembershipCatalogFilters);
    case "consumables":
      return matchesConsumableFilters(item, filters as ConsumableCatalogFilters);
  }
}

export function countCatalogFilters(tab: CatalogTab, filters: CatalogFilterValue): number {
  switch (tab) {
    case "services": {
      const f = filters as ServiceCatalogFilters;
      return Number(f.category.length > 0) + Number(f.durationRange.length > 0) + Number(f.onlineBooking.length > 0);
    }
    case "products": {
      const f = filters as ProductCatalogFilters;
      return [f.category, f.brand, f.stock, f.productType].filter(Boolean).length;
    }
    case "packages": {
      const f = filters as PackageCatalogFilters;
      return [f.category, f.status].filter(Boolean).length;
    }
    case "memberships": {
      const f = filters as MembershipCatalogFilters;
      return Number(f.pricingType.length > 0) + Number(f.appliesTo.length > 0) + Number(f.validFor.length > 0);
    }
    case "consumables": {
      const f = filters as ConsumableCatalogFilters;
      return [f.category, f.brand, f.supplier, f.service, f.status, f.unit, f.productType].filter((group) => group.length > 0).length;
    }
  }
}
