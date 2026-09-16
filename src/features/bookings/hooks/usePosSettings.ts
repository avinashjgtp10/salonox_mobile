import { useEffect, useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { usePermissions } from "../../../hooks/usePermissions";
import { fetchPaymentTerminalsThunk, fetchPaymentProviderConfigsThunk } from "../../../middleware/settings/paymentSettings.thunk";
import type { PaymentTerminal } from "../types";

// Mirrors payment-settings.routes.ts's own `viewPos` OR-list exactly — these
// are the only keys its two GETs accept. Checking here first means the
// request is never sent for someone the backend would reject anyway.
// KEEP IN SYNC with that route file: a key added there must be added here,
// or this silently starts 403ing again.
const POS_READ_KEYS = ["manage_pos_payments", "create_sales", "manage_calendar", "view_settings_pos_payments"];

/**
 * Whether this salon has Payment Machine available at all, and which
 * provider/terminals to use — drives whether "Payment Machine" even shows
 * as a payment method option in checkout (see AppointmentModal/PaymentPanel).
 *
 * `enabled` gates the actual fetch: AppointmentModal mounts long before the
 * user reaches its payment step (New Appointment, editing a booking, or just
 * clicking an empty slot all mount it), so firing this on mount fired both
 * GETs on every one of those, not just on checkout. Pass `enabled: true`
 * only once the caller has actually reached its payment step (Quick Sale's
 * single-screen checkout, or the regular flow's payment section).
 */
export function usePosSettings(enabled: boolean) {
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [enabledProvider, setEnabledProvider] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const mayReadPosSettings = POS_READ_KEYS.some((key) => can(key));

  useEffect(() => {
    if (!enabled) return;

    // No POS access — degrade silently to "no payment machine configured",
    // which just hides Payment Machine as a checkout option. Never surfaces
    // as a permission error, since this is background config, not something
    // the user asked for.
    if (!mayReadPosSettings) {
      setTerminals([]);
      setEnabledProvider(null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const [termRes, provRes] = await Promise.all([
        dispatch(fetchPaymentTerminalsThunk()),
        dispatch(fetchPaymentProviderConfigsThunk()),
      ]);
      if (cancelled) return;
      if (fetchPaymentTerminalsThunk.fulfilled.match(termRes)) setTerminals(termRes.payload);
      if (fetchPaymentProviderConfigsThunk.fulfilled.match(provRes)) {
        const enabled = provRes.payload.find((p) => p.is_enabled);
        setEnabledProvider(enabled?.provider ?? null);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [dispatch, mayReadPosSettings, enabled]);

  return { terminals, enabledProvider, loaded, posEnabled: !!enabledProvider };
}
