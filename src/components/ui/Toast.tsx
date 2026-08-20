import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  tone: ToastTone;
  duration?: number;
}

export interface ToastState {
  toasts: ToastMessage[];
}

const DEFAULT_DURATION_MS = 3200;

const TOAST_DURATIONS: Record<ToastTone, number> = {
  success: 3200,
  error: 4000,
  info: 3200,
  warning: 3500,
};

interface ToastContainerProps {
  selector: (state: any) => ToastState;
  clearAction: (id: string) => any;
}

export function createToastContainer({ selector, clearAction }: ToastContainerProps) {
  function ToastContainer() {
    const Colors = useThemeColors();
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const { toasts } = useAppSelector(selector);
    const styles = useMemo(() => createStyles(Colors, insets.bottom), [Colors, insets.bottom]);

    useEffect(() => {
      if (toasts.length === 0) return;

      const timers = toasts.map((toast) =>
        setTimeout(() => {
          dispatch(clearAction(toast.id));
        }, toast.duration ?? TOAST_DURATIONS[toast.tone])
      );

      return () => timers.forEach(clearTimeout);
    }, [dispatch, toasts]);

    if (toasts.length === 0) {
      return null;
    }

    return (
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <Animated.View
            key={toast.id}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(160)}
            style={[styles.snackbar, toast.tone === "error" && styles.snackbarError, toast.tone === "warning" && styles.snackbarWarning, toast.tone === "info" && styles.snackbarInfo]}
          >
            <Ionicons
              name={
                toast.tone === "error"
                  ? "alert-circle-outline"
                  : toast.tone === "warning"
                  ? "alert-outline"
                  : toast.tone === "info"
                  ? "information-circle-outline"
                  : "checkmark-circle-outline"
              }
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.snackbarText} numberOfLines={2}>
              {toast.message}
            </Text>
            <TouchableOpacity onPress={() => dispatch(clearAction(toast.id))} style={styles.closeButton}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    );
  }

  const createStyles = (Colors: ThemeColors, bottomInset: number) => StyleSheet.create({
    container: {
      position: "absolute",
      left: Spacing.lg,
      right: Spacing.lg,
      bottom: Math.max(bottomInset, 16),
      zIndex: 100,
      flexDirection: "column",
      gap: Spacing.sm,
      pointerEvents: "box-none",
    },
    snackbar: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: Radius.full,
      flexDirection: "row",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: 12,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      width: "100%",
    },
    snackbarError: {
      backgroundColor: Colors.error,
    },
    snackbarWarning: {
      backgroundColor: Colors.warning,
    },
    snackbarInfo: {
      backgroundColor: Colors.info,
    },
    snackbarText: {
      color: "#FFFFFF",
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      textAlign: "center",
    },
    closeButton: {
      padding: 4,
      marginLeft: Spacing.xs,
    },
  });

  return ToastContainer;
}

// Helper hook for showing toasts
export function useToast(dispatch: any, setToastAction: (toast: Omit<ToastMessage, "id">) => any) {
  const showToast = (message: string, tone: ToastTone, duration?: number) =>
    dispatch(setToastAction({ message, tone, duration }));

  return { showToast };
}

// Pre-configured toast types
export const showSuccessToast = (dispatch: any, setToastAction: (toast: Omit<ToastMessage, "id">) => any, message: string, duration?: number) =>
  dispatch(setToastAction({ message, tone: "success", duration }));

export const showErrorToast = (dispatch: any, setToastAction: (toast: Omit<ToastMessage, "id">) => any, message: string, duration?: number) =>
  dispatch(setToastAction({ message, tone: "error", duration }));

export const showInfoToast = (dispatch: any, setToastAction: (toast: Omit<ToastMessage, "id">) => any, message: string, duration?: number) =>
  dispatch(setToastAction({ message, tone: "info", duration }));

export const showWarningToast = (dispatch: any, setToastAction: (toast: Omit<ToastMessage, "id">) => any, message: string, duration?: number) =>
  dispatch(setToastAction({ message, tone: "warning", duration }));