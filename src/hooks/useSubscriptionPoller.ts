import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./useAppRedux";
import { fetchSubscriptionThunk } from "../store/billingSlice";

// Fetches subscription status once per login/session (plus on genuine
// salon_id changes) — no recurring polling. accessToken churns multiple
// times right after login (silent-refresh via AuthGuard's restore, and the
// interceptor's own silent-refresh-on-401), and authSlice's updateToken
// reducer always assigns a NEW string even when the decoded claims are
// unchanged — so this hook must key off token *presence*, not the raw
// string, and track the last salonId actually fetched separately from the
// effect deps to avoid re-fetching on that upstream churn.
//
// subscriptionExpired itself is derived inside billingSlice's
// fetchSubscriptionThunk.fulfilled reducer (single source of truth) — this
// hook only decides *when* to fetch, not how to interpret the result.
export function useSubscriptionPoller() {
  const dispatch  = useAppDispatch();
  const hasToken  = useAppSelector((s) => !!s.auth.accessToken);
  const salonId   = useAppSelector((s) => s.salon.currentSalon?.id);

  const lastFetchedSalonIdRef = useRef<string | null>(null);

  const check = useCallback((salon: string) => {
    dispatch(fetchSubscriptionThunk(salon));
  }, [dispatch]);

  useEffect(() => {
    if (!hasToken || !salonId) {
      lastFetchedSalonIdRef.current = null;
      return;
    }
    if (salonId !== lastFetchedSalonIdRef.current) {
      lastFetchedSalonIdRef.current = salonId;
      check(salonId);
    }
  }, [hasToken, salonId, check]);

  const refreshNow = useCallback(() => {
    if (salonId) check(salonId);
  }, [salonId, check]);

  return { refreshNow };
}
