import { useEffect, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { Text } from "@/components/ui/AppTypography";
import { useAuth } from "@/context/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useThemeColors } from "@/theme/ThemeProvider";

export function NetworkStatusStrip() {
  const colors = useThemeColors();
  const { isAuthenticated } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryLock = useRef(false);
  useEffect(() => {
    if (isOnline || !isAuthenticated) { setVisible(false); return; }
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [isOnline, isAuthenticated]);

  const retry = async () => {
    if (retryLock.current) return;
    retryLock.current = true; setRetrying(true);
    // refresh() also notifies the existing network monitor; it remains the
    // single source of network state and handles waking pending reads.
    try { await NetInfo.refresh(); }
    catch { /* Keep the offline strip visible; no popup or screen reload. */ }
    finally { retryLock.current = false; setRetrying(false); }
  };
  if (!isAuthenticated || isOnline || !visible) return null;
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.warningBg }}>
      <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, minHeight: 32, gap: 12 }}>
        <Text style={{ flex: 1, color: colors.heading, fontSize: 12 }}>Offline · Check your connection</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry connection" disabled={retrying} onPress={() => void retry()} style={{ paddingVertical: 8 }}>
          <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "700" }}>{retrying ? "Checking…" : "Retry"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
