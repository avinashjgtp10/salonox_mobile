import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./useAppRedux";
import { setSubscriptionExpired } from "../store/billingSlice";
import api from "../services/api/axios";

const POLL_INTERVAL_MS = 30_000;

interface SubResp {
  success: boolean;
  data: Array<{ status: string; current_period_end: string | null }>;
}

export function useSubscriptionPoller() {
  const dispatch    = useAppDispatch();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const salonId     = useAppSelector((s) => s.salon.currentSalon?.id);
  const expired     = useAppSelector((s) => s.billing.subscriptionExpired);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!accessToken || !salonId || expired) return;

    const check = async () => {
      try {
        const res = await api.get<SubResp>(`/api/v1/subscriptions/salon/${salonId}`);
        const subs = res.data.data ?? [];

        const hasActive = subs.some((s) => {
          if (s.status !== "active") return false;
          if (!s.current_period_end) return true;
          return new Date() < new Date(s.current_period_end);
        });

        if (!hasActive) {
          dispatch(setSubscriptionExpired(true));
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        // Silently ignore — interceptor handles 403
      }
    };

    check();
    timerRef.current = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [accessToken, salonId, expired, dispatch]);
}