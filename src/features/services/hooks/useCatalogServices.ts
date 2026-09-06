import { useCallback, useEffect, useRef, useState } from "react";
import { serviceService } from "@/services/service.service";
import { getApiErrorMessage } from "@/services/api";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import type { ServiceListItem } from "@/types/service";
import { loadCatalogServices } from "../utils/loadCatalogServices";

export function useCatalogServices() {
  const branchId = useAppSelector(selectActiveBranchId);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current += 1; }, [branchId]);
  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    setServices([]);
    try {
      const result = await loadCatalogServices(async (query) => {
        if (current !== requestId.current) throw new Error("Service request superseded");
        return serviceService.getServices(query, branchId);
      });
      if (current === requestId.current) setServices(result);
    } catch (failure) {
      if (current === requestId.current) setError(getApiErrorMessage(failure));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [branchId]);
  return { services, loading, error, load };
}
