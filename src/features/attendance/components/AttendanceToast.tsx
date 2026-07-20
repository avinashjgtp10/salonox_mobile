import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { clearAttendanceToast, selectAttendanceToast } from "@/store/attendance/attendance.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";

const TOAST_DURATION_MS = 3200;

// Mirrors the appointment module's snackbar pattern so success/error feedback
// for check-in, check-out, manual mark, and attendance edits all render the
// same way regardless of which screen triggered the action.
export function AttendanceToast() {
  const Colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(Colors, insets.bottom), [Colors, insets.bottom]);
  const dispatch = useAppDispatch();
  const toast = useAppSelector(selectAttendanceToast);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      dispatch(clearAttendanceToast());
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timer);
  }, [dispatch, toast]);

  if (!toast) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      style={[styles.snackbar, toast.tone === "error" && styles.snackbarError]}
    >
      <Ionicons
        name={toast.tone === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={18}
        color="#FFFFFF"
      />
      <Text style={styles.snackbarText}>{toast.message}</Text>
      <TouchableOpacity onPress={() => dispatch(clearAttendanceToast())}>
        <Ionicons name="close" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (Colors: ThemeColors, bottomInset: number) => StyleSheet.create({
  snackbar: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    bottom: Math.max(bottomInset, 16),
    flexDirection: "row",
    gap: Spacing.sm,
    left: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    position: "absolute",
    right: Spacing.lg,
    zIndex: 20,
  },
  snackbarError: {
    backgroundColor: Colors.error,
  },
  snackbarText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
});
