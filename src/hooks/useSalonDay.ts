import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { selectSalonTimezone } from "@/store/salon/region.selectors";
import { salonDateKey } from "@/utils/salonRegion";

export function useSalonDay() {
  const timezone = useAppSelector(selectSalonTimezone);
  const [, refresh] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => { refresh(value => value + 1); schedule(); }, 60_000 - Date.now() % 60_000);
    };
    schedule();
    const listener = AppState.addEventListener("change", status => { if (status === "active") refresh(value => value + 1); });
    return () => { clearTimeout(timer); listener.remove(); };
  }, []);
  // Compute during render so branch/timezone changes cannot display yesterday's day.
  return salonDateKey(new Date(), timezone);
}
