import { useCallback, useRef, type ReactNode } from "react";
import { View } from "react-native";

import { useAppToast } from "@/hooks/useAppToast";
import { getNetworkSnapshot } from "@/services/networkStatus";

const NOTICE_INTERVAL_MS = 10_000;

// Stays silent while offline; only when the user touches the app does a short
// "No internet connection" toast appear, at most once per interval.
export function OfflineTouchNotice({ children }: { children: ReactNode }) {
  const toast = useAppToast();
  const lastShownAt = useRef(0);

  const handleTouchStart = useCallback(() => {
    const now = Date.now();
    if (!getNetworkSnapshot().isOnline && now - lastShownAt.current > NOTICE_INTERVAL_MS) {
      lastShownAt.current = now;
      toast.showWarning("No internet connection");
    }
    // Never claim the touch; the tapped control still receives it.
    return false;
  }, [toast]);

  return (
    <View onStartShouldSetResponderCapture={handleTouchStart} style={{ flex: 1 }}>
      {children}
    </View>
  );
}
