import { serviceService } from "@/services/service.service";
import type { ServiceListItem } from "@/types/service";

const SERVICE_CATALOG_MAX_PAGES = 50;
const SERVICE_CATALOG_PAGE_SIZE = 100;
const serviceCatalogCache = new Map<string, Promise<ServiceListItem[]> | ServiceListItem[]>();

const getServiceCatalogCacheKey = (salonId?: string | null) => salonId ?? "default";

const addUniqueServices = (
  target: ServiceListItem[],
  services: ServiceListItem[],
  seenServiceIds: Set<string>,
) => {
  let addedCount = 0;

  services.forEach((service) => {
    if (seenServiceIds.has(service.id)) {
      return;
    }

    seenServiceIds.add(service.id);
    target.push(service);
    addedCount += 1;
  });

  return addedCount;
};

export const fetchServiceCatalog = async (salonId?: string | null) => {
  const cacheKey = getServiceCatalogCacheKey(salonId);
  const cachedServices = serviceCatalogCache.get(cacheKey);

  if (cachedServices) {
    return cachedServices instanceof Promise ? await cachedServices : cachedServices;
  }

  const catalogRequest = (async () => {
    const services: ServiceListItem[] = [];
    const seenServiceIds = new Set<string>();

    for (let page = 1; page <= SERVICE_CATALOG_MAX_PAGES; page += 1) {
      const response = await serviceService.getServices(
        {
          limit: SERVICE_CATALOG_PAGE_SIZE,
          offset: (page - 1) * SERVICE_CATALOG_PAGE_SIZE,
          search: "",
          sort_by: "created_at",
          sort_order: "desc",
        },
        salonId,
      );
      const addedCount = addUniqueServices(services, response.services, seenServiceIds);

      if (response.services.length < SERVICE_CATALOG_PAGE_SIZE || addedCount === 0) {
        break;
      }
    }

    return services;
  })();

  serviceCatalogCache.set(cacheKey, catalogRequest);

  try {
    const services = await catalogRequest;

    serviceCatalogCache.set(cacheKey, services);
    return services;
  } catch (error) {
    serviceCatalogCache.delete(cacheKey);
    throw error;
  }
};
