import { useEffect, useState } from "react";
import { useAppSelector } from "./useAppRedux";
import api from "../services/api/axios";
import { SALON_PLANS } from "../services/api/endpoints";

// Salon-level plan-feature gate (Basic/Advance/Growth + per-salon overrides —
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

// Module-scoped, keyed by salonId — usePlanFeatures() is called from several
// places that all mount together (DashboardSidebar, PlanFeatureGuard, the
// Catalog/Team sub-sidebars), and each instance previously held its own
// `useState`, so every one of them fired an independent, identical GET on
// the same page load. Sharing the fetch (and its in-flight promise) here
// means only the first caller actually dispatches the request; every other
// instance mounting in the same tick awaits that same promise instead.
const featuresCache = new Map<string, Set<string>>();
const inFlight = new Map<string, Promise<Set<string>>>();

function fetchFeatures(salonId: string): Promise<Set<string>> {
  const cached = featuresCache.get(salonId);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(salonId);
  if (pending) return pending;

  const promise = api.get(SALON_PLANS.MY_FEATURES)
    .then((res) => {
      const list: string[] = res.data?.data?.features ?? [];
      const set = new Set(list);
      featuresCache.set(salonId, set);
      return set;
    })
    .finally(() => {
      inFlight.delete(salonId);
    });

  inFlight.set(salonId, promise);
  return promise;
}

export function usePlanFeatures() {
  const salonId = useAppSelector((s) => s.salon.currentSalon?.id);
  const [features, setFeatures] = useState<Set<string> | null>(
    () => (salonId ? featuresCache.get(salonId) ?? null : null)
  );

  useEffect(() => {
    if (!salonId) return;
    // Already resolved (by this instance or an earlier one) — nothing to do.
    if (featuresCache.has(salonId)) {
      setFeatures(featuresCache.get(salonId)!);
      return;
    }
    let cancelled = false;
    fetchFeatures(salonId)
      .then((set) => {
        if (!cancelled) setFeatures(set);
      })
      .catch(() => {
        if (!cancelled) setFeatures(null);
      });
    return () => { cancelled = true; };
  }, [salonId]);

  const hasFeature = (featureName: string) => features === null || features.has(featureName);

  return { hasFeature, loaded: features !== null };
}
