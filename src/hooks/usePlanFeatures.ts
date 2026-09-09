import { useEffect, useState } from "react";
import { useAppSelector } from "./useAppRedux";
import api from "../services/api/axios";
import { SALON_PLANS } from "../services/api/endpoints";

// Salon-level plan-feature gate (Basic/Advance/Pro + per-salon overrides —
// see modules/salon-plans on the backend and requirePlanFeature.middleware.ts).
// Deliberately separate from usePermissions() (staff-vs-owner role axis,
// always true for salon_owner/admin) — this axis applies to the OWNER too,
// since it's the salon's plan being checked, not who's logged into it.
//
// Fetched once per session via GET /salon-plans/my-features, which always
// reads req.user.salonId server-side — no salon ID is ever passed from here,
// so there's no way to query another salon's features from the client.
// Fails OPEN (hasFeature returns true) while loading/on error, matching the
// backend's own "no customization row = Basic tier" default-open posture
// rather than flashing every gated section as locked on every page load.
export function usePlanFeatures() {
  const salonId = useAppSelector((s) => s.salon.currentSalon?.id);
  const [features, setFeatures] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!salonId) return;
    let cancelled = false;
    api.get(SALON_PLANS.MY_FEATURES)
      .then((res) => {
        if (cancelled) return;
        const list: string[] = res.data?.data?.features ?? [];
        setFeatures(new Set(list));
      })
      .catch(() => {
        if (!cancelled) setFeatures(null);
      });
    return () => { cancelled = true; };
  }, [salonId]);

  const hasFeature = (featureName: string) => features === null || features.has(featureName);

  return { hasFeature, loaded: features !== null };
}
