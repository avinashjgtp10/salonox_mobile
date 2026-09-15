import api from "../../../services/api/axios";
import { SERVICES } from "../../../services/api/endpoints/services.endpoints";
import type { Service } from "../types/catalog.types";

interface ServicesListPayload {
  data: Service[];
  pagination?: { total_pages?: number };
}
interface ServicesListResponse {
  data?: Service[] | ServicesListPayload;
  pagination?: { total_pages?: number };
}

// Shared by PrintMenuCardModal and DigitalMenuConfigModal — both need the
// FULL active catalog regardless of whatever page/filters the main Service
// Menu table currently has open, so this deliberately bypasses the paginated
// useServices()/fetchServicesThunk Redux slice rather than reusing/mutating it.
export async function fetchAllActiveServices(): Promise<Service[]> {
  const all: Service[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const res = await api.get(SERVICES.LIST(`page=${page}&limit=200&is_active=true`));
    const responseData = res.data as ServicesListResponse;
    const payload = responseData?.data;

    if (Array.isArray(payload)) {
      all.push(...payload);
      totalPages = responseData.pagination?.total_pages ?? totalPages;
      page += 1;
      continue;
    }
    if (payload && Array.isArray(payload.data)) {
      all.push(...payload.data);
      totalPages = payload.pagination?.total_pages ?? totalPages;
      page += 1;
      continue;
    }
    break;
  }

  return all;
}

export function groupByCategory(services: Service[]): { category: string; services: Service[] }[] {
  const map = new Map<string, Service[]>();
  services.forEach((s) => {
    const key = s.category_name?.trim() || "Other Services";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });
  return Array.from(map.entries()).map(([category, services]) => ({ category, services }));
}
