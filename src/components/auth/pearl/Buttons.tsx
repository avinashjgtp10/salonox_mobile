import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";

import { pearl, pearlGradients, pearlRadius, pearlShadow, pearlType } from "./tokens";

type Base = Omit<PressableProps, "style" | "children"> & {
  title: string;
  loading?: boolean;
  loadingTitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Pearl gradient primary button with pressed and loading states. */
export function PrimaryButton({ title, loading, loadingTitle, left, right, style, disabled, ...rest }: Base) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [styles.primaryWrap, pearlShadow.button, pressed && styles.pressed, isDisabled && styles.disabled, style]}
      {...rest}
    >
      <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
        {loading ? <ActivityIndicator color={pearl.white} /> : left}
        <Text translate style={pearlType.button}>{loading ? loadingTitle ?? "Please wait…" : title}</Text>
        {!loading ? right : null}
      </LinearGradient>
    </Pressable>
  );
}

/** Frosted secondary button (Google, Apple, "Try another account"). */
export function GlassButton({ title, loading, left, right, style, disabled, ...rest }: Base) {
  const isDisabled = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      disabled={isDisabled}
      style={({ pressed }) => [styles.glass, pressed && styles.pressed, style]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={pearl.accentDeep} /> : left}
      <Text translate style={[pearlType.bodyStrong, styles.glassText]}>{title}</Text>
      {right}
    </Pressable>
  );
}

/** Outlined white button used for "Register". */
export function OutlineButton({ title, right, style, ...rest }: Base) {
  return (
    <Pressable accessibilityRole="link" style={({ pressed }) => [styles.outline, pressed && styles.pressed, style]} {...rest}>
      <Text translate style={[pearlType.bodyStrong, styles.outlineText]}>{title}</Text>
      {right}
    </Pressable>
  );
}

/** Plain text button ("Use a different email", "Sign in with email instead"). */
export function TextButton({ title, style, color = pearl.muted, ...rest }: Base & { color?: string }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.text, pressed && styles.textPressed, style]} {...rest}>
      <Text translate style={[pearlType.bodyStrong, styles.glassText, { color }]}>{title}</Text>
    </Pressable>
  );
}

/** Small brand tile shown inside the Google / Apple buttons. */
export function SsoIcon({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <View style={[styles.ssoIcon, dark && styles.ssoIconDark]}>{children}</View>;
}

const styles = StyleSheet.create({
  primaryWrap: { borderRadius: pearlRadius.field },
  primary: { height: 52, borderRadius: pearlRadius.field, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  glass: {
    height: 48,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: pearl.fieldBorder,
  },
  glassText: { fontSize: 14 },
  outline: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: pearl.white,
    borderWidth: 1.5,
    borderColor: "rgba(126,120,176,0.55)",
    ...pearlShadow.card,
  },
  outlineText: { color: pearl.accentDeep, fontWeight: "800" },
  text: { height: 44, alignItems: "center", justifyContent: "center" },
  textPressed: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.75 },
  ssoIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: pearl.white,
    borderWidth: 1,
    borderColor: pearl.fieldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  ssoIconDark: { backgroundColor: pearl.ink, borderColor: pearl.ink },
});
