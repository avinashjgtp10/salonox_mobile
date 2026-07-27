import { useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "./useAppRedux";
import { setSubscriptionExpired } from "../store/billingSlice";
import api from "../services/api/axios";

interface SubResp {
  success: boolean;
  data: Array<{ status: string; current_period_end: string | null }>;
}

// Fetches subscription status once per login/session (plus on genuine
// salon_id changes) — no recurring polling. accessToken churns multiple
// times right after login (silent-refresh via AuthGuard's restore, and the
// interceptor's own silent-refresh-on-401), and authSlice's updateToken
// reducer always assigns a NEW string even when the decoded claims are
// unchanged — so this hook must key off token *presence*, not the raw
// string, and track the last salonId actually fetched separately from the
// effect deps to avoid re-fetching on that upstream churn.
export function useSubscriptionPoller() {
  const dispatch  = useAppDispatch();
  const hasToken  = useAppSelector((s) => !!s.auth.accessToken);
  const salonId   = useAppSelector((s) => s.salon.currentSalon?.id);

  const inFlightRef           = useRef(false);
  const abortRef              = useRef<AbortController | null>(null);
  const lastFetchedSalonIdRef = useRef<string | null>(null);

  const check = useCallback(async (salon: string) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await api.get<SubResp>(`/api/v1/subscriptions/salon/${salon}`, { signal: ctrl.signal });
      const subs = res.data.data ?? [];

      const hasActive = subs.some((s) => {
        if (!["active", "trialing"].includes(s.status)) return false;
        if (!s.current_period_end) return true;
        return new Date() < new Date(s.current_period_end);
      });

      dispatch(setSubscriptionExpired(!hasActive));
    } catch (err) {
      if (axios.isCancel(err)) return;
      // Silently ignore — interceptor handles 403
    } finally {
      inFlightRef.current = false;
    }
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
