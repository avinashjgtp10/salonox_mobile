import type { ServiceListItem, ServiceListQuery, ServiceListResponse } from "@/types/service";

/** Read every page before filtering so results are not limited to the first batch. */
export async function loadCatalogServices(fetchPage: (query: ServiceListQuery) => Promise<ServiceListResponse>) {
  const items = new Map<string, ServiceListItem>();
  let offset = 0;
  let limit = 100;
  for (;;) {
    const response = await fetchPage({ limit, offset, search: "", sort_by: "name", sort_order: "asc" });
    const previousSize = items.size;
    response.services.forEach((item) => items.set(item.id, item));
    if (!response.pagination.hasMore) return [...items.values()];
    if (response.pagination.nextOffset <= offset || items.size === previousSize) {
      throw new Error("Unable to load the complete service catalog. Please retry.");
    }
    offset = response.pagination.nextOffset;
    limit = response.pagination.limit;
  }
}
