import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

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
