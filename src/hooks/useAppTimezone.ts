import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectAppTimezoneSetting } from "@/store/salon/region.selectors";
import { applyAppTimezone, resetAppTimezone } from "@/utils/timezoneShim";

/**
 * Keeps the whole app reading time in the SALON's zone (@/utils/timezoneShim), mirroring the web app: applied once
 * the active branch/salon's timezone is known, re-applied when it changes (e.g. switching branches, or the salon
 * saving a new timezone on web), and removed on sign-out. Only does anything when that zone differs from the device's.
 */
export function useAppTimezone(): void {
  const timezone = useAppSelector(selectAppTimezoneSetting);

  useEffect(() => {
    if (!timezone) {
      resetAppTimezone();
      return;
    }
    applyAppTimezone(timezone);
  }, [timezone]);
}
