import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./useAppRedux";
import { fetchSubscriptionStatusThunk } from "../store/billingSlice";

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
// fetchSubscriptionStatusThunk.fulfilled reducer — this hook only decides
// *when* to fetch, not how to interpret the result. Deliberately NOT
// fetchSubscriptionThunk: that endpoint returns a single subscription
// record which may not be the salon's current one (renewals/retries can
// each leave their own row), so it must never be the sole expiry gate.
export function useSubscriptionPoller() {
  const dispatch  = useAppDispatch();
  const hasToken  = useAppSelector((s) => !!s.auth.accessToken);
  const salonId   = useAppSelector((s) => s.salon.currentSalon?.id);

  const lastFetchedSalonIdRef = useRef<string | null>(null);

  const check = useCallback((salon: string) => {
    dispatch(fetchSubscriptionStatusThunk(salon));
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
