import { useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { setPackagesList } from "../../../store/schedulerSlice";
import { useListPackagesQuery, useListPackageTemplatesQuery } from "../../../services/api/endpoints/packages.endpoints";

export function usePackageData() {
  const dispatch = useAppDispatch();

  // Draft/Inactive packages are discontinued/not-yet-launched from the
  // salon's own catalog management perspective — they must never be
  // sellable from Quick Sale or the Calendar's "+Package" row, both of which
  // source their options from this same list (see AppointmentModal.tsx's
  // availablePackages / selectPackagesList).
  const { data: packagesData }        = useListPackagesQuery({ status: "Active" });
  const { data: packageTemplatesRaw } = useListPackageTemplatesQuery();
  const packageTemplates              = packageTemplatesRaw ?? [];

  useEffect(() => {
    const fromCatalog = (packagesData?.items || []).map((p: any) => ({
      id: String(p.id || ""), name: p.name || "", price: p.basePrice || 0, services: [] as string[],
    }));
    // A template with a real (non-"never expires") expiry of 0 days or less is
    // mis-configured — any instance purchased from it today would be born
    // already expired (expiry_date = purchase date + expiryDays). This is a
    // data bug from template creation (staff unchecked "Never expires" but
    // never actually picked a future date), not a normal, sellable template —
    // never offer it as a purchase option in Quick Sale/Calendar.
    const fromTemplates = packageTemplates
      .filter((t: any) => t.neverExpires || (t.expiryDays == null) || t.expiryDays > 0)
      .map((t: any) => ({
        id: String(t.id || ""), name: t.name || "", price: t.basePrice || 0,
        services: (t.services || []).map((s: any) => s.serviceName),
      }));
    const templateNames = new Set(fromTemplates.map((t: any) => t.name.toLowerCase()));
    const merged = [...fromTemplates, ...fromCatalog.filter((c: any) => !templateNames.has(c.name.toLowerCase()))];
    if (merged.length > 0) dispatch(setPackagesList(merged));
  }, [packagesData, packageTemplates, dispatch]);
}
