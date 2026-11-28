import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";

import { pearlGradients, pearlRadius, pearlShadow, pearlType } from "./tokens";
import { pearl } from "./themedPearl";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

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

/** Google's official "G" mark (brand guidelines fixed four-colour artwork — never recolour). */
export function GoogleLogo({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7163v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6149z" />
      <Path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3277-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <Path fill="#FBBC05" d="M3.9641 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.9641 10.71z" />
      <Path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6723 5.1627 6.6559 3.5795 9 3.5795z" />
    </Svg>
  );
}

const styles = themedStyles((p) => ({
  primaryWrap: { borderRadius: pearlRadius.field },
  primary: { height: 52, borderRadius: pearlRadius.field, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  glass: {
    height: 48,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: p.glassStrong,
    borderWidth: 1,
    borderColor: p.fieldBorder,
  },
  glassText: { fontSize: 14 },
  outline: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: p.white,
    borderWidth: 1.5,
    borderColor: "rgba(126,120,176,0.55)",
    ...pearlShadow.card,
  },
  outlineText: { color: p.accentDeep, fontWeight: "800" },
  text: { height: 44, alignItems: "center", justifyContent: "center" },
  textPressed: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  disabled: { opacity: 0.75 },
  ssoIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: p.white,
    borderWidth: 1,
    borderColor: p.fieldBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  ssoIconDark: { backgroundColor: p.ink, borderColor: p.ink },
}));
