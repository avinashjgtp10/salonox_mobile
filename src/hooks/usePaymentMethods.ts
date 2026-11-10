import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useRegionalPreferences } from "@/localization/preferences";
import { getApiErrorMessage } from "@/services/api";
import { isNetworkOnline, subscribeNetworkSnapshot } from "@/services/networkStatus";
import { activePaymentMethods, paymentMethodsService, subscribePaymentMethods, type PaymentMethodConfiguration } from "@/services/paymentMethods.service";

const EMPTY: PaymentMethodConfiguration = { custom: [], builtIns: [] };
const SYNC_MS = 15000;

export function usePaymentMethods(enabled = true, manage = false) {
  const { user } = useAuth();
  const { currency } = useRegionalPreferences();
  const scope = `${user?.id ?? ""}:${user?.salonId ?? ""}`;
  const [snapshot, setSnapshot] = useState({ scope, config: EMPTY, ready: false, refreshing: false, error: "" });
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const request = useRef<{ scope: string; controller: AbortController; promise: Promise<PaymentMethodConfiguration> } | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback((): Promise<PaymentMethodConfiguration> => {
    if (!enabled || !user?.id) return Promise.reject(new Error("Payment methods are not available."));
    if (request.current?.scope === scope) return request.current.promise;
    const controller = new AbortController();
    setSnapshot(old => ({ ...(old.scope === scope ? old : { scope, config: EMPTY, ready: false, error: "" }), refreshing: true }));
    const promise = paymentMethodsService.configuration(manage, controller.signal).then(config => {
      if (!mounted.current || activeScope.current !== scope || controller.signal.aborted) throw new Error("The selected salon changed. Please try again.");
      if (mounted.current && activeScope.current === scope && !controller.signal.aborted) setSnapshot({ scope, config, ready: true, refreshing: false, error: "" });
      return config;
    }).catch(error => {
      if (mounted.current && activeScope.current === scope && !controller.signal.aborted) setSnapshot(old => ({ ...old, refreshing: false, error: getApiErrorMessage(error) }));
      throw error;
    }).finally(() => { if (request.current?.controller === controller) request.current = null; });
    request.current = { scope, controller, promise };
    return promise;
  }, [enabled, manage, scope, user?.id]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.controller.abort(); request.current = null; };
  }, [scope, manage]);

  useFocusEffect(useCallback(() => {
    if (!enabled || !user?.id) return;
    const sync = () => { if (AppState.currentState !== "background" && isNetworkOnline()) void refresh().catch(() => {}); };
    // Even an offline first open reports why methods can't be loaded.
    void refresh().catch(() => {});
    const timer = setInterval(sync, SYNC_MS);
    const app = AppState.addEventListener("change", state => { if (state === "active") sync(); });
    const network = subscribeNetworkSnapshot(next => {
      if (next.isOnline) sync();
      else {
        request.current?.controller.abort(); request.current = null;
        setSnapshot(old => ({ ...old, refreshing: false, error: "You're offline. Reconnect to refresh payment methods." }));
      }
    });
    const unsubscribe = subscribePaymentMethods(changed => {
      if (changed === scope) { request.current?.controller.abort(); request.current = null; sync(); }
    });
    return () => { clearInterval(timer); app.remove(); network(); unsubscribe(); request.current?.controller.abort(); request.current = null; };
  }, [enabled, refresh, scope, user?.id]));

  const state = snapshot.scope === scope ? snapshot : { scope, config: EMPTY, ready: false, refreshing: false, error: "" };
  const options = useMemo(() => activePaymentMethods(state.config, currency === "INR"), [state.config, currency]);
  const apply = useCallback((update: (config: PaymentMethodConfiguration) => PaymentMethodConfiguration) => {
    if (mounted.current && activeScope.current === scope) setSnapshot(old => old.scope === scope ? { ...old, config: update(old.config) } : old);
  }, [scope]);
  return { ...state, options, offersUpi: currency === "INR", loading: !state.ready && !state.error, refresh, apply };
}
