import { useCallback, useRef, useState, type ReactNode } from "react";
import { useFocusEffect } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { marketingService } from "@/services/marketing.service";
import { WhatsAppDisconnectedScreen, type DisconnectedScreen } from "./WhatsAppDisconnectedScreen";
// Last answer per salon, so switching tabs doesn't flash a loader every time.
const knownConnection = new Map<string, boolean>();

/**
 * Shows the WhatsApp screens (tab, inbox, marketing) only once SalonOX support has
 * connected the salon's WhatsApp Business number — the same check as the web's
 * MarketingRoutes. Until then it shows a "not set up yet" screen instead.
 * `embedded` = rendered as a tab (no back button, tab bar owns the bottom inset).
 */
export function WhatsAppSetupGate({ children, embedded = false, screen = "whatsapp" }: { children: ReactNode; embedded?: boolean; screen?: DisconnectedScreen }) {
  const user = useAppSelector(selectCurrentUser);
  const salonId = user?.salonId ?? "";
  return <Gate key={salonId} salonId={salonId} embedded={embedded} screen={screen}>{children}</Gate>;
}

function Gate({ children, embedded, salonId, screen }: { children: ReactNode; embedded: boolean; salonId: string; screen: DisconnectedScreen }) {
  const [connected, setConnected] = useState<boolean | undefined>(() => knownConnection.get(salonId));
  const [checking, setChecking] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const check = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setChecking(true);
    marketingService.isWhatsAppConnected(current.signal)
      .then(value => {
        if (current.signal.aborted) return;
        knownConnection.set(salonId, value);
        setConnected(value);
      })
      // Couldn't tell (offline, no permission…): let the screen show its own state.
      .catch(() => { if (!current.signal.aborted) setConnected(value => value ?? true); })
      .finally(() => { if (!current.signal.aborted) setChecking(false); });
  }, [salonId]);

  useFocusEffect(useCallback(() => {
    check();
    return () => controller.current?.abort();
  }, [check]));

  if (connected) return <>{children}</>;
  return <WhatsAppDisconnectedScreen screen={screen} salonId={salonId} loading={connected === undefined} checking={checking} embedded={embedded} onCheckAgain={check} />;
}
