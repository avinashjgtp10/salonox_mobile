import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { NO_STAFF_PRESENCE, type StaffPresence } from "@/features/attendance/utils/staffPresence";
import { attendanceService } from "@/services/attendance.service";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";

// Same cadence as the web: refetch when the screen/app comes back to the
// foreground (throttled) and immediately whenever attendance changes in real
// time (check-in/out, break, settings save) — no timer.
const MIN_GAP_MS = 15_000;

export function useStaffPresence(enabled = true) {
  const [presence, setPresence] = useState<StaffPresence>(NO_STAFF_PRESENCE);
  const lastFetchedAtRef = useRef(0);
  const inflightRef = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (!enabled || inflightRef.current) return;
    if (!force && Date.now() - lastFetchedAtRef.current < MIN_GAP_MS) return;
    inflightRef.current = true;
    try {
      setPresence(await attendanceService.getStaffPresence());
    } finally {
      lastFetchedAtRef.current = Date.now();
      inflightRef.current = false;
    }
  }, [enabled]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  useEffect(() => {
    if (!enabled) return;
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const removeRealtime = addRealtimeEntityChangedListener(({ entity }) => {
      if (entity === "attendance") void refresh(true);
    });

    return () => {
      appStateSub.remove();
      removeRealtime();
    };
  }, [enabled, refresh]);

  return { presence: enabled ? presence : NO_STAFF_PRESENCE, refresh };
}
