import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSalonById, salonReceived } from "@/store/salon/salon.slice";
import { salonService } from "@/services/salon.service";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getRegionalPreferences, setRegionalPreferences } from "./preferences";

/** Salon preferences are shared with the web. Resume + active polling also work without server push events. */
export function RegionalPreferencesSync() {
  const { user, isAuthenticated } = useAuth();
  const salonId = isAuthenticated ? user?.salonId ?? null : null;
  const salon = useAppSelector(state => selectSalonById(state, salonId));
  const dispatch = useAppDispatch();
  const { isOnline } = useNetworkStatus();
  const hydratedSalon = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    hydratedSalon.current = null;
    setRegionalPreferences({ salonId });
    const initial = getRegionalPreferences();
    if (salonId) void AsyncStorage.getItem(`salonox.region.${salonId}`).then(raw => {
      if (cancelled || !raw || hydratedSalon.current === salonId || getRegionalPreferences() !== initial) return;
      try { setRegionalPreferences({ ...JSON.parse(raw), salonId }); } catch { /* Use defaults until server responds. */ }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [salonId]);
  useEffect(() => {
    if (!salonId || !salon) return;
    hydratedSalon.current = salonId;
    const value = { salonId, language: salon.language, currency: salon.currency };
    setRegionalPreferences(value);
    void AsyncStorage.setItem(`salonox.region.${salonId}`, JSON.stringify(value)).catch(() => {});
  }, [salonId, salon?.language, salon?.currency, salon]);
  useEffect(() => {
    if (!salonId || !isOnline) return;
    let cancelled = false, pending = false;
    const refresh = async () => {
      if (pending || AppState.currentState !== "active") return;
      pending = true;
      try {
        const updated = await salonService.getSalonMe({ refresh: true });
        if (!cancelled && updated.id === salonId) dispatch(salonReceived(updated));
      } catch { /* Keep saved preferences when offline or a request fails. */ }
      finally { pending = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => { cancelled = true; clearInterval(timer); subscription.remove(); };
  }, [dispatch, salonId, isOnline]);
  return null;
}
