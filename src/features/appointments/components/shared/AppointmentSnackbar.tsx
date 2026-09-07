import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { clearAppointmentToast, selectAppointmentToast } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Text, TouchableOpacity } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ToastOverlay } from "@/components/ui/ToastOverlay";

export function AppointmentSnackbar() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppSelector(selectAppointmentToast);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      dispatch(clearAppointmentToast());
    }, 3200);

    return () => clearTimeout(timer);
  }, [dispatch, toast]);

  if (!toast) {
    return null;
  }

  return (
    <ToastOverlay>
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
      <TouchableOpacity onPress={() => dispatch(clearAppointmentToast())}>
        <Ionicons name="close" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
    </ToastOverlay>
  );
}
