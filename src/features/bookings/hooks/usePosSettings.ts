import { useEffect, useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { usePermissions } from "../../../hooks/usePermissions";
import { fetchPaymentTerminalsThunk, fetchPaymentProviderConfigsThunk } from "../../../middleware/settings/paymentSettings.thunk";
import type { PaymentTerminal } from "../types";

// Mirrors payment-settings.routes.ts's own `viewPos` OR-list exactly — these
// are the only keys its two GETs accept. AppointmentModal calls this hook on
// mount (long before anyone reaches the payment step), so a staff member who
// can open a booking to look up a client but can't check out used to fire
// both reads, 403, and get a "Permission Required (manage_pos_payments …)"
// popup while merely searching for a client. Checking here first means the
// request is never sent for someone the backend would reject anyway.
// KEEP IN SYNC with that route file: a key added there must be added here,
// or this silently starts 403ing again.
const POS_READ_KEYS = ["manage_pos_payments", "create_sales", "manage_calendar", "view_settings_pos_payments"];

/**
 * Whether this salon has Payment Machine available at all, and which
 * provider/terminals to use — drives whether "Payment Machine" even shows
 * as a payment method option in checkout (see AppointmentModal/PaymentPanel).
 */
export function usePosSettings() {
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [enabledProvider, setEnabledProvider] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const mayReadPosSettings = POS_READ_KEYS.some((key) => can(key));

  useEffect(() => {
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
  }, [dispatch, mayReadPosSettings]);

  return { terminals, enabledProvider, loaded, posEnabled: !!enabledProvider };
}
