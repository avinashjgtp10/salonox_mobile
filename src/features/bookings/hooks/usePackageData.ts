import { useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { setPackagesList } from "../../../store/schedulerSlice";
import { useListPackagesQuery, useListPackageTemplatesQuery } from "../../../services/api/endpoints/packages.endpoints";

export function usePackageData() {
  const dispatch = useAppDispatch();

  const { data: packagesData }        = useListPackagesQuery({});
  const { data: packageTemplatesRaw } = useListPackageTemplatesQuery();
  const packageTemplates              = packageTemplatesRaw ?? [];

  useEffect(() => {
    const fromCatalog = (packagesData?.items || []).map((p: any) => ({
      id: String(p.id || ""), name: p.name || "", price: p.basePrice || 0, services: [] as string[],
    }));
    const fromTemplates = packageTemplates.map((t: any) => ({
      id: String(t.id || ""), name: t.name || "", price: t.basePrice || 0,
      services: (t.services || []).map((s: any) => s.serviceName),
    }));
    const templateNames = new Set(fromTemplates.map((t: any) => t.name.toLowerCase()));
    const merged = [...fromTemplates, ...fromCatalog.filter((c: any) => !templateNames.has(c.name.toLowerCase()))];
    if (merged.length > 0) dispatch(setPackagesList(merged));
  }, [packagesData, packageTemplates, dispatch]);
}
