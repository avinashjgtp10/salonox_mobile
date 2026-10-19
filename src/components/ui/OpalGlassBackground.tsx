import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { AccessibilityInfo, NativeModules, Platform, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/theme/ThemeProvider";

// Older development builds do not include newly installed native view managers.
// Avoid importing/registering the view until the binary actually supports it.
const supportsBlur = Platform.OS === "web" || Boolean(
  NativeModules.NativeUnimoduleProxy?.viewManagersMetadata?.ExpoBlurView,
);
const BlurView: typeof import("expo-blur").BlurView | null = supportsBlur
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- A static import registers the missing native view on older binaries.
  ? require("expo-blur").BlurView
  : null;

/** Decorative only: preserves the parent's layout and touch targets. */
export function OpalGlassBackground({ translucent = false }: { translucent?: boolean }) {
  const { colors, scheme } = useAppTheme();
  const [reduceTransparency, setReduceTransparency] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web") {
      const preference = window.matchMedia("(prefers-reduced-transparency: reduce)");
      setReduceTransparency(preference.matches);
      const update = () => setReduceTransparency(preference.matches);
      preference.addEventListener("change", update);
      return () => preference.removeEventListener("change", update);
    }
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (active) setReduceTransparency(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: reduceTransparency || !supportsBlur || (Platform.OS === "android" && !translucent) ? colors.bg2 : "transparent" }]}>
      {BlurView && !reduceTransparency && (Platform.OS !== "android" || translucent) ? (
        <BlurView intensity={60} tint={scheme === "dark" ? "dark" : "light"}
          experimentalBlurMethod={translucent ? "dimezisBlurView" : "none"}
          style={StyleSheet.absoluteFill} />
      ) : null}
      <LinearGradient colors={colors.glassGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: reduceTransparency ? 1 : translucent ? 0.16 : 0.78 }]} />
      <View style={[styles.edge, { backgroundColor: colors.glassEdge }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  edge: { position: "absolute", top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
});
