import { useEffect, useState } from "react";
import { useAppDispatch } from "../../../hooks/useAppRedux";
import { fetchPaymentTerminalsThunk, fetchPaymentProviderConfigsThunk } from "../../../middleware/settings/paymentSettings.thunk";
import type { PaymentTerminal } from "../types";

/**
 * Whether this salon has Payment Machine available at all, and which
 * provider/terminals to use — drives whether "Payment Machine" even shows
 * as a payment method option in checkout (see AppointmentModal/PaymentPanel).
 */
export function usePosSettings() {
  const dispatch = useAppDispatch();
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [enabledProvider, setEnabledProvider] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
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
  }, [dispatch]);

  return { terminals, enabledProvider, loaded, posEnabled: !!enabledProvider };
}
