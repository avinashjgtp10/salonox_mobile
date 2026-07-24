export type PackageStatus = "Active" | "Draft" | "Inactive" | string;

export type PackageListQuery = {
  category?: string;
  limit?: number;
  page?: number;
  search?: string;
  status?: PackageStatus;
};

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
  status: PackageStatus;
};

export type PackageListResponse = {
  items: PackageListItem[];
  total: number;
};

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
