import NetInfo from "@react-native-community/netinfo";
import { useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/pearl/Icon";
import { Text } from "@/components/ui/AppTypography";
import { useAppToast } from "@/hooks/useAppToast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAppSelector } from "@/store/hooks";
import { selectDashboardLastFetchedAt } from "@/store/dashboard/dashboard.slice";

/** The prototype's persistent banner; existing network monitoring owns recovery. */
export function OfflineTouchNotice({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus();
  const savedAt = useAppSelector(selectDashboardLastFetchedAt);
  const insets = useSafeAreaInsets();
  const toast = useAppToast();
  const retryingRef = useRef(false);
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setRetrying(true);
    try {
      // Refresh emits to the existing NetInfo listener, which handles reconnects.
      const state = await NetInfo.refresh();
      if (state.isConnected === false || state.isInternetReachable === false) {
        toast.showWarning("Still offline — check Wi-Fi or mobile data");
      }
    } catch {
      toast.showWarning("Couldn't check connection. Please try again.");
    } finally {
      retryingRef.current = false;
      setRetrying(false);
    }
  };

  const savedTime = savedAt == null ? null : new Date(savedAt).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  return (
    <View style={styles.root}>
      {children}
      {!isOnline ? (
        <View style={[styles.banner, { top: insets.top + 2 }]} accessibilityLiveRegion="polite">
          <View style={styles.icon}><Icon name="wifiOff" size={18} color="#fff" /></View>
          <View style={styles.copy}>
            <Text style={styles.title}>No internet connection</Text>
            <Text style={styles.caption}>{savedTime ? `Showing saved data from ${savedTime}` : "Check your Wi-Fi or mobile data"}</Text>
          </View>
          <Pressable onPress={retry} disabled={retrying} accessibilityRole="button"
            accessibilityLabel="Retry" accessibilityState={{ disabled: retrying, busy: retrying }}
            style={({ pressed }) => [styles.retry, (pressed || retrying) && styles.pressed]}>
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    position: "absolute", left: 10, right: 10, zIndex: 38,
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 9, paddingLeft: 12, paddingRight: 10, borderRadius: 16,
    backgroundColor: "rgba(59,57,80,0.92)",
    shadowColor: "#3B3950", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 10,
  },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "700", color: "#fff" },
  caption: { fontSize: 11.5, fontWeight: "500", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  retry: { minHeight: 32, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  retryLabel: { fontSize: 12.5, fontWeight: "700", color: "#3B3950" },
  pressed: { opacity: 0.7 },
});
