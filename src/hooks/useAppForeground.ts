import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

// Fires `onForeground` whenever the app transitions from a background/inactive
// state back to active — e.g. the user switches away and returns. Generic and
// screen-agnostic so any feature needing a "refresh on foreground" trigger can
// reuse it instead of wiring its own AppState listener.
export const useAppForeground = (onForeground: () => void) => {
  const appStateRef = useRef(AppState.currentState);
  const onForegroundRef = useRef(onForeground);

  onForegroundRef.current = onForeground;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const cameFromBackground =
        appStateRef.current.match(/inactive|background/) && nextState === "active";

      appStateRef.current = nextState;

      if (cameFromBackground) {
        onForegroundRef.current();
      }
    });

    return () => subscription.remove();
  }, []);
};
