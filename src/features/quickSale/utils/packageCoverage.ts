import type { CartItem, PackageCoverageAllocation } from "@/features/quickSale/types";
import type { ClientPackage } from "@/types/package";

export type PackageSessionConsumption = {
  clientPackageId: string;
  quantity: number;
  serviceId: string;
  staffName: string;
};

const isPackageActive = (clientPackage: ClientPackage) => {
  if (clientPackage.status.toLowerCase() !== "active") {
    return false;
  }

  if (!clientPackage.expiryDate) {
    return true;
  }

  const expiryTime = new Date(clientPackage.expiryDate).getTime();
  return Number.isFinite(expiryTime) && expiryTime >= Date.now();
};

export const getPackageCoverageAllocations = (
  item: CartItem,
  packages: ClientPackage[],
): PackageCoverageAllocation[] => {
  if (item.itemType !== "service") {
    return [];
  }

  const normalizedServiceName = item.name.trim().toLowerCase();
  const packagesByExpiry = packages
    .map((clientPackage, index) => ({ clientPackage, index }))
    .sort((left, right) => {
      const leftExpiry = left.clientPackage.expiryDate
        ? new Date(left.clientPackage.expiryDate).getTime()
        : Number.POSITIVE_INFINITY;
      const rightExpiry = right.clientPackage.expiryDate
        ? new Date(right.clientPackage.expiryDate).getTime()
        : Number.POSITIVE_INFINITY;
      const safeLeftExpiry = Number.isFinite(leftExpiry) ? leftExpiry : Number.POSITIVE_INFINITY;
      const safeRightExpiry = Number.isFinite(rightExpiry) ? rightExpiry : Number.POSITIVE_INFINITY;

      return safeLeftExpiry - safeRightExpiry || left.index - right.index;
    })
    .map(({ clientPackage }) => clientPackage);

  return packagesByExpiry.flatMap((clientPackage) => {
    if (!isPackageActive(clientPackage)) {
      return [];
    }

    const packageService = clientPackage.services.find((service) => {
      if (service.remainingSessions <= 0) {
        return false;
      }

      if (service.catalogServiceId === item.itemId) {
        return true;
      }

      return service.serviceName.trim().toLowerCase() === normalizedServiceName;
    });

    return packageService
      ? [{
          clientPackageId: clientPackage.id,
          remainingSessions: Math.max(0, Math.floor(packageService.remainingSessions)),
          serviceId: packageService.serviceId,
        }]
      : [];
  });
};

export const getPackageCoveredQuantity = (item: CartItem) => {
  if (item.itemType !== "service") {
    return 0;
  }

  const availableSessions = item.packageCoverageAllocations?.reduce(
    (total, allocation) => total + Math.max(0, allocation.remainingSessions),
    0,
  ) ?? Math.max(0, item.packageCoverageRemaining ?? 0);

  return Math.min(item.quantity, availableSessions);
};

export const getPackageSessionConsumptions = (
  items: CartItem[],
): PackageSessionConsumption[] => {
  const remainingByAllocation = new Map<string, number>();
  const consumptions: PackageSessionConsumption[] = [];

  for (const item of items) {
    if (item.itemType !== "service") {
      continue;
    }

    const allocations =
      item.packageCoverageAllocations?.length
        ? item.packageCoverageAllocations
        : item.packageCoverageClientPackageId && item.packageCoverageServiceId
          ? [{
              clientPackageId: item.packageCoverageClientPackageId,
              remainingSessions: Math.max(0, item.packageCoverageRemaining ?? 0),
              serviceId: item.packageCoverageServiceId,
            }]
          : [];
    let quantityToConsume = getPackageCoveredQuantity(item);

    for (const allocation of allocations) {
      if (quantityToConsume <= 0) {
        break;
      }

      const allocationKey = `${allocation.clientPackageId}:${allocation.serviceId}`;
      const remaining =
        remainingByAllocation.get(allocationKey) ??
        Math.max(0, Math.floor(allocation.remainingSessions));
      const quantity = Math.min(quantityToConsume, remaining);

      if (quantity <= 0) {
        continue;
      }

      consumptions.push({
        clientPackageId: allocation.clientPackageId,
        quantity,
        serviceId: allocation.serviceId,
        staffName: item.staffName ?? "Quick Sale",
      });
      remainingByAllocation.set(allocationKey, remaining - quantity);
      quantityToConsume -= quantity;
    }
  }

  return consumptions;
};
