/**
 * One staff member's weekly schedule, as configured on the web app.
 *
 * Refetched when the screen regains focus and when the realtime feed reports a
 * staff change, so an edit made on the web shows up without a restart.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useAppForeground } from "@/hooks/useAppForeground";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import { staffScheduleService } from "@/services/staffSchedule.service";
import type { StaffSchedule } from "@/types/staffSchedule";

export function useStaffSchedule(staffId: string | undefined) {
  const [schedule, setSchedule] = useState<StaffSchedule | null>(null);
  const [loading, setLoading] = useState(Boolean(staffId));
  const [error, setError] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!staffId) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    const request = ++generation.current;
    setLoading(true);

    try {
      const next = await staffScheduleService.getSchedule(staffId);
      if (request !== generation.current) return;
      setSchedule(next);
      setError(false);
    } catch {
      if (request !== generation.current) return;
      // Staff without the schedule permission get a 403; show nothing, not an error state.
      setSchedule(null);
      setError(true);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useAppForeground(() => {
    void refresh();
  });

  useEffect(
    () => addRealtimeEntityChangedListener(({ entity }) => {
      if (entity === "staff") void refresh();
    }),
    [refresh],
  );

  return { schedule, loading, error, refresh };
}
