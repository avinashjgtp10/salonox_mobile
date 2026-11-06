import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";

import { pearl, pearlType } from "./tokens";

export type BannerKind = "error" | "warn" | "info" | "success";

const PALETTE: Record<BannerKind, { bg: string; border: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  error: { bg: pearl.dangerBg, border: pearl.dangerBorder, fg: "#9E3043", icon: "alert-circle-outline" },
  warn: { bg: pearl.warningBg, border: pearl.warningBorder, fg: pearl.warningText, icon: "time-outline" },
  info: { bg: pearl.infoBg, border: "rgba(255,255,255,0.8)", fg: pearl.ink2, icon: "information-circle-outline" },
  success: { bg: pearl.successBg, border: pearl.successBorder, fg: pearl.successText, icon: "checkmark-circle-outline" },
};

/** Form-level message (wrong credentials, offline, notices…). */
export function Banner({ message, title, kind = "error" }: { message?: string | null; title?: string | null; kind?: BannerKind }) {
  if (!message) return null;
  const palette = PALETTE[kind];
  return (
    <View style={[styles.box, { backgroundColor: palette.bg, borderColor: palette.border }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Ionicons name={palette.icon} size={16} color={palette.fg} style={styles.icon} />
      <View style={styles.copy}>
        {title ? <Text style={[styles.title, { color: palette.fg }]}>{title}</Text> : null}
        <Text style={[styles.text, { color: palette.fg }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", gap: 9, alignItems: "flex-start", padding: 12, borderRadius: 14, borderWidth: 1 },
  icon: { marginTop: 1 },
  copy: { flex: 1, gap: 2 },
  title: { ...pearlType.error, fontSize: 13, fontWeight: "700" },
  text: { ...pearlType.error, fontSize: 12.5, lineHeight: 18 },
});
