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
    const fetchPage = (page: number) =>
      serviceService.getServices(
        {
          limit: SERVICE_CATALOG_PAGE_SIZE,
          offset: (page - 1) * SERVICE_CATALOG_PAGE_SIZE,
          search: "",
          sort_by: "created_at",
          sort_order: "desc",
        },
        salonId,
      );

    const firstPage = await fetchPage(1);
    addUniqueServices(services, firstPage.services, seenServiceIds);

    if (firstPage.services.length < SERVICE_CATALOG_PAGE_SIZE) {
      return services;
    }

    // The first page tells us the total, so fetch the remaining pages in parallel instead of one by one.
    const totalPages = Math.min(
      Math.ceil(firstPage.totalCount / SERVICE_CATALOG_PAGE_SIZE),
      SERVICE_CATALOG_MAX_PAGES,
    );

    if (totalPages > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2)),
      );
      remainingPages.forEach((response) => addUniqueServices(services, response.services, seenServiceIds));
      return services;
    }

    // Total unknown (the API reported only this page): fall back to paging until a short page.
    for (let page = 2; page <= SERVICE_CATALOG_MAX_PAGES; page += 1) {
      const response = await fetchPage(page);
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
