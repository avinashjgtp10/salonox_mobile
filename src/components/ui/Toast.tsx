import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOutDown, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Portal } from "@/components/ui/Portal";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAppTheme } from "@/theme/ThemeProvider";

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

const TOAST_DURATIONS: Record<ToastTone, number> = {
  success: 3200,
  error: 4000,
  info: 3200,
  warning: 3500,
};

// Clears the floating tab bar and sticky footer buttons, as in the prototype.
const BOTTOM_CLEARANCE = 96;

type ToastKind = "ok" | "err" | "info" | "off";

const KIND_STYLE: Record<ToastKind, { gradient: readonly [string, string]; bar: string; icon: keyof typeof Ionicons.glyphMap }> = {
  ok: { gradient: ["#5FC7A3", "#2E9E7A"], bar: "#2E9E7A", icon: "checkmark" },
  err: { gradient: ["#E37A8A", "#C8475A"], bar: "#C8475A", icon: "warning-outline" },
  info: { gradient: ["#B3AEDA", "#7E78B0"], bar: "#7E78B0", icon: "information" },
  off: { gradient: ["#E2B35A", "#C98A1B"], bar: "#C98A1B", icon: "cloud-offline-outline" },
};

const resolveKind = (toast: ToastMessage): ToastKind => {
  if (toast.tone === "warning") return "off";
  if (toast.tone === "error") return /offline|no internet|internet connection/i.test(toast.message) ? "off" : "err";
  if (toast.tone === "info") return "info";
  return "ok";
};

function ToastCard({ toast, duration, dark, onDismiss }: { toast: ToastMessage; duration: number; dark: boolean; onDismiss: () => void }) {
  const kind = resolveKind(toast);
  const look = KIND_STYLE[kind];
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(0, { duration, easing: Easing.linear });
  }, [duration, progress]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <Animated.View
      // Smooth slide-up with no overshoot (a spring made the toast bounce).
      entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutDown.duration(220)}
      layout={LinearTransition.duration(200)}
    >
      <Pressable
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        accessibilityHint="Tap to dismiss"
        onPress={onDismiss}
        style={[styles.card, dark && styles.cardDark, kind === "err" && styles.cardError]}
      >
        <LinearGradient colors={look.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconBubble}>
          <Ionicons name={look.icon} size={15} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.message, dark && styles.messageDark]} numberOfLines={3}>
          {toast.message}
        </Text>
        <View pointerEvents="none" style={styles.barTrack}>
          <Animated.View style={[styles.bar, { backgroundColor: look.bar }, barStyle]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface ToastContainerProps {
  selector: (state: any) => ToastState;
  clearAction: (id: string) => any;
}

export function createToastContainer({ selector, clearAction }: ToastContainerProps) {
  function ToastContainer() {
    const { scheme } = useAppTheme();
    const insets = useSafeAreaInsets();
    const dispatch = useAppDispatch();
    const { toasts } = useAppSelector(selector);

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
      <Portal>
        <View pointerEvents="box-none" style={[styles.overlay, { paddingBottom: insets.bottom + BOTTOM_CLEARANCE }]}>
          <View pointerEvents="box-none" style={styles.stack}>
            {toasts.map((toast) => (
              <ToastCard
                key={toast.id}
                toast={toast}
                dark={scheme === "dark"}
                duration={toast.duration ?? TOAST_DURATIONS[toast.tone]}
                onDismiss={() => dispatch(clearAction(toast.id))}
              />
            ))}
          </View>
        </View>
      </Portal>
    );
  }

  return ToastContainer;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 16, zIndex: 100 },
  stack: { width: "100%", maxWidth: 480, gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingLeft: 11,
    paddingRight: 14,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(252,252,254,0.96)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    shadowColor: "#3C3A5F",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 10,
  },
  cardDark: { backgroundColor: "rgba(40,38,54,0.96)", borderColor: "rgba(255,255,255,0.12)" },
  cardError: { borderColor: "rgba(200,71,90,0.25)" },
  iconBubble: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  message: { flex: 1, color: "#3B3950", fontSize: 13.5, lineHeight: 18, fontWeight: "700" },
  messageDark: { color: "#F1F0F7" },
  barTrack: { position: "absolute", left: 18, right: 18, bottom: 0, height: 3 },
  bar: { flex: 1, borderRadius: 3, opacity: 0.55, transformOrigin: "left" },
});
