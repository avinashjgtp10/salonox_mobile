import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";

/** Rounded surface for pinned page actions. Sheet actions use the sheet surface.
 * Keep this in layout flow (or reserve its height when an existing bar floats).
 * The parent owns keyboard avoidance; bottomInset is only its existing safe-area space.
 */
export function PearlActionFooter({ children, bottomInset = 0, style, contentStyle }: {
  children: ReactNode;
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Floating bars already allow the content behind their curved corners. */
  floating?: boolean;
}) {
  const palette = usePearlPalette();
  return <LinearGradient colors={palette.bgTop === "#1F1D2B" ? ["#363151", "#302B48", "#242033"] : ["rgba(255,255,255,0.97)", "rgba(250,249,253,0.96)", "rgba(220,217,237,0.92)"]}
      locations={[0, 0.68, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.panel, style]}>
    <View style={[styles.content, { paddingBottom: 12 + bottomInset }, contentStyle]}>{children}</View>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  panel: { flexShrink: 0, borderRadius: 32, backgroundColor: "transparent", overflow: "hidden" },
  content: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 16 },
});
