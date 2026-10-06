import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, type ReactNode } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";

import { useThemeColors } from "@/theme/ThemeProvider";

type NotificationSwipeRowProps = {
  children: ReactNode;
  disabled?: boolean;
  onDismiss: () => void;
  onDelete: () => void;
};

export function NotificationSwipeRow({ children, disabled = false, onDismiss, onDelete }: NotificationSwipeRowProps) {
  const colors = useThemeColors();
  const translation = useRef(new Animated.Value(0)).current;
  const callbacks = useRef({ disabled, onDismiss, onDelete });
  callbacks.current = { disabled, onDismiss, onDelete };
  const responder = useMemo(() => {
    const reset = () => Animated.spring(translation, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    return PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) =>
      !callbacks.current.disabled && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (_event, gesture) => translation.setValue(gesture.dx),
    onPanResponderRelease: (_event, gesture) => {
      if (!callbacks.current.disabled) {
        if (gesture.dx <= -80) callbacks.current.onDismiss();
        else if (gesture.dx >= 80) callbacks.current.onDelete();
      }
      reset();
    },
    onPanResponderTerminate: reset,
    });
  }, [translation]);

  return (
    <View style={styles.container}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, styles.actions, { backgroundColor: colors.primary }]}>
        <View style={styles.action}>
          <Ionicons color={colors.onPrimary} name="trash-outline" size={22} />
          <Text style={[styles.label, { color: colors.onPrimary }]}>Delete</Text>
        </View>
        <View style={styles.action}>
          <Ionicons color={colors.onPrimary} name="checkmark-done-outline" size={22} />
          <Text style={[styles.label, { color: colors.onPrimary }]}>Dismiss</Text>
        </View>
      </View>
      <Animated.View
        {...responder.panHandlers}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: "dismiss", label: "Dismiss notification" }, { name: "delete", label: "Delete notification" }]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (disabled) return;
          if (nativeEvent.actionName === "dismiss") onDismiss();
          if (nativeEvent.actionName === "delete") onDelete();
        }}
        style={{ backgroundColor: colors.card, transform: [{ translateX: translation }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  actions: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12 },
  action: { alignItems: "center", gap: 4 },
  label: { fontSize: 11, fontWeight: "700" },
});
