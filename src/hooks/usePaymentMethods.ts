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

// Payment methods change rarely but are read on the way into every checkout,
// so the last good configuration is kept in memory and shown at once while a
// refresh runs behind it. `manage` reads a different endpoint, so it is part
// of the key.
const configCache = new Map<string, PaymentMethodConfiguration>();
const cacheKey = (scope: string, manage: boolean) => `${scope}|${manage ? "manage" : "active"}`;
const seedState = (scope: string, manage: boolean) => {
  const cached = configCache.get(cacheKey(scope, manage));
  return { scope, config: cached ?? EMPTY, ready: Boolean(cached), refreshing: false, error: "" };
};
const dropCachedScope = (scope: string) => {
  configCache.delete(cacheKey(scope, true));
  configCache.delete(cacheKey(scope, false));
};

/**
 * Loads the configuration into the cache ahead of time, so opening checkout
 * does not wait on it. Safe to call repeatedly: it is a no-op once cached.
 */
export async function prefetchPaymentMethods(scope: string, manage = false) {
  if (!scope.replace(/:/g, "") || configCache.has(cacheKey(scope, manage)) || !isNetworkOnline()) return;
  try {
    configCache.set(cacheKey(scope, manage), await paymentMethodsService.configuration(manage));
  } catch {
    // Checkout shows and retries the error itself; a warm-up failure is silent.
  }
}

export function usePaymentMethods(enabled = true, manage = false) {
  const { user } = useAuth();
  const { currency } = useRegionalPreferences();
  const scope = `${user?.id ?? ""}:${user?.salonId ?? ""}`;
  const [snapshot, setSnapshot] = useState(() => seedState(scope, manage));
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const request = useRef<{ scope: string; controller: AbortController; promise: Promise<PaymentMethodConfiguration> } | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback((): Promise<PaymentMethodConfiguration> => {
    if (!enabled || !user?.id) return Promise.reject(new Error("Payment methods are not available."));
    if (request.current?.scope === scope) return request.current.promise;
    const controller = new AbortController();
    setSnapshot(old => ({ ...(old.scope === scope ? old : seedState(scope, manage)), refreshing: true }));
    const promise = paymentMethodsService.configuration(manage, controller.signal).then(config => {
      if (!mounted.current || activeScope.current !== scope || controller.signal.aborted) throw new Error("The selected salon changed. Please try again.");
      configCache.set(cacheKey(scope, manage), config);
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
      // A local mutation makes the cached copy wrong, so drop it rather than
      // letting the next open show what was just changed away.
      if (changed === scope) { dropCachedScope(scope); request.current?.controller.abort(); request.current = null; sync(); }
    });
    return () => { clearInterval(timer); app.remove(); network(); unsubscribe(); request.current?.controller.abort(); request.current = null; };
  }, [enabled, refresh, scope, user?.id]));

  const state = snapshot.scope === scope ? snapshot : seedState(scope, manage);
  const options = useMemo(() => activePaymentMethods(state.config, currency === "INR"), [state.config, currency]);
  const apply = useCallback((update: (config: PaymentMethodConfiguration) => PaymentMethodConfiguration) => {
    if (mounted.current && activeScope.current === scope) setSnapshot(old => {
      if (old.scope !== scope) return old;
      const config = update(old.config);
      configCache.set(cacheKey(scope, manage), config);
      return { ...old, config };
    });
  }, [manage, scope]);
  return { ...state, options, offersUpi: currency === "INR", loading: !state.ready && !state.error, refresh, apply };
}
