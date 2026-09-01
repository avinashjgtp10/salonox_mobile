import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Portal } from "@/components/ui/Portal";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { setNetworkSnapshot } from "@/services/networkStatus";
import { useAppDispatch } from "@/store/hooks";
import { networkStatusChanged } from "@/store/network/network.slice";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useThemeColors } from "@/theme/ThemeProvider";

const toOnlineState = (isConnected: boolean | null, isInternetReachable: boolean | null) =>
  Boolean(isConnected) && isInternetReachable !== false;

export function NetworkErrorModal() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const wasOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (isOnline) {
      setIsDismissed(false);
      wasOnlineRef.current = true;
      return;
    }

    if (wasOnlineRef.current) {
      setIsDismissed(false);
    }

    wasOnlineRef.current = false;
  }, [isOnline]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);

    try {
      const state = await NetInfo.fetch();
      const snapshot = {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOnline: toOnlineState(state.isConnected, state.isInternetReachable),
      };

      setNetworkSnapshot(snapshot);
      dispatch(networkStatusChanged({ ...snapshot, lastChangedAt: Date.now() }));

      if (snapshot.isOnline) {
        setIsDismissed(false);
      }
    } finally {
      setIsRetrying(false);
    }
  }, [dispatch]);

  if (!isAuthenticated || isOnline || isDismissed) {
    return null;
  }

  return (
    <Portal>
      <View accessibilityViewIsModal style={styles.overlay}>
        <Pressable
          accessibilityLabel="Network unavailable"
          style={StyleSheet.absoluteFill}
        />
        <View accessibilityRole="alert" style={styles.card}>
          <TouchableOpacity
            accessibilityLabel="Close network error"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => setIsDismissed(true)}
            style={styles.closeButton}
          >
            <Ionicons color={Colors.hint} name="close" size={18} />
          </TouchableOpacity>

          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons color={Colors.error} name="cloud-offline-outline" size={32} />
            </View>
          </View>

          <Text style={styles.title}>{"Can't connect"}</Text>
          <Text style={styles.message}>
            Please check your internet connection and try again.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.86}
            disabled={isRetrying}
            onPress={handleRetry}
            style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          >
            {isRetrying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons color="#FFFFFF" name="wifi-outline" size={15} />
                <Text style={styles.retryText}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Portal>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: Radius.xxl,
      borderWidth: 1,
      maxWidth: 320,
      paddingBottom: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.xxl,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.22,
      shadowRadius: 32,
      width: "78%",
      elevation: 18,
    },
    closeButton: {
      alignItems: "center",
      height: 34,
      justifyContent: "center",
      position: "absolute",
      right: Spacing.sm,
      top: Spacing.sm,
      width: 34,
    },
    iconInner: {
      alignItems: "center",
      backgroundColor: Colors.errorBg,
      borderRadius: Radius.full,
      height: 62,
      justifyContent: "center",
      width: 62,
    },
    iconOuter: {
      alignItems: "center",
      borderColor: Colors.errorBorder,
      borderRadius: Radius.full,
      borderWidth: 1,
      height: 76,
      justifyContent: "center",
      marginBottom: Spacing.md,
      width: 76,
    },
    message: {
      color: Colors.text2,
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 19,
      marginTop: Spacing.xs,
      textAlign: "center",
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      backgroundColor: "rgba(15, 23, 42, 0.58)",
      justifyContent: "center",
      paddingHorizontal: Spacing.lg,
      zIndex: 2000,
    },
    retryButton: {
      alignItems: "center",
      backgroundColor: Colors.error,
      borderRadius: Radius.md,
      flexDirection: "row",
      gap: Spacing.sm,
      justifyContent: "center",
      marginTop: Spacing.lg,
      minHeight: 44,
      paddingHorizontal: Spacing.xl,
      width: "100%",
    },
    retryButtonDisabled: {
      opacity: 0.72,
    },
    retryText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
    title: {
      color: Colors.heading,
      fontSize: 18,
      fontWeight: "900",
      lineHeight: 23,
      textAlign: "center",
    },
  });
