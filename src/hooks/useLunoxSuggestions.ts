import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectSalonCountry, selectSalonTimezone } from "@/store/salon/region.selectors";
import { useSalonDay } from "@/hooks/useSalonDay";
import { dailySuggestions, readDismissedSuggestions } from "@/utils/lunoxSuggestions";

export function useLunoxSuggestions() {
  const salonId = useAppSelector(selectActiveBranchId);
  const user = useAppSelector(selectCurrentUser);
  const timeZone = useAppSelector(selectSalonTimezone);
  const country = useAppSelector(selectSalonCountry);
  const day = useSalonDay();
  const key = `lunox:suggestions:v1:${user?.id ?? "guest"}:${salonId ?? "default"}`;
  const identity = `${key}:${day}:${timeZone}:${country}`;
  const [state, setState] = useState({ identity: "", dismissed: [] as string[] });
  const current = useRef(state);
  current.current = state;
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    // Wait for earlier dismissals before reading on a quick branch switch.
    void writes.current.then(() => AsyncStorage.getItem(key)).catch(() => null).then(raw => {
      if (!cancelled) setState({ identity, dismissed: readDismissedSuggestions(raw, day) });
    });
    return () => { cancelled = true; };
  }, [key, day, identity]);

  const dismissSuggestion = useCallback((question: string) => {
    if (current.current.identity !== identity) return;
    const dismissed = [...new Set([...current.current.dismissed, question])];
    current.current = { identity, dismissed };
    setState(current.current);
    writes.current = writes.current.then(() => AsyncStorage.setItem(key, JSON.stringify({ day, dismissed }))).catch(() => {});
  }, [identity, key, day]);

  return {
    suggestions: state.identity === identity ? dailySuggestions(day, undefined, country).filter(question => !state.dismissed.includes(question)) : [],
    dismissSuggestion,
  };
}
