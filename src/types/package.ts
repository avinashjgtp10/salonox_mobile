export type PackageStatus = "Active" | "Draft" | "Inactive" | string;

export type PackageListQuery = {
  category?: string;
  limit?: number;
  page?: number;
  search?: string;
  status?: PackageStatus;
};

/**
 * Which table a listed package came from. "template" rows are package
 * templates (`/package-templates`) — the reusable definition the web Catalog's
 * Packages → Templates tab creates and the one the app's Add Package writes.
 * "catalog" rows come from the older `/packages` package-builder table, which
 * is read-only here. Editing and deleting have to hit the matching endpoint,
 * so a listed row has to say which it is.
 */
export type PackageSource = "catalog" | "template";

export type PackageListItem = {
  basePrice: number;
  category: string | null;
  colour: string | null;
  description: string | null;
  discountType: "fixed" | "percentage" | null;
  discountValue: number;
  durationMinutes: number;
  id: string;
  name: string;
  serviceIds: string[];
  source: PackageSource;
  status: PackageStatus;
};

export type PackageListResponse = {
  items: PackageListItem[];
  total: number;
};

export type PackageTemplateService = {
  id: string;
  price: number;
  serviceName: string;
  templateId: string;
  totalSessions: number;
};

export type PackageTemplate = {
  basePrice: number;
  createdAt: string;
  description: string | null;
  discount: number;
  /**
   * Optional aggregate cap: once a sold copy of this template has this many
   * TOTAL completed sessions across all its services combined, the client's
   * package closes early, whatever each service has left. null = no cap.
   */
  expireAfterServices: number | null;
  /** Exact day count for the expiry — the source of truth. */
  expiryDays: number | null;
  /** Kept only as a rounded, human-friendly label derived from expiryDays. */
  expiryMonths: number | null;
  gstPercentage: number;
  id: string;
  name: string;
  neverExpires: boolean;
  paymentMethod: string;
  salonId: string;
  services: PackageTemplateService[];
};

/** One service line as sent when saving a template. */
export type PackageTemplateServiceInput = {
  price: number;
  serviceName: string;
  totalSessions: number;
};

export type CreatePackageTemplateRequest = {
  basePrice: number;
  description?: string | null;
  discount?: number;
  expireAfterServices?: number | null;
  expiryDays?: number | null;
  expiryMonths?: number | null;
  gstPercentage?: number;
  name: string;
  neverExpires?: boolean;
  services: PackageTemplateServiceInput[];
};

export type UpdatePackageTemplateRequest = Partial<CreatePackageTemplateRequest>;

export type ClientPackageService = {
  catalogServiceId: string | null;
  completedSessions: number;
  price: number;
  remainingSessions: number;
  serviceId: string;
  serviceName: string;
  totalSessions: number;
};

export type ClientPackage = {
  basePrice: number;
  category: string | null;
  clientId: string;
  clientName: string;
  expiryDate: string | null;
  id: string;
  packageName: string;
  services: ClientPackageService[];
  status: string;
  totalAmount: number;
};
